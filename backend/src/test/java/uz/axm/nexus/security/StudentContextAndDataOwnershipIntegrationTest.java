package uz.axm.nexus.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.assessments.domain.AssessmentQuestion;
import uz.axm.nexus.assessments.domain.StudentAssessmentAttempt;
import uz.axm.nexus.assessments.infrastructure.AssessmentQuestionRepository;
import uz.axm.nexus.assessments.infrastructure.AssessmentRepository;
import uz.axm.nexus.assessments.infrastructure.StudentAssessmentAttemptRepository;
import uz.axm.nexus.assignments.domain.Assignment;
import uz.axm.nexus.assignments.domain.AssignmentSubmission;
import uz.axm.nexus.assignments.infrastructure.AssignmentRepository;
import uz.axm.nexus.assignments.infrastructure.AssignmentSubmissionRepository;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.identity.infrastructure.JwtTokenProvider;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class StudentContextAndDataOwnershipIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MentorRepository mentorRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private AssessmentRepository assessmentRepository;

    @Autowired
    private AssessmentQuestionRepository questionRepository;

    @Autowired
    private StudentAssessmentAttemptRepository attemptRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    private User userStudentA;
    private User userStudentB;
    private User userNoProfileStudent;
    private User userMentorA;
    private User userMentorB;
    private User userAdmin;

    private Student studentA;
    private Student studentB;
    private Mentor mentorA;
    private Mentor mentorB;
    private StudyGroup groupA;
    private StudyGroup groupB;
    private Assessment activeAssessment;
    private Assignment activeAssignment;

    @BeforeEach
    void setUp() {
        Role studentRole = roleRepository.findByName("STUDENT").orElse(null);
        Role mentorRole = roleRepository.findByName("MENTOR").orElse(null);

        userAdmin = userRepository.findByUsername("admin").orElseThrow();

        // 1. Create Mentors and Groups
        userMentorA = userRepository.save(User.builder()
                .username("mentor_a")
                .password("pass123")
                .fullName("Mentor Alisher")
                .email("mentor.a@axm.uz")
                .role("ROLE_MENTOR")
                .roles(mentorRole != null ? Set.of(mentorRole) : Set.of())
                .enabled(true)
                .emailVerified(true)
                .build());

        mentorA = mentorRepository.save(Mentor.builder()
                .fullName("Mentor Alisher")
                .email("mentor.a@axm.uz")
                .phone("+998901111111")
                .role("IT mentor")
                .user(userMentorA)
                .build());

        groupA = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("GRP-A")
                .subject("Web Full-Stack")
                .gradeLevel("8-sinf")
                .mentor(mentorA)
                .build());

        userMentorB = userRepository.save(User.builder()
                .username("mentor_b")
                .password("pass123")
                .fullName("Mentor Bobur")
                .email("mentor.b@axm.uz")
                .role("ROLE_MENTOR")
                .roles(mentorRole != null ? Set.of(mentorRole) : Set.of())
                .enabled(true)
                .emailVerified(true)
                .build());

        mentorB = mentorRepository.save(Mentor.builder()
                .fullName("Mentor Bobur")
                .email("mentor.b@axm.uz")
                .phone("+998902222222")
                .role("IT mentor")
                .user(userMentorB)
                .build());

        groupB = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("GRP-B")
                .subject("Web Full-Stack")
                .gradeLevel("8-sinf")
                .mentor(mentorB)
                .build());

        // 2. Create Students
        userStudentA = userRepository.save(User.builder()
                .username("I-HR 010001")
                .password("pass123")
                .fullName("O'quvchi Anvar")
                .email("anvar@student.axm.uz")
                .role("ROLE_STUDENT")
                .roles(studentRole != null ? Set.of(studentRole) : Set.of())
                .enabled(true)
                .emailVerified(true)
                .build());

        studentA = studentRepository.save(Student.builder()
                .fullName("O'quvchi Anvar")
                .studentIdNumber("I-HR 010001")
                .gradeLevel("8-sinf")
                .branchLocation("IT Park Yangiariq")
                .status("Faol")
                .user(userStudentA)
                .studyGroup(groupA)
                .mentor(mentorA)
                .build());

        userStudentB = userRepository.save(User.builder()
                .username("I-HR 010002")
                .password("pass123")
                .fullName("O'quvchi Bekzod")
                .email("bekzod@student.axm.uz")
                .role("ROLE_STUDENT")
                .roles(studentRole != null ? Set.of(studentRole) : Set.of())
                .enabled(true)
                .emailVerified(true)
                .build());

        studentB = studentRepository.save(Student.builder()
                .fullName("O'quvchi Bekzod")
                .studentIdNumber("I-HR 010002")
                .gradeLevel("8-sinf")
                .branchLocation("IT Park Yangiariq")
                .status("Faol")
                .user(userStudentB)
                .studyGroup(groupB)
                .mentor(mentorB)
                .build());

        userNoProfileStudent = userRepository.save(User.builder()
                .username("I-HR 099999")
                .password("pass123")
                .fullName("Profilsiz Talaba")
                .email("noprofile@student.axm.uz")
                .role("ROLE_STUDENT")
                .roles(studentRole != null ? Set.of(studentRole) : Set.of())
                .enabled(true)
                .emailVerified(true)
                .build());

        // 3. Create Assessment
        activeAssessment = assessmentRepository.save(Assessment.builder()
                .title("HTML & CSS Yakuniy Test")
                .subject("Web Full-Stack")
                .gradeLevel("8-sinf")
                .assessmentType("QUIZ")
                .passingScore(60)
                .durationMinutes(30)
                .totalPoints(100)
                .maxAttempts(3)
                .isPublished(true)
                .build());

        questionRepository.save(AssessmentQuestion.builder()
                .assessmentId(activeAssessment.getId())
                .questionText("HTML qisqartmasi nima?")
                .questionType("SINGLE_CHOICE")
                .optionsJson("[\"HyperText Markup Language\",\"HighText Modern Language\"]")
                .correctAnswersJson("0")
                .points(100)
                .orderIndex(1)
                .build());

        activeAssignment = assignmentRepository.save(Assignment.builder()
                .title("Responsive Portfolio yaratish")
                .subject("Web Full-Stack")
                .gradeLevel("8-sinf")
                .groupId(groupA.getId())
                .mentorId(mentorA.getId())
                .maxPoints(100)
                .isActive(true)
                .deadline(LocalDateTime.now().plusDays(7))
                .build());
    }

    // =========================================================================
    // 1. Unauthenticated Requests (401 Unauthorized)
    // =========================================================================

    @Test
    @DisplayName("Autentifikatsiyasiz /api/students/me so'rovi 401 qaytarishi kerak")
    void anonymousRequestToStudentsMeReturns401() throws Exception {
        mockMvc.perform(get("/api/students/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Autentifikatsiyasiz /api/grading/profile/me so'rovi 401 qaytarishi kerak")
    void anonymousRequestToGradingProfileMeReturns401() throws Exception {
        mockMvc.perform(get("/api/grading/profile/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Autentifikatsiyasiz /api/assessments/my-attempts so'rovi 401 qaytarishi kerak")
    void anonymousRequestToMyAttemptsReturns401() throws Exception {
        mockMvc.perform(get("/api/assessments/my-attempts"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // 2. Student Self-Context Resolution
    // =========================================================================

    @Test
    @DisplayName("Student o'zining /api/students/me ma'lumotlarini aniq olishi kerak")
    void authenticatedStudentResolvesTheirOwnProfileViaStudentsMe() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/students/me")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(studentA.getId()))
                .andExpect(jsonPath("$.fullName").value("O'quvchi Anvar"))
                .andExpect(jsonPath("$.studentIdNumber").value("I-HR 010001"));
    }

    @Test
    @DisplayName("Student o'zining /api/grading/profile/me gamifikatsiya profilini olishi kerak")
    void authenticatedStudentResolvesTheirOwnGradingProfileViaProfileMe() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/grading/profile/me")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(studentA.getId()))
                .andExpect(jsonPath("$.displayName").value("O'quvchi A. (I-HR 010001)"));
    }

    @Test
    @DisplayName("Student o'zining /api/grading/streak/me ma'lumotlarini olishi kerak")
    void authenticatedStudentResolvesTheirOwnStreakViaStreakMe() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/grading/streak/me")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(studentA.getId()));
    }

    @Test
    @DisplayName("O'quvchi profili bog'lanmagan foydalanuvchi /api/students/me chaqirganda 404 qaytishi kerak")
    void studentWithoutLinkedProfileReturns404OnStudentsMe() throws Exception {
        String tokenNoProfile = jwtTokenProvider.generateAccessToken(userNoProfileStudent);

        mockMvc.perform(get("/api/students/me")
                        .header("Authorization", "Bearer " + tokenNoProfile))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // 3. IDOR Protection (Cross-Student Access Prevention - 403 Forbidden)
    // =========================================================================

    @Test
    @DisplayName("Student A boshqa Student B ning gamifikatsiya profiliga kira olmasligi kerak (403 Forbidden)")
    void studentCannotAccessOtherStudentGradingProfile() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/grading/profile/" + studentB.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Student A boshqa Student B ning test urinishlari tarixiga kira olmasligi kerak (403 Forbidden)")
    void studentCannotAccessOtherStudentAttempts() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/assessments/students/" + studentB.getId() + "/attempts")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Student A boshqa Student B ning akademik baholariga kira olmasligi kerak (403 Forbidden)")
    void studentCannotAccessOtherStudentGrades() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/grading/grades/student/" + studentB.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Student A boshqa Student B ning ball tranzaksiyalariga kira olmasligi kerak (403 Forbidden)")
    void studentCannotAccessOtherStudentPoints() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/grading/points/student/" + studentB.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // 4. Assessment & Streak Identity Binding Tests
    // =========================================================================

    @Test
    @DisplayName("Student test boshlaganda studentId kiritilmasa ham avtomatik o'z hisobiga bog'lanadi")
    void studentStartingAttemptAutomaticallyBindsToAuthenticatedStudent() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(post("/api/assessments/" + activeAssessment.getId() + "/start")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(studentA.getId()))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @DisplayName("Student A boshqa Student B ning test urinishini topshira olmaydi (403 Forbidden)")
    void studentCannotSubmitOtherStudentAttempt() throws Exception {
        // Create an attempt belonging to Student B
        StudentAssessmentAttempt attemptB = attemptRepository.save(StudentAssessmentAttempt.builder()
                .assessmentId(activeAssessment.getId())
                .studentId(studentB.getId())
                .startedAt(LocalDateTime.now())
                .maxPossibleScore(100)
                .status("IN_PROGRESS")
                .build());

        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(post("/api/assessments/attempts/" + attemptB.getId() + "/submit")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(1L, "0"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Student streak check-in qilganda studentId parametr berilmasa ham avtomatik o'ziga hisoblanadi")
    void studentCheckInStreakAutomaticallyBindsToAuthenticatedStudent() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(post("/api/grading/streak/check-in")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(studentA.getId()))
                .andExpect(jsonPath("$.alreadyRecorded").value(false));
    }

    // =========================================================================
    // 5. Mentor Scoped Access & Admin Super Access
    // =========================================================================

    @Test
    @DisplayName("Mentor A faqat o'z guruhidagi Student A ma'lumotlariga kira oladi")
    void mentorCanAccessAssignedStudentProfile() throws Exception {
        String tokenMentorA = jwtTokenProvider.generateAccessToken(userMentorA);

        mockMvc.perform(get("/api/grading/profile/" + studentA.getId())
                        .header("Authorization", "Bearer " + tokenMentorA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(studentA.getId()));
    }

    @Test
    @DisplayName("Mentor A begona guruhdagi Student B ma'lumotlariga kira olmaydi (403 Forbidden)")
    void mentorCannotAccessUnassignedStudentProfile() throws Exception {
        String tokenMentorA = jwtTokenProvider.generateAccessToken(userMentorA);

        mockMvc.perform(get("/api/grading/profile/" + studentB.getId())
                        .header("Authorization", "Bearer " + tokenMentorA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Administrator har qanday talabaning ma'lumotlariga kira oladi")
    void adminCanAccessAnyStudentProfile() throws Exception {
        String tokenAdmin = jwtTokenProvider.generateAccessToken(userAdmin);

        mockMvc.perform(get("/api/grading/profile/" + studentA.getId())
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(studentA.getId()));

        mockMvc.perform(get("/api/grading/profile/" + studentB.getId())
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(studentB.getId()));
    }

    // =========================================================================
    // 6. Assignment Submissions Identity Binding & Access Control
    // =========================================================================

    @Test
    @DisplayName("Autentifikatsiyasiz /api/assignments/my-submissions so'rovi 401 qaytarishi kerak")
    void anonymousRequestToMySubmissionsReturns401() throws Exception {
        mockMvc.perform(get("/api/assignments/my-submissions"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Student A boshqa Student B ning topshirgan ishlariga kira olmasligi kerak (403 Forbidden)")
    void studentCannotAccessOtherStudentSubmissions() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/assignments/students/" + studentB.getId() + "/submissions")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Student topshiriq yuborganda studentId kiritilmasa yoki boshqa ID berilsa ham avtomatik o'z hisobiga bog'lanadi")
    void studentSubmittingAssignmentAutomaticallyBindsToAuthenticatedStudent() throws Exception {
        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(post("/api/assignments/" + activeAssignment.getId() + "/submit")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "studentId", 999999L,
                                "submissionText", "Mana mening portfolio loyiham: https://github.com/anvar/portfolio",
                                "fileUrl", "https://nexus.axm.uz/files/portfolio.zip"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(studentA.getId()))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Student o'zining /api/assignments/my-submissions ro'yxatini olishi kerak")
    void authenticatedStudentResolvesOwnSubmissionsViaMySubmissions() throws Exception {
        assignmentSubmissionRepository.save(AssignmentSubmission.builder()
                .assignmentId(activeAssignment.getId())
                .studentId(studentA.getId())
                .submissionText("Test submission text")
                .status("PENDING")
                .build());

        String tokenA = jwtTokenProvider.generateAccessToken(userStudentA);

        mockMvc.perform(get("/api/assignments/my-submissions")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentId").value(studentA.getId()))
                .andExpect(jsonPath("$[0].submissionText").value("Test submission text"));
    }
}
