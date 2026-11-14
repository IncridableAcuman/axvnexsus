package uz.axm.nexus.identity.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.identity.domain.EmailVerificationToken;
import uz.axm.nexus.identity.domain.PasswordResetToken;
import uz.axm.nexus.identity.infrastructure.PasswordResetTokenRepository;
import uz.axm.nexus.identity.infrastructure.EmailVerificationTokenRepository;
import uz.axm.nexus.identity.infrastructure.JwtTokenProvider;
import uz.axm.nexus.mentors.infrastructure.MentorProfileRepository;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.notifications.application.EmailProducerService;
import uz.axm.nexus.notifications.application.EmailRateLimiterService;
import uz.axm.nexus.notifications.application.EmailVerificationEvent;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailProducerService emailProducerService;
    private final EmailRateLimiterService emailRateLimiterService;
    private final JwtTokenProvider jwtTokenProvider;
    private final CaptchaService captchaService;
    private final StudentRepository studentRepository;
    private final MentorRepository mentorRepository;
    private final MentorProfileRepository mentorProfileRepository;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${app.mail.verification-url:http://localhost:5173/auth/verify-email}")
    private String verificationBaseUrl;

    @Value("${app.mail.token-expiration-minutes:1440}")
    private int tokenExpirationMinutes;

    @Value("${app.security.allow-public-registration:false}")
    private boolean allowPublicRegistration;

    @Value("${app.security.captcha-required:false}")
    private boolean captchaRequired;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!allowPublicRegistration) {
            throw new BusinessException("Muhammad Al-Xorazmiy Vorislari ta'lim tizimida ochiq ommaviy ro'yxatdan o'tish yopiq. Mentorlar hisobi Admin tomonidan, o'quvchilar hisobi esa biriktirilgan Mentor tomonidan maxsus HEMIS ID va parol asosida ochiladi.");
        }

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Ushbu email manzili (" + email + ") bilan allaqachon foydalanuvchi ro'yxatdan o'tgan");
        }

        // Generate username from email or guarantee uniqueness
        String baseUsername = email;
        String username = baseUsername;
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            String prefix = email.contains("@") ? email.split("@")[0] : "user";
            username = prefix + "_" + UUID.randomUUID().toString().substring(0, 5);
        }

        // Determine full name
        String fullName = request.getFullName();
        if (fullName == null || fullName.trim().isBlank()) {
            fullName = deriveFullNameFromEmail(email);
        } else {
            fullName = fullName.trim();
        }

        // Determine role and attach Role entity
        String role = normalizeRole(request.getRole());
        String cleanRoleName = role.startsWith("ROLE_") ? role.substring(5) : role;
        Set<Role> roles = new HashSet<>();
        roleRepository.findByName(cleanRoleName)
                .or(() -> roleRepository.findByName(role))
                .ifPresent(roles::add);

        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(fullName)
                .phone(request.getPhone() != null && !request.getPhone().trim().isBlank() ? request.getPhone().trim() : null)
                .role(role)
                .roles(roles)
                .enabled(true)
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);

        // Rate limit check before sending email
        emailRateLimiterService.checkAndRecord(savedUser.getEmail());

        // Create verification token and code
        EmailVerificationToken verificationToken = createVerificationTokenForUser(savedUser);

        // Send RabbitMQ event for async email sending
        dispatchVerificationEmail(savedUser, verificationToken);

        try {
            auditService.logAction(
                    "USER_REGISTERED",
                    "User",
                    String.valueOf(savedUser.getId()),
                    savedUser.getEmail(),
                    "Yangi foydalanuvchi email orqali ro'yxatdan o'tdi (" + role + "), email tasdiqlash xabari yuborildi"
            );
        } catch (Exception e) {
            log.warn("Audit log yozishda xatolik yuz berdi: {}", e.getMessage());
        }

        return buildAuthResponse(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        // Botlardan himoyalanish: agar captchaId yuborilgan bo'lsa yoki tizimda talab qilinsa, tekshiriladi
        if (request.getCaptchaId() != null && !request.getCaptchaId().trim().isBlank()) {
            if (!captchaService.validateCaptcha(request.getCaptchaId(), request.getCaptchaCode())) {
                throw new BusinessException("Xavfsizlik kodi (CAPTCHA) noto'g'ri kiritildi yoki eskirgan. Qaytadan urinib ko'ring.");
            }
        } else if (captchaRequired) {
            throw new BusinessException("Xavfsizlik kodi (CAPTCHA) kiritilishi shart");
        }

        String identifier = request.getUsername().trim();
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(identifier, identifier)
                .orElseThrow(() -> new BusinessException("Login/ID raqam yoki parol noto'g'ri kiritildi"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException("Login/ID raqam yoki parol noto'g'ri kiritildi");
        }

        if (!user.isEnabled()) {
            throw new BusinessException("Foydalanuvchi hisobi faol emas");
        }

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        EmailVerificationToken tokenEntity = null;

        if (request.getToken() != null && !request.getToken().trim().isBlank()) {
            String token = request.getToken().trim();
            tokenEntity = emailVerificationTokenRepository.findByToken(token)
                    .orElseThrow(() -> new BusinessException("Tasdiqlash tokeni topilmadi yoki eskirgan"));
        } else if (request.getEmail() != null && request.getCode() != null) {
            String email = request.getEmail().trim().toLowerCase();
            String code = request.getCode().trim();
            User user = userRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new BusinessException("Ushbu email bilan foydalanuvchi topilmadi"));
            tokenEntity = emailVerificationTokenRepository.findByUserAndCodeAndUsedFalse(user, code)
                    .orElseThrow(() -> new BusinessException("Kiritilgan tasdiqlash kodi noto'g'ri"));
        } else {
            throw new BusinessException("Tasdiqlash tokeni yoki email va 6 xonali kod kiritilishi shart");
        }

        if (tokenEntity.isUsed()) {
            throw new BusinessException("Ushbu tasdiqlash havolasi yoki kodidan allaqachon foydalanilgan");
        }

        if (tokenEntity.isExpired()) {
            throw new BusinessException("Tasdiqlash tokenining amal qilish muddati tugagan. Yangi tasdiqlash xatini so'rang");
        }

        tokenEntity.setUsed(true);
        emailVerificationTokenRepository.save(tokenEntity);

        User user = tokenEntity.getUser();
        user.setEmailVerified(true);
        User updatedUser = userRepository.save(user);

        try {
            auditService.logAction(
                    "EMAIL_VERIFIED",
                    "User",
                    String.valueOf(updatedUser.getId()),
                    updatedUser.getEmail(),
                    "Foydalanuvchining email manzili muvaffaqiyatli tasdiqlandi"
            );
        } catch (Exception e) {
            log.warn("Audit log yozishda xatolik: {}", e.getMessage());
        }

        return buildAuthResponse(updatedUser);
    }

    @Transactional
    public void resendVerification(ResendVerificationRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("Ushbu email (" + email + ") bo'yicha foydalanuvchi topilmadi"));

        if (user.isEmailVerified()) {
            throw new BusinessException("Ushbu email manzili allaqachon tasdiqlangan");
        }

        // Rate limit check before resending
        emailRateLimiterService.checkAndRecord(user.getEmail());

        // Invalidate previous active tokens
        List<EmailVerificationToken> activeTokens = emailVerificationTokenRepository.findByUserAndUsedFalse(user);
        for (EmailVerificationToken t : activeTokens) {
            t.setUsed(true);
        }
        emailVerificationTokenRepository.saveAll(activeTokens);

        // Create new token
        EmailVerificationToken newToken = createVerificationTokenForUser(user);

        // Dispatch via RabbitMQ
        dispatchVerificationEmail(user, newToken);

        try {
            auditService.logAction(
                    "EMAIL_VERIFICATION_RESENT",
                    "User",
                    String.valueOf(user.getId()),
                    user.getEmail(),
                    "Tasdiqlash xabari qayta yuborildi"
            );
        } catch (Exception e) {
            log.warn("Audit log yozishda xatolik: {}", e.getMessage());
        }
    }

    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessException("Ushbu email (" + email + ") bo'yicha foydalanuvchi topilmadi"));

        if (!user.isEnabled()) {
            throw new BusinessException("Foydalanuvchi hisobi faol emas");
        }

        // Rate limit check before generating password reset
        emailRateLimiterService.checkAndRecord(user.getEmail());

        // Invalidate old tokens
        List<PasswordResetToken> oldTokens = passwordResetTokenRepository.findByUserAndUsedFalse(user);
        for (PasswordResetToken t : oldTokens) {
            t.setUsed(true);
        }
        passwordResetTokenRepository.saveAll(oldTokens);

        // Generate new token
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(60)) // 60 minutes
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();
        passwordResetTokenRepository.save(resetToken);

        String resetUrl = verificationBaseUrl.replace("/auth/verify-email", "/reset-password").replace("/verify-email", "/reset-password");
        if (!resetUrl.contains("/reset-password")) {
            resetUrl = "http://localhost:5173/reset-password";
        }
        resetUrl += "?token=" + token;

        log.info("Parolni tiklash so'rovi muvaffaqiyatli qabul qilindi: email={}, resetUrl={}", email, resetUrl);

        try {
            auditService.logAction(
                    "PASSWORD_RESET_REQUESTED",
                    "User",
                    String.valueOf(user.getId()),
                    user.getEmail(),
                    "Parolni qayta tiklash havolasi yaratildi. Havola: " + resetUrl
            );
        } catch (Exception e) {
            log.warn("Audit log yozishda xatolik: {}", e.getMessage());
        }

        return token;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String tokenStr = request.getToken().trim();
        PasswordResetToken tokenEntity = passwordResetTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new BusinessException("Parolni tiklash tokeni topilmadi yoki yaroqsiz"));

        if (tokenEntity.isUsed()) {
            throw new BusinessException("Ushbu parolni tiklash havolasidan allaqachon foydalanilgan");
        }

        if (tokenEntity.isExpired()) {
            throw new BusinessException("Parolni tiklash havolasining amal qilish muddati tugagan. Iltimos, yangi havola so'rang");
        }

        User user = tokenEntity.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        tokenEntity.setUsed(true);
        passwordResetTokenRepository.save(tokenEntity);

        try {
            auditService.logAction(
                    "PASSWORD_RESET_COMPLETED",
                    "User",
                    String.valueOf(user.getId()),
                    user.getEmail(),
                    "Foydalanuvchi paroli yangilandi"
            );
        } catch (Exception e) {
            log.warn("Audit log yozishda xatolik: {}", e.getMessage());
        }
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken().trim();
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException("Refresh token yaroqsiz yoki muddati tugagan");
        }

        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(username, username)
                .orElseThrow(() -> new BusinessException("Foydalanuvchi topilmadi"));

        if (!user.isEnabled()) {
            throw new BusinessException("Foydalanuvchi hisobi faol emas");
        }

        return buildAuthResponse(user);
    }

    public AuthResponse getCurrentUser(String username) {
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(username, username)
                .orElseThrow(() -> new BusinessException("Foydalanuvchi topilmadi: " + username));
        return buildAuthResponse(user);
    }

    @Transactional
    public void changePassword(String currentUsername, ChangePasswordRequest request) {
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(currentUsername, currentUsername)
                .orElseThrow(() -> new BusinessException("Foydalanuvchi topilmadi: " + currentUsername));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BusinessException("Joriy parol noto'g'ri kiritildi");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        try {
            auditService.logAction(
                    "PASSWORD_CHANGED",
                    "User",
                    String.valueOf(user.getId()),
                    user.getUsername(),
                    "Foydalanuvchi o'z parolini muvaffaqiyatli o'zgartirdi"
            );
        } catch (Exception e) {
            log.warn("Audit log yozishda xatolik: {}", e.getMessage());
        }
    }

    @Transactional
    public AuthResponse updateProfile(String currentUsername, UpdateProfileRequest request) {
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(currentUsername, currentUsername)
                .orElseThrow(() -> new BusinessException("Foydalanuvchi topilmadi: " + currentUsername));

        String fullName = request.getFullName().trim();
        user.setFullName(fullName);

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        if (request.getEmail() != null && !request.getEmail().trim().isBlank()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.existsByEmailIgnoreCase(newEmail)) {
                    throw new BusinessException("Ushbu email manzili allaqachon boshqa hisobda ro'yxatdan o'tgan");
                }
                user.setEmail(newEmail);
            }
        }

        User savedUser = userRepository.save(user);

        // Sync student if linked
        studentRepository.findByUserId(savedUser.getId()).ifPresent(s -> {
            s.setFullName(fullName);
            if (savedUser.getPhone() != null) s.setPhone(savedUser.getPhone());
            studentRepository.save(s);
        });

        // Sync mentor if linked
        mentorRepository.findByUserId(savedUser.getId()).ifPresent(m -> {
            m.setFullName(fullName);
            if (savedUser.getPhone() != null) m.setPhone(savedUser.getPhone());
            if (savedUser.getEmail() != null) m.setEmail(savedUser.getEmail());
            mentorRepository.save(m);
        });

        // Sync mentor profile if exists
        mentorProfileRepository.findByUserId(savedUser.getId()).ifPresent(mp -> {
            mp.setDisplayName(fullName);
            if (savedUser.getPhone() != null) mp.setPhone(savedUser.getPhone());
            if (savedUser.getEmail() != null) mp.setEmail(savedUser.getEmail());
            mentorProfileRepository.save(mp);
        });

        try {
            auditService.logAction(
                    "PROFILE_UPDATED",
                    "User",
                    String.valueOf(savedUser.getId()),
                    savedUser.getUsername(),
                    "Foydalanuvchi shaxsiy profiling yangiladi: " + fullName
            );
        } catch (Exception e) {
            log.warn("Audit log yozishda xatolik: {}", e.getMessage());
        }

        return buildAuthResponse(savedUser);
    }

    private EmailVerificationToken createVerificationTokenForUser(User user) {
        String token = UUID.randomUUID().toString();
        int codeInt = 100000 + SECURE_RANDOM.nextInt(900000);
        String code = String.valueOf(codeInt);

        EmailVerificationToken tokenEntity = EmailVerificationToken.builder()
                .token(token)
                .code(code)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(tokenExpirationMinutes))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();

        return emailVerificationTokenRepository.save(tokenEntity);
    }

    private void dispatchVerificationEmail(User user, EmailVerificationToken verificationToken) {
        String confirmationUrl = verificationBaseUrl;
        if (confirmationUrl.contains("?")) {
            confirmationUrl += "&token=" + verificationToken.getToken();
        } else {
            confirmationUrl += "?token=" + verificationToken.getToken();
        }

        int expirationHours = Math.max(1, tokenExpirationMinutes / 60);

        EmailVerificationEvent event = EmailVerificationEvent.builder()
                .recipientEmail(user.getEmail())
                .recipientName(user.getFullName())
                .verificationToken(verificationToken.getToken())
                .verificationCode(verificationToken.getCode())
                .confirmationUrl(confirmationUrl)
                .expirationHours(expirationHours)
                .build();

        emailProducerService.sendVerificationEmail(event);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());

        List<String> roles = new ArrayList<>();
        Set<String> permissions = new HashSet<>();

        if (user.getRole() != null && !user.getRole().isBlank()) {
            String primary = user.getRole().startsWith("ROLE_") ? user.getRole() : "ROLE_" + user.getRole();
            roles.add(primary);
        }
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            user.getRoles().forEach(r -> {
                String rName = r.getName().startsWith("ROLE_") ? r.getName() : "ROLE_" + r.getName();
                if (!roles.contains(rName)) {
                    roles.add(rName);
                }
                if (r.getPermissions() != null) {
                    r.getPermissions().forEach(p -> permissions.add(p.getName()));
                }
            });
        } else if (user.getRole() != null && !user.getRole().isBlank()) {
            String cleanRoleName = user.getRole().startsWith("ROLE_") ? user.getRole().substring(5) : user.getRole();
            roleRepository.findByName(cleanRoleName)
                    .or(() -> roleRepository.findByName(user.getRole()))
                    .ifPresent(r -> {
                        if (r.getPermissions() != null) {
                            r.getPermissions().forEach(p -> permissions.add(p.getName()));
                        }
                    });
        }
        if (roles.isEmpty()) {
            roles.add("ROLE_STUDENT");
        }

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .roles(roles)
                .permissions(new ArrayList<>(permissions))
                .emailVerified(user.isEmailVerified())
                .build();
    }

    private String normalizeRole(String requestedRole) {
        if (requestedRole == null || requestedRole.trim().isBlank()) {
            return "ROLE_STUDENT";
        }
        String cleaned = requestedRole.trim().toUpperCase();
        if (cleaned.contains("ADMIN")) {
            throw new BusinessException("Administrator sifatida o'z-o'zidan ro'yxatdan o'tish xavfsizlik nuqtai nazaridan taqiqlangan");
        }
        if (cleaned.equals("ROLE_ENGLISH_MENTOR") || cleaned.equals("ENGLISH_MENTOR")) {
            return "ROLE_ENGLISH_MENTOR";
        }
        if (cleaned.equals("ROLE_MENTOR") || cleaned.equals("MENTOR")) {
            return "ROLE_MENTOR";
        }
        if (cleaned.equals("ROLE_STUDENT") || cleaned.equals("STUDENT")) {
            return "ROLE_STUDENT";
        }
        if (cleaned.startsWith("ROLE_")) {
            return cleaned;
        }
        return "ROLE_" + cleaned;
    }

    private String deriveFullNameFromEmail(String email) {
        String prefix = email.split("@")[0];
        if (prefix.isBlank()) return "Foydalanuvchi";
        String[] parts = prefix.split("[._-]");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (!part.isBlank()) {
                if (!sb.isEmpty()) sb.append(" ");
                sb.append(Character.toUpperCase(part.charAt(0)));
                if (part.length() > 1) {
                    sb.append(part.substring(1));
                }
            }
        }
        return sb.length() > 0 ? sb.toString() : prefix;
    }
}
