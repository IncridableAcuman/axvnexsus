package uz.axm.nexus.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.identity.infrastructure.JwtTokenProvider;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityRbacHardeningIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private CurrentUserHelper currentUserHelper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Value("${app.jwt.secret:axm_nexus_super_secret_jwt_key_that_is_at_least_256_bits_long_for_security_reasons_12345}")
    private String jwtSecret;

    private User realAdminUser;
    private User realStudentUser;
    private Student studentA;
    private Student studentB;

    @BeforeEach
    void setUp() {
        Role studentRole = roleRepository.findByName("STUDENT").orElse(null);

        realAdminUser = userRepository.findByUsername("admin").orElseThrow();

        realStudentUser = userRepository.save(User.builder()
                .username("4260001")
                .password("pass123")
                .fullName("Test O'quvchi A")
                .email("studentA@test.uz")
                .role("ROLE_STUDENT")
                .roles(studentRole != null ? Set.of(studentRole) : Set.of())
                .enabled(true)
                .emailVerified(true)
                .build());

        studentA = studentRepository.save(Student.builder()
                .fullName("Test O'quvchi A")
                .studentIdNumber("4260001")
                .gradeLevel("8-sinf")
                .branchLocation("IT Park Yangiariq")
                .status("Faol")
                .build());

        studentB = studentRepository.save(Student.builder()
                .fullName("Boshqa O'quvchi B")
                .studentIdNumber("4260002")
                .gradeLevel("9-sinf")
                .branchLocation("IT Park Yangiariq")
                .status("Faol")
                .build());
    }

    // =========================================================================
    // 1. Authentication Tests (401 Unauthorized)
    // =========================================================================

    @Test
    @DisplayName("Autentifikatsiyasiz himoyalangan endpointga so'rov 401 Unauthorized qaytarishi kerak")
    void anonymousRequestToProtectedEndpointReturns401() throws Exception {
        mockMvc.perform(get("/api/students"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ERR_UNAUTHORIZED"));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ERR_UNAUTHORIZED"));

        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ERR_UNAUTHORIZED"));

        mockMvc.perform(get("/api/v1/user-preferences"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Yaroqsiz yoki soxta JWT token yuborilganda 401 Unauthorized qaytarishi kerak")
    void invalidJwtReturns401() throws Exception {
        mockMvc.perform(get("/api/students")
                        .header("Authorization", "Bearer invalid.malformed.jwt.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ERR_UNAUTHORIZED"));
    }

    @Test
    @DisplayName("Muddati o'tgan (expired) JWT token yuborilganda 401 Unauthorized qaytarishi kerak")
    void expiredJwtReturns401() throws Exception {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        String expiredToken = Jwts.builder()
                .subject("admin")
                .issuedAt(new Date(System.currentTimeMillis() - 100000))
                .expiration(new Date(System.currentTimeMillis() - 1000))
                .signWith(key)
                .compact();

        mockMvc.perform(get("/api/students")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("ERR_UNAUTHORIZED"));
    }

    @Test
    @DisplayName("To'g'ri JWT token yuborilganda muvaffaqiyatli autentifikatsiyadan o'tishi kerak")
    void validJwtAuthenticatesSuccessfully() throws Exception {
        String token = jwtTokenProvider.generateAccessToken(realAdminUser);

        mockMvc.perform(get("/api/admin/overview")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Ochiq (public) endpointlar autentifikatsiyasiz ham ishlashi kerak")
    void publicEndpointsRemainAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/auth/captcha"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/mentors/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("CurrentUserHelper unauthenticated holatda hech qachon 1L yoki default admin qaytarmaydi")
    void currentUserHelperThrowsWhenUnauthenticated() {
        assertThrows(AuthenticationCredentialsNotFoundException.class, () -> {
            currentUserHelper.getCurrentUserId();
        });
        assertThrows(AuthenticationCredentialsNotFoundException.class, () -> {
            currentUserHelper.requireCurrentUser();
        });
    }

    // =========================================================================
    // 2. Authorization & RBAC Tests (403 Forbidden)
    // =========================================================================

    @Test
    @WithMockUser(username = "4260001", roles = {"STUDENT"})
    @DisplayName("O'quvchi roli administratorlik endpointlariga kira olmaydi (403 Forbidden)")
    void studentCannotAccessAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));

        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));

        mockMvc.perform(get("/api/mentors/profiles/admin"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));
    }

    @Test
    @WithMockUser(username = "4260001", roles = {"STUDENT"})
    @DisplayName("O'quvchi dars davomatini o'zgartira olmaydi (403 Forbidden)")
    void studentCannotSubmitAttendance() throws Exception {
        String validAttendanceJson = "{\"records\":[{\"studentId\":1,\"status\":\"PRESENT\"}]}";
        mockMvc.perform(post("/api/lessons/1/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validAttendanceJson))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));
    }

    @Test
    @WithMockUser(username = "4260001", roles = {"STUDENT"})
    @DisplayName("O'quvchi yangi guruh ocha olmaydi (403 Forbidden)")
    void studentCannotCreateGroup() throws Exception {
        mockMvc.perform(post("/api/groups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hacked Group\",\"gradeLevel\":\"8-sinf\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));
    }

    @Test
    @WithMockUser(username = "mentor_user", roles = {"MENTOR"})
    @DisplayName("Mentor roli foydalanuvchi rollarini boshqara olmaydi yoki tizimni sozlay olmaydi (403 Forbidden)")
    void mentorCannotManageRolesOrSystemConfig() throws Exception {
        mockMvc.perform(put("/api/users/1/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roles\":[\"SUPER_ADMIN\"]}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));

        mockMvc.perform(get("/api/admin/system-config"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));

        mockMvc.perform(patch("/api/mentors/profiles/1/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));
    }

    // =========================================================================
    // 3. HTTP Header Spoofing Resistance Tests
    // =========================================================================

    @Test
    @DisplayName("Soxta X-Admin-User headeri yuborilganda unauthenticated so'rovga ruxsat berilmaydi (401)")
    void fakeAdminHeaderDoesNotBypassAuthentication() throws Exception {
        mockMvc.perform(get("/api/users")
                        .header("X-Admin-User", "admin"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/groups/1/students")
                        .header("X-Admin-User", "admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":1}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "4260001", roles = {"STUDENT"})
    @DisplayName("O'quvchi X-User-Role: ROLE_ADMIN headerini yuborib huquqini oshira olmaydi (403)")
    void fakeUserRoleHeaderDoesNotElevatePrivileges() throws Exception {
        mockMvc.perform(get("/api/analytics/overview")
                        .header("X-User-Role", "ROLE_ADMIN")
                        .header("X-User-Id", "1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));
    }

    // =========================================================================
    // 4. Resource Ownership & IDOR Protection Tests
    // =========================================================================

    @Test
    @WithMockUser(username = "4260001", roles = {"STUDENT"})
    @DisplayName("O'quvchi boshqa o'quvchining shaxsiy baholari va test urinishlarini ko'ra olmaydi (IDOR himoyasi)")
    void studentCannotAccessAnotherStudentsPrivateRecords() throws Exception {
        // O'quvchi A boshqa o'quvchi B ning baholarini so'raydi -> 403
        mockMvc.perform(get("/api/grading/grades/student/" + studentB.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));

        // O'quvchi A boshqa o'quvchi B ning test urinishlarini so'raydi -> 403
        mockMvc.perform(get("/api/assessments/students/" + studentB.getId() + "/attempts"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));

        // O'quvchi A boshqa o'quvchi B ning analytics ma'lumotlarini so'raydi -> 403
        mockMvc.perform(get("/api/analytics/student/" + studentB.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ERR_ACCESS_DENIED"));
    }

    @Test
    @WithMockUser(username = "4260001", roles = {"STUDENT"})
    @DisplayName("O'quvchi o'zining shaxsiy baholarini muvaffaqiyatli ko'ra olishi kerak")
    void studentCanAccessOwnPrivateRecords() throws Exception {
        mockMvc.perform(get("/api/grading/grades/student/" + studentA.getId()))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 5. AI Assistant Endpoint Protection
    // =========================================================================

    @Test
    @DisplayName("Autentifikatsiyasiz AI assistentiga so'rov yuborish 401 Unauthorized qaytarishi kerak")
    void anonymousAiRequestIsRejected() throws Exception {
        mockMvc.perform(post("/api/ai/assistant/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userPrompt\":\"Yangi dars rejasini yarat\"}"))
                .andExpect(status().isUnauthorized());
    }
}
