package uz.axm.nexus.identity.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import uz.axm.nexus.identity.application.LoginRequest;
import uz.axm.nexus.identity.application.RegisterRequest;
import uz.axm.nexus.identity.application.ResendVerificationRequest;
import uz.axm.nexus.users.infrastructure.UserRepository;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private uz.axm.nexus.identity.infrastructure.EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Autowired
    private uz.axm.nexus.notifications.application.EmailRateLimiterService emailRateLimiterService;

    @Autowired
    private uz.axm.nexus.users.infrastructure.StudentRepository studentRepository;

    @Autowired
    private uz.axm.nexus.mentors.infrastructure.MentorRepository mentorRepository;

    @BeforeEach
    void setUp() {
        emailRateLimiterService.resetAll();
        // Keep seeded admin, clean up tokens first to prevent FK integrity errors
        emailVerificationTokenRepository.deleteAll();
        userRepository.findAll().forEach(user -> {
            if (!"admin".equals(user.getUsername())) {
                studentRepository.findByUserId(user.getId()).ifPresent(s -> {
                    s.setUser(null);
                    studentRepository.save(s);
                });
                mentorRepository.findByUserId(user.getId()).ifPresent(m -> {
                    m.setUser(null);
                    mentorRepository.save(m);
                });
                userRepository.delete(user);
            }
        });
    }

    @Test
    @DisplayName("Email va parol orqali yangi foydalanuvchi muvaffaqiyatli ro'yxatdan o'tishi kerak")
    void shouldRegisterNewUserSuccessfully() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("test.student@axm-nexus.uz")
                .password("parol123")
                .fullName("Rustam Axmedov")
                .role("ROLE_STUDENT")
                .phone("+998 90 111 22 33")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi"))
                .andExpect(jsonPath("$.data.email").value("test.student@axm-nexus.uz"))
                .andExpect(jsonPath("$.data.fullName").value("Rustam Axmedov"))
                .andExpect(jsonPath("$.data.roles", hasItem("ROLE_STUDENT")))
                .andExpect(jsonPath("$.data.accessToken", notNullValue()));
    }

    @Test
    @DisplayName("Takroriy email bilan ro'yxatdan o'tish rad etilishi kerak")
    void shouldRejectDuplicateEmailRegistration() throws Exception {
        RegisterRequest request1 = RegisterRequest.builder()
                .email("repeat@axm-nexus.uz")
                .password("parol123")
                .fullName("Birinchi Foydalanuvchi")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isCreated());

        RegisterRequest request2 = RegisterRequest.builder()
                .email("REPEAT@axm-nexus.uz")
                .password("boshqaparol456")
                .fullName("Ikkinchi Foydalanuvchi")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("allaqachon")));
    }

    @Test
    @DisplayName("Email noto'g'ri formatda bo'lsa validatsiya xatosi qaytarishi kerak")
    void shouldRejectInvalidEmail() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("not-an-email")
                .password("parol123")
                .fullName("Test Foydalanuvchi")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.email", notNullValue()));
    }

    @Test
    @DisplayName("Parol 6 belgidan kam bo'lsa validatsiya xatosi qaytarishi kerak")
    void shouldRejectShortPassword() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("valid@axm-nexus.uz")
                .password("123")
                .fullName("Test Foydalanuvchi")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.password", notNullValue()));
    }

    @Test
    @DisplayName("Ro'yxatdan o'tgan foydalanuvchi email orqali tizimga kira olishi kerak")
    void shouldLoginWithEmailSuccessfully() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("login.user@axm-nexus.uz")
                .password("securePass99")
                .fullName("Login User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        LoginRequest loginReq = LoginRequest.builder()
                .username("login.user@axm-nexus.uz")
                .password("securePass99")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("login.user@axm-nexus.uz"))
                .andExpect(jsonPath("$.data.accessToken", notNullValue()));
    }

    @Test
    @DisplayName("Email tasdiqlash tokeni orqali muvaffaqiyatli faollashtirilishi kerak")
    void shouldVerifyEmailWithTokenSuccessfully() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("verify.me@axm-nexus.uz")
                .password("securePass99")
                .fullName("Verify User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        var tokens = emailVerificationTokenRepository.findAll();
        org.junit.jupiter.api.Assertions.assertFalse(tokens.isEmpty(), "Verification token yaratilgan bo'lishi kerak");
        String token = tokens.get(0).getToken();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/auth/verify-email")
                        .param("token", token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.emailVerified").value(true));
    }

    @Test
    @DisplayName("Email tasdiqlash 6 xonali OTP kod orqali amalga oshirilishi kerak")
    void shouldVerifyEmailWithOtpCodeSuccessfully() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("otp.verify@axm-nexus.uz")
                .password("securePass99")
                .fullName("OTP User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        var user = userRepository.findByEmailIgnoreCase("otp.verify@axm-nexus.uz").orElseThrow();
        var token = emailVerificationTokenRepository.findByUserAndUsedFalse(user).get(0);

        uz.axm.nexus.identity.application.VerifyEmailRequest verifyReq = uz.axm.nexus.identity.application.VerifyEmailRequest.builder()
                .email("otp.verify@axm-nexus.uz")
                .code(token.getCode())
                .build();

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.emailVerified").value(true));
    }

    @Test
    @DisplayName("Tasdiqlash xati qayta yuborilishi kerak")
    void shouldResendVerificationEmailSuccessfully() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("resend.user@axm-nexus.uz")
                .password("securePass99")
                .fullName("Resend User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        // Reset rate limiter for this user to simulate cooldown period elapsed
        emailRateLimiterService.reset("resend.user@axm-nexus.uz");

        uz.axm.nexus.identity.application.ResendVerificationRequest resendReq = uz.axm.nexus.identity.application.ResendVerificationRequest.builder()
                .email("resend.user@axm-nexus.uz")
                .build();

        mockMvc.perform(post("/api/v1/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resendReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Admin roli bilan o'z-o'zidan ro'yxatdan o'tish rad etilishi kerak")
    void shouldRejectAdminSelfRegistration() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("fake.admin@axm-nexus.uz")
                .password("adminpass123")
                .fullName("Hacker Admin")
                .role("ROLE_ADMIN")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Administrator sifatida o'z-o'zidan ro'yxatdan o'tish")));
    }

    @Test
    @DisplayName("English Mentor roli bilan foydalanuvchi muvaffaqiyatli ro'yxatdan o'tishi kerak")
    void shouldRegisterEnglishMentorSuccessfully() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("dilnoza.english@axm-nexus.uz")
                .password("englishpass123")
                .fullName("Dilnoza Raximova")
                .role("ROLE_ENGLISH_MENTOR")
                .phone("+998 90 777 88 99")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.roles", hasItem("ROLE_ENGLISH_MENTOR")));
    }

    @Test
    @DisplayName("Qisqa vaqt ichida takroriy email tasdiqlash so'ralsa 429 Too Many Requests qaytarilishi kerak")
    void shouldEnforceRateLimitOnRepeatedResendRequests() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .email("ratelimit.user@axm-nexus.uz")
                .password("parol12345")
                .fullName("Rate Limit Test")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated());

        ResendVerificationRequest resendReq = new ResendVerificationRequest();
        resendReq.setEmail("ratelimit.user@axm-nexus.uz");

        // Immediate consecutive request must be blocked by rate limiter with 429 status
        mockMvc.perform(post("/api/v1/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resendReq)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Juda ko'p so'rov yuborildi")));
    }
}
