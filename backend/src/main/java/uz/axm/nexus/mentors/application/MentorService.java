package uz.axm.nexus.mentors.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.identity.application.HemisIdGeneratorService;
import uz.axm.nexus.identity.application.ResetPasswordResultDto;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.domain.MentorProfile;
import uz.axm.nexus.mentors.infrastructure.MentorProfileRepository;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MentorService {

    private final MentorRepository mentorRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final HemisIdGeneratorService hemisIdGeneratorService;
    private final MentorProfileRepository mentorProfileRepository;
    private final AuditService auditService;

    public List<Mentor> getAllMentors() {
        return mentorRepository.findAll();
    }

    public Optional<Mentor> findById(Long id) {
        return mentorRepository.findById(id);
    }

    public Optional<Mentor> findByName(String name) {
        if (name == null || name.isBlank()) return Optional.empty();
        return mentorRepository.findByFullNameIgnoreCase(name.trim())
                .or(() -> mentorRepository.findByFullNameContainingIgnoreCase(name.trim()));
    }

    @Transactional
    public Mentor getOrCreate(String fullName, String role, String branchLocation) {
        if (fullName == null || fullName.isBlank()) {
            fullName = "Noma'lum Mentor";
        }
        String finalName = fullName.trim();
        return findByName(finalName).orElseGet(() -> {
            Mentor mentor = Mentor.builder()
                    .fullName(finalName)
                    .role(role != null && !role.isBlank() ? role : "IT mentor")
                    .branchLocation(branchLocation != null && !branchLocation.isBlank() ? branchLocation : "IT Park Yangiariq")
                    .build();
            return mentorRepository.save(mentor);
        });
    }

    @Transactional
    public Mentor save(Mentor mentor) {
        return mentorRepository.save(mentor);
    }

    /**
     * Admin tomonidan yangi mentor va uning HEMIS tartibidagi hisobini (ID + random parol) yaratish
     */
    @Transactional
    public MentorProvisionDto provisionMentor(CreateMentorRequest request) {
        String fullName = request.getFullName().trim();
        String role = request.getRole() != null && !request.getRole().isBlank() ? request.getRole().trim() : "IT mentor";
        String branchLocation = request.getBranchLocation() != null && !request.getBranchLocation().isBlank()
                ? request.getBranchLocation().trim() : "IT Park Yangiariq";
        String phone = request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null;
        String email = request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail().trim().toLowerCase() : null;

        // 1. Generate HEMIS Mentor ID & Random Password
        String hemisId = hemisIdGeneratorService.generateMentorId();
        String rawPassword = hemisIdGeneratorService.generatePassword();

        // 2. Create Mentor entity
        Mentor mentor = Mentor.builder()
                .fullName(fullName)
                .role(role)
                .branchLocation(branchLocation)
                .phone(phone)
                .email(email)
                .bio(request.getBio())
                .build();
        Mentor savedMentor = mentorRepository.save(mentor);

        // 3. Attach Roles and create User auth record
        Set<Role> roles = new HashSet<>();
        roleRepository.findByName("MENTOR")
                .or(() -> roleRepository.findByName("ROLE_MENTOR"))
                .ifPresent(roles::add);

        String userEmail = email != null ? email : (hemisId + "@mentor.axm-nexus.uz");

        User user = User.builder()
                .username(hemisId)
                .password(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .phone(phone)
                .email(userEmail)
                .role("ROLE_MENTOR")
                .roles(roles)
                .enabled(true)
                .emailVerified(true)
                .build();
        User savedUser = userRepository.save(user);

        // 3.1 Link Mentor entity to User Authentication Record
        savedMentor.setUser(savedUser);
        mentorRepository.save(savedMentor);

        // 4. Create initial MentorProfile
        if (mentorProfileRepository.findByMentorId(savedMentor.getId()).isEmpty()) {
            mentorProfileRepository.save(MentorProfile.builder()
                    .mentor(savedMentor)
                    .user(savedUser)
                    .displayName(fullName)
                    .headline(role + " | " + branchLocation)
                    .bio(request.getBio() != null ? request.getBio() : "Al-Xorazmiy Vorislari ta'lim loyihasi mentori")
                    .phone(phone)
                    .email(userEmail)
                    .branchLocation(branchLocation)
                    .isContactPublic(true)
                    .publicationStatus("PUBLISHED")
                    .build());
        }

        try {
            auditService.logAction(
                    "MENTOR_PROVISIONED",
                    "Mentor",
                    String.valueOf(savedMentor.getId()),
                    "admin",
                    "Admin tomonidan yangi mentor va HEMIS hisobi yaratildi: " + fullName + " (ID: " + hemisId + ")"
            );
        } catch (Exception e) {
            log.warn("Audit xatosi: {}", e.getMessage());
        }

        return MentorProvisionDto.builder()
                .id(savedMentor.getId())
                .fullName(savedMentor.getFullName())
                .role(savedMentor.getRole())
                .phone(savedMentor.getPhone())
                .email(savedMentor.getEmail())
                .branchLocation(savedMentor.getBranchLocation())
                .bio(savedMentor.getBio())
                .hemisId(hemisId)
                .temporaryPassword(rawPassword)
                .accountCreated(true)
                .createdAt(LocalDateTime.now())
                .build();
    }

    /**
     * Admin tomonidan mentor hisobiga yangi tasodifiy parol generatsiya qilib berish
     */
    @Transactional
    public ResetPasswordResultDto resetMentorPassword(Long mentorId) {
        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new BusinessException("Mentor topilmadi (ID: " + mentorId + ")"));

        // Find user by mentor email, phone or search in users
        User user = null;
        if (mentor.getEmail() != null) {
            user = userRepository.findByEmailIgnoreCase(mentor.getEmail()).orElse(null);
        }
        if (user == null) {
            // Find user where fullName matches and role is mentor
            List<User> users = userRepository.findAll().stream()
                    .filter(u -> u.getFullName().equalsIgnoreCase(mentor.getFullName()) ||
                            (u.getPhone() != null && u.getPhone().equals(mentor.getPhone())))
                    .toList();
            if (!users.isEmpty()) {
                user = users.get(0);
            }
        }

        String newPassword = hemisIdGeneratorService.generatePassword();
        String identifier;

        if (user == null) {
            // User did not exist yet -> create one with new HEMIS ID
            identifier = hemisIdGeneratorService.generateMentorId();
            Set<Role> roles = new HashSet<>();
            roleRepository.findByName("MENTOR")
                    .or(() -> roleRepository.findByName("ROLE_MENTOR"))
                    .ifPresent(roles::add);

            user = User.builder()
                    .username(identifier)
                    .password(passwordEncoder.encode(newPassword))
                    .fullName(mentor.getFullName())
                    .phone(mentor.getPhone())
                    .email(mentor.getEmail() != null ? mentor.getEmail() : (identifier + "@mentor.axm-nexus.uz"))
                    .role("ROLE_MENTOR")
                    .roles(roles)
                    .enabled(true)
                    .emailVerified(true)
                    .build();
            userRepository.save(user);
        } else {
            identifier = user.getUsername();
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
        }

        try {
            auditService.logAction(
                    "MENTOR_PASSWORD_RESET",
                    "Mentor",
                    String.valueOf(mentor.getId()),
                    "admin",
                    "Mentor paroli qayta tiklandi: " + mentor.getFullName() + " (ID: " + identifier + ")"
            );
        } catch (Exception e) {
            log.warn("Audit xatosi: {}", e.getMessage());
        }

        return ResetPasswordResultDto.builder()
                .targetId(mentor.getId())
                .identifier(identifier)
                .fullName(mentor.getFullName())
                .newPassword(newPassword)
                .build();
    }
}
