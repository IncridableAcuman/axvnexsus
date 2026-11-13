package uz.axm.nexus.analytics.presentation;

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
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.assessments.infrastructure.AssessmentRepository;
import uz.axm.nexus.assignments.domain.Assignment;
import uz.axm.nexus.assignments.domain.AssignmentSubmission;
import uz.axm.nexus.assignments.infrastructure.AssignmentRepository;
import uz.axm.nexus.assignments.infrastructure.AssignmentSubmissionRepository;
import uz.axm.nexus.classrooms.domain.Room;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.RoomRepository;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.identity.infrastructure.JwtTokenProvider;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.domain.AttendanceRecord;
import uz.axm.nexus.scheduling.domain.LessonSession;
import uz.axm.nexus.scheduling.infrastructure.AttendanceRecordRepository;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DashboardAnalyticsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

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
    private RoomRepository roomRepository;

    @Autowired
    private LessonSessionRepository lessonSessionRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository assignmentSubmissionRepository;

    @Autowired
    private AssessmentRepository assessmentRepository;

    private User adminUser;
    private User mentorUserA;
    private User mentorUserB;
    private User studentUserA;
    private User studentUserB;
    private User studentWithoutProfile;

    private Mentor mentorA;
    private Mentor mentorB;
    private Student studentA;
    private Student studentB;
    private StudyGroup groupA;
    private StudyGroup groupB;

    private String tokenAdmin;
    private String tokenMentorA;
    private String tokenMentorB;
    private String tokenStudentA;
    private String tokenStudentB;
    private String tokenNoProfileStudent;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_ADMIN").description("Admin").build()));
        Role mentorRole = roleRepository.findByName("ROLE_MENTOR")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_MENTOR").description("Mentor").build()));
        Role studentRole = roleRepository.findByName("ROLE_STUDENT")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_STUDENT").description("Student").build()));

        // Users
        adminUser = userRepository.save(User.builder()
                .username("dash_admin")
                .email("dash_admin@axm.uz")
                .password("hash")
                .fullName("Admin Rustam")
                .role("ROLE_ADMIN")
                .roles(Set.of(adminRole))
                .build());

        mentorUserA = userRepository.save(User.builder()
                .username("dash_mentor_a")
                .email("dash_mentor_a@axm.uz")
                .password("hash")
                .fullName("Mentor Aziz")
                .role("ROLE_MENTOR")
                .roles(Set.of(mentorRole))
                .build());

        mentorUserB = userRepository.save(User.builder()
                .username("dash_mentor_b")
                .email("dash_mentor_b@axm.uz")
                .password("hash")
                .fullName("Mentor Bobur")
                .role("ROLE_MENTOR")
                .roles(Set.of(mentorRole))
                .build());

        studentUserA = userRepository.save(User.builder()
                .username("dash_student_a")
                .email("dash_student_a@axm.uz")
                .password("hash")
                .fullName("Student Ali")
                .role("ROLE_STUDENT")
                .roles(Set.of(studentRole))
                .build());

        studentUserB = userRepository.save(User.builder()
                .username("dash_student_b")
                .email("dash_student_b@axm.uz")
                .password("hash")
                .fullName("Student Vali")
                .role("ROLE_STUDENT")
                .roles(Set.of(studentRole))
                .build());

        studentWithoutProfile = userRepository.save(User.builder()
                .username("dash_student_orphan")
                .email("dash_orphan@axm.uz")
                .password("hash")
                .fullName("Orphan Student")
                .role("ROLE_STUDENT")
                .roles(Set.of(studentRole))
                .build());

        // Mentors
        mentorA = mentorRepository.save(Mentor.builder()
                .user(mentorUserA)
                .fullName("Mentor Aziz")
                .email("dash_mentor_a@axm.uz")
                .role("Full-Stack Mentor")
                .branchLocation("IT Park Yangiariq")
                .build());

        mentorB = mentorRepository.save(Mentor.builder()
                .user(mentorUserB)
                .fullName("Mentor Bobur")
                .email("dash_mentor_b@axm.uz")
                .role("Algorithmics Mentor")
                .branchLocation("IT Park Yangiariq")
                .build());

        // Study Groups
        groupA = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("GRP-A")
                .gradeLevel("8-sinf")
                .subject("Web Development")
                .branchLocation("IT Park Yangiariq")
                .mentor(mentorA)
                .build());

        groupB = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("GRP-B")
                .gradeLevel("9-sinf")
                .subject("C++ & Algorithms")
                .branchLocation("IT Park Yangiariq")
                .mentor(mentorB)
                .build());

        // Students
        studentA = studentRepository.save(Student.builder()
                .user(studentUserA)
                .fullName("Student Ali")
                .studentIdNumber("STU-A-01")
                .gradeLevel("8-sinf")
                .status("Faol")
                .studyGroup(groupA)
                .mentor(mentorA)
                .branchLocation("IT Park Yangiariq")
                .build());

        studentB = studentRepository.save(Student.builder()
                .user(studentUserB)
                .fullName("Student Vali")
                .studentIdNumber("STU-B-02")
                .gradeLevel("9-sinf")
                .status("Faol")
                .studyGroup(groupB)
                .mentor(mentorB)
                .branchLocation("IT Park Yangiariq")
                .build());

        // Rooms
        roomRepository.save(Room.builder()
                .name("IT Lab 1 — Web Full-Stack")
                .branchLocation("IT Park Yangiariq")
                .capacity(24)
                .build());

        // Scheduled sessions
        LocalDate today = LocalDate.now();
        LessonSession sessionA = lessonSessionRepository.save(LessonSession.builder()
                .group(groupA)
                .mentor(mentorA)
                .room("IT Lab 1")
                .subject("HTML & CSS")
                .lessonDate(today)
                .startTime("14:00")
                .endTime("15:20")
                .status("SCHEDULED")
                .build());

        // Attendance
        attendanceRecordRepository.save(AttendanceRecord.builder()
                .lessonSession(sessionA)
                .student(studentA)
                .status("PRESENT")
                .build());

        // Assignment & Submission
        Assignment assignmentA = assignmentRepository.save(Assignment.builder()
                .title("Responsive Navbar")
                .subject("Web Development")
                .groupId(groupA.getId())
                .mentorId(mentorA.getId())
                .deadline(LocalDateTime.now().plusDays(2))
                .isActive(true)
                .maxPoints(100)
                .build());

        assignmentSubmissionRepository.save(AssignmentSubmission.builder()
                .assignmentId(assignmentA.getId())
                .studentId(studentA.getId())
                .status("PENDING")
                .submittedAt(LocalDateTime.now().minusHours(2))
                .build());

        // JWT tokens
        tokenAdmin = jwtTokenProvider.generateAccessToken(adminUser);
        tokenMentorA = jwtTokenProvider.generateAccessToken(mentorUserA);
        tokenMentorB = jwtTokenProvider.generateAccessToken(mentorUserB);
        tokenStudentA = jwtTokenProvider.generateAccessToken(studentUserA);
        tokenStudentB = jwtTokenProvider.generateAccessToken(studentUserB);
        tokenNoProfileStudent = jwtTokenProvider.generateAccessToken(studentWithoutProfile);
    }

    // --- Authentication Enforcement ---

    @Test
    @DisplayName("Admin dashboard endpoint returns 401 when unauthenticated")
    void adminDashboard_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/admin"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Mentor dashboard endpoint returns 401 when unauthenticated")
    void mentorDashboard_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/mentor"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Student dashboard endpoint returns 401 when unauthenticated")
    void studentDashboard_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/student"))
                .andExpect(status().isUnauthorized());
    }

    // --- Role-Based Boundary Enforcement ---

    @Test
    @DisplayName("Student cannot access admin dashboard (403 Forbidden)")
    void adminDashboard_calledByStudent_returns403() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/admin")
                        .header("Authorization", "Bearer " + tokenStudentA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Mentor cannot access admin dashboard (403 Forbidden)")
    void adminDashboard_calledByMentor_returns403() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/admin")
                        .header("Authorization", "Bearer " + tokenMentorA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Student cannot access mentor dashboard (403 Forbidden)")
    void mentorDashboard_calledByStudent_returns403() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/mentor")
                        .header("Authorization", "Bearer " + tokenStudentA))
                .andExpect(status().isForbidden());
    }

    // --- Admin Dashboard Integration ---

    @Test
    @DisplayName("Admin retrieves full operational dashboard with real attendance and room occupancies")
    void adminDashboard_calledByAdmin_returnsRealMetrics() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/admin")
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalActiveStudents", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.totalMentors", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.totalGroups", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.weeklyAttendance", hasSize(6)))
                .andExpect(jsonPath("$.weeklyAttendance[0].day", notNullValue()))
                .andExpect(jsonPath("$.roomOccupancy", not(empty())))
                .andExpect(jsonPath("$.roomOccupancy[0].name", containsString("IT Lab 1")))
                .andExpect(jsonPath("$.enrollmentByGrade['8-sinf']", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.systemTrend", notNullValue()));
    }

    // --- Mentor Dashboard Integration ---

    @Test
    @DisplayName("Mentor A retrieves scoped dashboard with today's lessons, attendance, and pending reviews")
    void mentorDashboard_calledByMentorA_returnsScopedData() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/mentor")
                        .header("Authorization", "Bearer " + tokenMentorA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mentorId", equalTo(mentorA.getId().intValue())))
                .andExpect(jsonPath("$.mentorName", equalTo("Mentor Aziz")))
                .andExpect(jsonPath("$.assignedGroupsCount", equalTo(1)))
                .andExpect(jsonPath("$.assignedStudentsCount", equalTo(1)))
                .andExpect(jsonPath("$.todayLessons", hasSize(1)))
                .andExpect(jsonPath("$.todayLessons[0].groupCode", equalTo("GRP-A")))
                .andExpect(jsonPath("$.pendingReviews", hasSize(1)))
                .andExpect(jsonPath("$.pendingReviews[0].studentName", equalTo("Student Ali")));
    }

    @Test
    @DisplayName("Mentor B sees their own empty queue, not Mentor A's pending reviews")
    void mentorDashboard_calledByMentorB_doesNotLeakMentorAData() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/mentor")
                        .header("Authorization", "Bearer " + tokenMentorB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mentorId", equalTo(mentorB.getId().intValue())))
                .andExpect(jsonPath("$.mentorName", equalTo("Mentor Bobur")))
                .andExpect(jsonPath("$.todayLessons", hasSize(0)))
                .andExpect(jsonPath("$.pendingReviews", hasSize(0)));
    }

    @Test
    @DisplayName("Mentor A cannot query Mentor B's individual activity report (403 Forbidden)")
    void mentorActivity_crossMentorIdor_returns403() throws Exception {
        mockMvc.perform(get("/api/analytics/mentor/" + mentorB.getId())
                        .header("Authorization", "Bearer " + tokenMentorA))
                .andExpect(status().isForbidden());
    }

    // --- Student Dashboard Integration ---

    @Test
    @DisplayName("Student A retrieves their own real dashboard metrics, today's lesson, and active tasks")
    void studentDashboard_calledByStudentA_returnsPersonalData() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/student")
                        .header("Authorization", "Bearer " + tokenStudentA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId", equalTo(studentA.getId().intValue())))
                .andExpect(jsonPath("$.studentName", equalTo("Student Ali")))
                .andExpect(jsonPath("$.groupCode", equalTo("GRP-A")))
                .andExpect(jsonPath("$.mentorName", equalTo("Mentor Aziz")))
                .andExpect(jsonPath("$.todayLesson.subject", equalTo("HTML & CSS")))
                .andExpect(jsonPath("$.activeTasks", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.activeTasks[0].title", equalTo("Responsive Navbar")))
                .andExpect(jsonPath("$.level", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.totalPoints", greaterThanOrEqualTo(0)));
    }

    @Test
    @DisplayName("Student without linked profile receives controlled 404 response")
    void studentDashboard_orphanStudent_returns404() throws Exception {
        mockMvc.perform(get("/api/analytics/dashboard/student")
                        .header("Authorization", "Bearer " + tokenNoProfileStudent))
                .andExpect(status().isNotFound());
    }
}
