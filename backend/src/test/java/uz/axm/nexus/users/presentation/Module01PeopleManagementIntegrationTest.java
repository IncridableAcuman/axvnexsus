package uz.axm.nexus.users.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.application.CreateUserRequest;
import uz.axm.nexus.identity.application.ChangePasswordRequest;
import uz.axm.nexus.identity.application.UpdateProfileRequest;
import uz.axm.nexus.mentors.application.CreateMentorRequest;
import uz.axm.nexus.mentors.application.UpdateMentorRequest;
import uz.axm.nexus.users.application.CreateStudentRequest;
import uz.axm.nexus.users.application.UpdateStudentRequest;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class Module01PeopleManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN"})
    @DisplayName("1. Student CRUD: Provision -> Get -> Update -> Group History -> Safe Archive")
    void testStudentManagementWorkflow() throws Exception {
        // Step A: Provision new student
        CreateStudentRequest provisionReq = CreateStudentRequest.builder()
                .fullName("Jasurbek Otaboyev")
                .gradeLevel("9-sinf")
                .phone("+998901234567")
                .pinfl("51234567890123")
                .district("Yangiariq tumani")
                .branchLocation("IT Park Yangiariq")
                .build();

        MvcResult provisionResult = mockMvc.perform(post("/api/students/provision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(provisionReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.studentIdNumber", notNullValue()))
                .andExpect(jsonPath("$.data.temporaryPassword", notNullValue()))
                .andReturn();

        Number studentIdNum = com.jayway.jsonpath.JsonPath.read(provisionResult.getResponse().getContentAsString(), "$.data.id");
        Long studentId = studentIdNum.longValue();

        // Step B: Get student details by ID
        mockMvc.perform(get("/api/students/{id}", studentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Jasurbek Otaboyev"))
                .andExpect(jsonPath("$.data.accountEnabled").value(true));

        // Step C: Update student info
        UpdateStudentRequest updateReq = UpdateStudentRequest.builder()
                .fullName("Jasurbek Otaboyev (Tahrirlangan)")
                .phone("+998919876543")
                .gradeLevel("10-sinf")
                .direction("Advanced UX/UI va Front-end")
                .status("ACTIVE")
                .build();

        mockMvc.perform(put("/api/students/{id}", studentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Jasurbek Otaboyev (Tahrirlangan)"))
                .andExpect(jsonPath("$.data.gradeLevel").value("10-sinf"));

        // Step D: Fetch student group history
        mockMvc.perform(get("/api/students/{id}/group-history", studentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Step E: Safe Archive student
        mockMvc.perform(post("/api/students/{id}/archive", studentId)
                        .param("reason", "Boshqa hududga ko'chdi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ARCHIVED"))
                .andExpect(jsonPath("$.data.accountEnabled").value(false));

        // Verify entity still exists in DB (not hard-deleted)
        Student archivedStudent = studentRepository.findById(studentId).orElse(null);
        assertNotNull(archivedStudent);
        assertEquals("ARCHIVED", archivedStudent.getStatus());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN"})
    @DisplayName("2. Mentor CRUD: Provision -> Get with Workload -> Update -> Safe Archive")
    void testMentorManagementWorkflow() throws Exception {
        // Step A: Provision new mentor
        CreateMentorRequest mentorReq = CreateMentorRequest.builder()
                .fullName("Komiljon Sodiqov")
                .role("Backend Java Mentori")
                .phone("+998935554433")
                .email("komiljon.sodiqov@test.uz")
                .branchLocation("IT Park Yangiariq")
                .bio("Spring Boot va Cloud mutaxassisi")
                .build();

        MvcResult result = mockMvc.perform(post("/api/mentors/provision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(mentorReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.hemisId", notNullValue()))
                .andReturn();

        Number mentorIdNum = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
        Long mentorId = mentorIdNum.longValue();

        // Step B: Get mentor details with workload
        mockMvc.perform(get("/api/mentors/{id}", mentorId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Komiljon Sodiqov"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.activeGroupsCount", notNullValue()))
                .andExpect(jsonPath("$.data.weeklyHours", notNullValue()));

        // Step C: Update mentor details
        UpdateMentorRequest updateReq = UpdateMentorRequest.builder()
                .fullName("Komiljon Sodiqov (Katta Mentor)")
                .role("Lead Java Mentor")
                .phone("+998939998877")
                .bio("Yangilangan mentor bio ma'lumotlari")
                .status("ACTIVE")
                .build();

        mockMvc.perform(put("/api/mentors/{id}", mentorId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Komiljon Sodiqov (Katta Mentor)"))
                .andExpect(jsonPath("$.data.role").value("Lead Java Mentor"));

        // Step D: Safe Archive mentor
        mockMvc.perform(post("/api/mentors/{id}/archive", mentorId)
                        .param("reason", "Loyihani yakunladi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ARCHIVED"))
                .andExpect(jsonPath("$.data.accountEnabled").value(false));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN"})
    @DisplayName("3. Administrator & Staff Provisioning: Create Staff -> Verify Multi-Role")
    void testStaffProvisioning() throws Exception {
        CreateUserRequest staffReq = CreateUserRequest.builder()
                .fullName("Nodirbek Yo'ldoshev")
                .username("coord_nodirbek")
                .email("nodirbek.coord@test.uz")
                .phone("+998907771122")
                .primaryRole("COORDINATOR")
                .password("Coord@2026Secure")
                .build();

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(staffReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("coord_nodirbek"))
                .andExpect(jsonPath("$.data.primaryRole").value("ROLE_COORDINATOR"))
                .andExpect(jsonPath("$.data.enabled").value(true));
    }

    @Test
    @WithMockUser(username = "testuser", roles = {"STUDENT"})
    @DisplayName("4. Security & Privilege Escalation: Non-admin cannot create Admin account")
    void testNonAdminCannotCreateAdmin() throws Exception {
        CreateUserRequest maliciousReq = CreateUserRequest.builder()
                .fullName("Xavfli Foydalanuvchi")
                .username("hacker_admin")
                .primaryRole("ADMIN")
                .build();

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maliciousReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "selfuser", roles = {"STUDENT"})
    @DisplayName("5. Self-Service Account Management: Change password & Update profile")
    void testSelfServiceAccountManagement() throws Exception {
        // Create user in DB for selfuser
        User user = User.builder()
                .username("selfuser")
                .password(passwordEncoder.encode("OldPassword123"))
                .fullName("Shaxsiy Foydalanuvchi")
                .email("selfuser@test.uz")
                .phone("+998901112233")
                .role("ROLE_STUDENT")
                .enabled(true)
                .build();
        userRepository.save(user);

        // Step A: Fail changing password with wrong current password
        ChangePasswordRequest wrongReq = ChangePasswordRequest.builder()
                .currentPassword("WrongPassword!")
                .newPassword("NewSecret123")
                .build();

        mockMvc.perform(post("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongReq)))
                .andExpect(status().isBadRequest());

        // Step B: Succeed changing password with valid current password
        ChangePasswordRequest validReq = ChangePasswordRequest.builder()
                .currentPassword("OldPassword123")
                .newPassword("NewSecret123")
                .build();

        mockMvc.perform(post("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Step C: Update profile
        UpdateProfileRequest profileReq = UpdateProfileRequest.builder()
                .fullName("Shaxsiy Foydalanuvchi (Yangilangan)")
                .phone("+998909990011")
                .email("selfuser.new@test.uz")
                .build();

        mockMvc.perform(put("/api/auth/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(profileReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Shaxsiy Foydalanuvchi (Yangilangan)"));
    }
}
