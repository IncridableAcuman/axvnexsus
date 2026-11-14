package uz.axm.nexus.scheduling.presentation;

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
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.branches.infrastructure.BranchRepository;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.application.ManualScheduleRequest;
import uz.axm.nexus.scheduling.domain.AttendanceRecord;
import uz.axm.nexus.scheduling.domain.LessonSession;
import uz.axm.nexus.scheduling.domain.Schedule;
import uz.axm.nexus.scheduling.infrastructure.AttendanceRecordRepository;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.scheduling.infrastructure.ScheduleRepository;
import uz.axm.nexus.users.application.StudentDto;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ScheduleManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private MentorRepository mentorRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private LessonSessionRepository lessonSessionRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    private Branch branchYangiariq;
    private Branch branchUrgench;

    @BeforeEach
    void setUp() {
        branchYangiariq = branchRepository.findByCodeIgnoreCase("ITP-YANGIARIQ")
                .orElseGet(() -> branchRepository.save(Branch.builder()
                        .name("IT Park Yangiariq filiali")
                        .code("ITP-YANGIARIQ")
                        .region("Xorazm")
                        .status("ACTIVE")
                        .build()));

        branchUrgench = branchRepository.findByCodeIgnoreCase("ITP-URGENCH")
                .orElseGet(() -> branchRepository.save(Branch.builder()
                        .name("Urganch IT Akademiya")
                        .code("ITP-URGENCH")
                        .region("Xorazm")
                        .status("ACTIVE")
                        .build()));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("1. Odd-day pattern schedule creation resolves to Monday, Wednesday, Friday")
    void shouldCreateOddDaySchedule() throws Exception {
        ManualScheduleRequest request = ManualScheduleRequest.builder()
                .mentorName("Abdurasharipov Izzatbek")
                .mentorRole("IT mentor")
                .groupCode("GRP-ODD-01")
                .gradeLevel("8-sinf")
                .subject("Web Full-Stack Development")
                .dayPattern("ODD_DAYS")
                .startTime("14:00")
                .endTime("15:30")
                .room("IT Lab 101")
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.days", containsString("Dushanba, Chorshanba, Juma")))
                .andExpect(jsonPath("$.dayPattern", is("ODD_DAYS")))
                .andExpect(jsonPath("$.startTime", is("14:00")))
                .andExpect(jsonPath("$.endTime", is("15:30")));

        List<Schedule> list = scheduleRepository.findAll();
        assertThat(list).anyMatch(s -> "GRP-ODD-01".equals(s.getStudyGroup().getGroupCode())
                && "ODD_DAYS".equals(s.getDayPattern())
                && s.getDays().contains("Dushanba"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("2. Even-day schedule creation in the SAME room/time succeeds without conflict")
    void shouldAllowEvenDayScheduleInSameRoomAndSameTime() throws Exception {
        // Step 1: Create Odd Day Schedule (Mon, Wed, Fri) 15:00-16:30 in IT Lab 202
        ManualScheduleRequest oddReq = ManualScheduleRequest.builder()
                .mentorName("Odd Day Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-ODD-202")
                .gradeLevel("8-sinf")
                .subject("Frontend Vue")
                .dayPattern("ODD_DAYS")
                .startTime("15:00")
                .endTime("16:30")
                .room("IT Lab 202")
                .branchLocation("IT Park Yangiariq filiali")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(oddReq)))
                .andExpect(status().isOk());

        // Step 2: Create Even Day Schedule (Tue, Thu, Sat) 15:00-16:30 in the EXACT SAME ROOM
        ManualScheduleRequest evenReq = ManualScheduleRequest.builder()
                .mentorName("Even Day Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-EVEN-202")
                .gradeLevel("9-sinf")
                .subject("Backend Java")
                .dayPattern("EVEN_DAYS")
                .startTime("15:00")
                .endTime("16:30")
                .room("IT Lab 202")
                .branchLocation("IT Park Yangiariq filiali")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(evenReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dayPattern", is("EVEN_DAYS")))
                .andExpect(jsonPath("$.days", containsString("Seshanba, Payshanba, Shanba")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("3. All-six-day pattern resolves to all six weekdays")
    void shouldCreateAllSixDaysSchedule() throws Exception {
        ManualScheduleRequest request = ManualScheduleRequest.builder()
                .mentorName("Intensive Mentor")
                .mentorRole("Bosh mentor")
                .groupCode("GRP-INTENSIVE-6")
                .gradeLevel("10-sinf")
                .subject("Algorithms & Olympiad Math")
                .dayPattern("ALL_SIX_DAYS")
                .startTime("09:00")
                .endTime("10:30")
                .room("Room 303")
                .branchLocation("IT Park Yangiariq filiali")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dayPattern", is("ALL_SIX_DAYS")))
                .andExpect(jsonPath("$.days", containsString("Dushanba, Seshanba, Chorshanba, Payshanba, Juma, Shanba")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("4. Custom pattern resolves to exactly selected weekdays")
    void shouldCreateCustomDaySchedule() throws Exception {
        ManualScheduleRequest request = ManualScheduleRequest.builder()
                .mentorName("Custom Mentor")
                .mentorRole("Ingliz tili mentor")
                .groupCode("GRP-CUSTOM-ENG")
                .gradeLevel("8-sinf")
                .subject("Technical English")
                .dayPattern("CUSTOM")
                .selectedDays(List.of("Dushanba", "Payshanba"))
                .startTime("11:00")
                .endTime("12:30")
                .room("Room 105")
                .branchLocation("IT Park Yangiariq filiali")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dayPattern", is("CUSTOM")))
                .andExpect(jsonPath("$.days", is("Dushanba, Payshanba")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("5. Empty custom selection is rejected")
    void shouldRejectEmptyCustomSelection() throws Exception {
        ManualScheduleRequest request = ManualScheduleRequest.builder()
                .mentorName("Invalid Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-EMPTY")
                .gradeLevel("8-sinf")
                .subject("Math")
                .dayPattern("CUSTOM")
                .selectedDays(List.of())
                .startTime("11:00")
                .endTime("12:30")
                .room("Room 105")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("kamida bitta dars kuni")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("6. Unsupported Sunday selection is rejected")
    void shouldRejectSundaySelection() throws Exception {
        ManualScheduleRequest request = ManualScheduleRequest.builder()
                .mentorName("Sunday Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-SUN")
                .gradeLevel("8-sinf")
                .subject("Science")
                .dayPattern("CUSTOM")
                .selectedDays(List.of("Yakshanba", "Dushanba"))
                .startTime("11:00")
                .endTime("12:30")
                .room("Room 105")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Yakshanba 6 kunlik akademik haftaga kirmaydi")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("7. Mentor conflict is detected on overlapping weekday and time")
    void shouldDetectMentorConflict() throws Exception {
        // Step 1: Assign Mentor A to Group 1 on ODD_DAYS (Mon, Wed, Fri) 14:00-15:30
        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .mentorName("Rustam Toshmatov")
                .mentorRole("IT mentor")
                .groupCode("GRP-RT-01")
                .gradeLevel("8-sinf")
                .subject("React")
                .dayPattern("ODD_DAYS")
                .startTime("14:00")
                .endTime("15:30")
                .room("Lab A")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        // Step 2: Attempt to assign same Mentor A to Group 2 on ALL_SIX_DAYS (includes Mon, Wed, Fri) 14:30-16:00
        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .mentorName("Rustam Toshmatov")
                .mentorRole("IT mentor")
                .groupCode("GRP-RT-02")
                .gradeLevel("9-sinf")
                .subject("Node.js")
                .dayPattern("ALL_SIX_DAYS")
                .startTime("14:30")
                .endTime("16:00")
                .room("Lab B")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Mentor (Rustam Toshmatov) uchun")))
                .andExpect(jsonPath("$.message", containsString("Conflict")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("8. Classroom conflict is detected on overlapping weekday and time")
    void shouldDetectClassroomConflict() throws Exception {
        // Step 1: Lab C booked for Group X on ODD_DAYS 10:00-11:30
        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .mentorName("Mentor One")
                .mentorRole("IT mentor")
                .groupCode("GRP-X")
                .gradeLevel("8-sinf")
                .subject("Python")
                .dayPattern("ODD_DAYS")
                .startTime("10:00")
                .endTime("11:30")
                .room("Lab C")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        // Step 2: Try to book Lab C for Group Y on CUSTOM (Dushanba) 10:30-12:00
        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .mentorName("Mentor Two")
                .mentorRole("IT mentor")
                .groupCode("GRP-Y")
                .gradeLevel("9-sinf")
                .subject("Golang")
                .dayPattern("CUSTOM")
                .selectedDays(List.of("Dushanba"))
                .startTime("10:30")
                .endTime("12:00")
                .room("Lab C")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Xona (Lab C) Dushanba kuni band")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("9. Group conflict is detected on overlapping weekday and time")
    void shouldDetectGroupConflict() throws Exception {
        // Step 1: Group Z scheduled for Math on EVEN_DAYS 16:00-17:30
        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .mentorName("Math Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-Z")
                .gradeLevel("10-sinf")
                .subject("Discrete Mathematics")
                .dayPattern("EVEN_DAYS")
                .startTime("16:00")
                .endTime("17:30")
                .room("Room 201")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        // Step 2: Try to schedule Group Z for English on EVEN_DAYS 16:30-18:00
        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .mentorName("English Mentor")
                .mentorRole("Ingliz tili mentor")
                .groupCode("GRP-Z")
                .gradeLevel("10-sinf")
                .subject("English")
                .dayPattern("EVEN_DAYS")
                .startTime("16:30")
                .endTime("18:00")
                .room("Room 202")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Guruh (GRP-Z) uchun")))
                .andExpect(jsonPath("$.message", containsString("boshqa dars mavjud")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("10. Time validation rejects start time later than or equal to end time")
    void shouldRejectInvalidTimeRange() throws Exception {
        ManualScheduleRequest request = ManualScheduleRequest.builder()
                .mentorName("Timer Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-TIME-ERR")
                .gradeLevel("8-sinf")
                .subject("Web")
                .dayPattern("ODD_DAYS")
                .startTime("16:30")
                .endTime("15:00")
                .room("IT Lab 1")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("kechroq bo'lishi kerak")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("11. Existing schedule APIs continue working (GET list, GET by ID, DELETE)")
    void shouldSupportExistingScheduleApis() throws Exception {
        // Create a schedule
        ManualScheduleRequest request = ManualScheduleRequest.builder()
                .mentorName("API Test Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-API-01")
                .gradeLevel("11-sinf")
                .subject("Cloud DevOps")
                .dayPattern("ODD_DAYS")
                .startTime("08:00")
                .endTime("09:30")
                .room("Cloud Lab")
                .build();

        String response = mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule created = objectMapper.readValue(response, Schedule.class);
        Long id = created.getId();

        // GET all
        mockMvc.perform(get("/api/schedules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())));

        // GET by gradeLevel
        mockMvc.perform(get("/api/schedules?gradeLevel=11-sinf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").exists());

        // GET by ID
        mockMvc.perform(get("/api/schedules/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(id.intValue())))
                .andExpect(jsonPath("$.subject", is("Cloud DevOps")));

        // DELETE by ID
        mockMvc.perform(delete("/api/schedules/" + id))
                .andExpect(status().isNoContent());

        assertThat(scheduleRepository.findById(id)).isEmpty();
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("12. Schedule update (PUT) switches pattern from ODD_DAYS to EVEN_DAYS")
    void shouldUpdateSchedulePattern() throws Exception {
        // Create initial ODD_DAYS schedule
        ManualScheduleRequest createReq = ManualScheduleRequest.builder()
                .mentorName("Switching Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-SWITCH")
                .gradeLevel("8-sinf")
                .subject("Cybersecurity")
                .dayPattern("ODD_DAYS")
                .startTime("17:00")
                .endTime("18:30")
                .room("Security Lab")
                .build();

        String res = mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule created = objectMapper.readValue(res, Schedule.class);

        // Update to EVEN_DAYS
        ManualScheduleRequest updateReq = ManualScheduleRequest.builder()
                .mentorName("Switching Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-SWITCH")
                .gradeLevel("8-sinf")
                .subject("Cybersecurity Advanced")
                .dayPattern("EVEN_DAYS")
                .startTime("17:00")
                .endTime("18:30")
                .room("Security Lab")
                .build();

        mockMvc.perform(put("/api/schedules/" + created.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(created.getId().intValue())))
                .andExpect(jsonPath("$.dayPattern", is("EVEN_DAYS")))
                .andExpect(jsonPath("$.days", containsString("Seshanba, Payshanba, Shanba")))
                .andExpect(jsonPath("$.subject", is("Cybersecurity Advanced")));
    }

    @Test
    @WithMockUser(username = "restricted_mentor", roles = {"MENTOR"})
    @DisplayName("13. Unauthorized cross-branch assignment is rejected for restricted mentor")
    void shouldRejectUnauthorizedBranchAssignment() throws Exception {
        // Link restricted_mentor user to Yangiariq branch mentor profile
        User mentorUser = userRepository.save(User.builder()
                .username("restricted_mentor")
                .password("encoded_pass")
                .fullName("Restricted Mentor User")
                .email("restricted@axm.uz")
                .role("ROLE_MENTOR")
                .enabled(true)
                .build());

        mentorRepository.save(Mentor.builder()
                .user(mentorUser)
                .fullName("Yangiariq Exclusive Mentor")
                .role("IT mentor")
                .branch(branchYangiariq)
                .branchLocation("IT Park Yangiariq filiali")
                .build());

        // Try to create schedule for Urganch branch
        ManualScheduleRequest crossBranchReq = ManualScheduleRequest.builder()
                .mentorName("Yangiariq Exclusive Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-CROSS-BRANCH")
                .gradeLevel("8-sinf")
                .subject("Web")
                .dayPattern("ODD_DAYS")
                .startTime("13:00")
                .endTime("14:30")
                .room("Room 1")
                .branchId(branchUrgench.getId())
                .branchLocation("Urganch IT Akademiya")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(crossBranchReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("boshqa filial")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("14. Existing historical attendance and lesson records are preserved when schedule is deleted")
    void shouldPreserveHistoricalAttendanceWhenScheduleDeleted() throws Exception {
        // 1. Create a schedule
        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("History Mentor")
                .mentorRole("IT mentor")
                .groupCode("GRP-HIST")
                .gradeLevel("9-sinf")
                .subject("Data Science")
                .dayPattern("ODD_DAYS")
                .startTime("14:00")
                .endTime("15:30")
                .room("Lab Hist")
                .build();

        String res = mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);
        StudyGroup group = studyGroupRepository.findByGroupCodeIgnoreCase("GRP-HIST").orElseThrow();
        Mentor mentor = mentorRepository.findByFullNameIgnoreCase("History Mentor").orElseThrow();

        // 2. Create student, historical lesson session, and attendance record
        Student student = studentRepository.save(Student.builder()
                .fullName("Alisher Navoiy")
                .studentIdNumber("STU-HIST-01")
                .status("ACTIVE")
                .studyGroup(group)
                .mentor(mentor)
                .build());

        LessonSession session = lessonSessionRepository.save(LessonSession.builder()
                .schedule(schedule)
                .group(group)
                .mentor(mentor)
                .subject("Data Science")
                .topic("Pandas Basics")
                .lessonDate(LocalDate.now().minusDays(3))
                .startTime("14:00")
                .endTime("15:30")
                .status("COMPLETED")
                .build());

        AttendanceRecord attendance = attendanceRecordRepository.save(AttendanceRecord.builder()
                .lessonSession(session)
                .student(student)
                .status("PRESENT")
                .recordedBy("History Mentor")
                .recordedAt(LocalDateTime.now().minusDays(3))
                .build());

        // 3. Delete the recurring schedule
        mockMvc.perform(delete("/api/schedules/" + schedule.getId()))
                .andExpect(status().isNoContent());

        // 4. Assert schedule is gone, but LessonSession and AttendanceRecord STILL EXIST and are COMPLETED!
        assertThat(scheduleRepository.findById(schedule.getId())).isEmpty();

        LessonSession retainedSession = lessonSessionRepository.findById(session.getId()).orElseThrow();
        assertThat(retainedSession.getStatus()).isEqualTo("COMPLETED");
        assertThat(retainedSession.getTopic()).isEqualTo("Pandas Basics");

        AttendanceRecord retainedAttendance = attendanceRecordRepository.findById(attendance.getId()).orElseThrow();
        assertThat(retainedAttendance.getStatus()).isEqualTo("PRESENT");
        assertThat(retainedAttendance.getStudent().getFullName()).isEqualTo("Alisher Navoiy");
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("15. Structured Conflict Response contains code SCHEDULE_CONFLICT and details array")
    void shouldReturnStructuredConflictResponse() throws Exception {
        // Step 1: Create a recurring schedule for Lab Z on ODD_DAYS 09:00 - 10:30
        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .mentorName("Mentor Conflict Test")
                .mentorRole("IT mentor")
                .groupCode("GRP-CONF-01")
                .gradeLevel("8-sinf")
                .subject("Structured Conflict 101")
                .dayPattern("ODD_DAYS")
                .startTime("09:00")
                .endTime("10:30")
                .room("Lab Alpha")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        // Step 2: Attempt conflicting schedule in same room on Mon, Wed, Fri
        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .mentorName("Mentor Another")
                .mentorRole("IT mentor")
                .groupCode("GRP-CONF-02")
                .gradeLevel("9-sinf")
                .subject("Structured Conflict 102")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .room("Lab Alpha")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SCHEDULE_CONFLICT"))
                .andExpect(jsonPath("$.conflicts", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.conflicts[0].type").value("CLASSROOM"))
                .andExpect(jsonPath("$.conflicts[0].resourceName").value("Lab Alpha"))
                .andExpect(jsonPath("$.conflicts[0].existingGroupCode").value("GRP-CONF-01"))
                .andExpect(jsonPath("$.conflicts[0].startTime").value("09:00"))
                .andExpect(jsonPath("$.conflicts[0].endTime").value("10:30"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("16. Virtual Calendar Projection expands recurring schedule into November 2026 without persistent DB rows")
    void shouldProjectRecurringScheduleIntoFutureCalendarWithoutDatabaseBloat() throws Exception {
        long initialDbRows = lessonSessionRepository.count();

        // 1. Create recurring schedule for group on ODD_DAYS (Mon, Wed, Fri) 15:00-16:30
        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Virtual Projector")
                .mentorRole("IT mentor")
                .groupCode("GRP-PROJ-2026")
                .gradeLevel("10-sinf")
                .subject("Web Full-Stack Development")
                .dayPattern("ODD_DAYS")
                .startTime("15:00")
                .endTime("16:30")
                .room("Lab Virtual")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // 2. Query sessions for entire month of November 2026
        LocalDate start = LocalDate.of(2026, 11, 1);
        LocalDate end = LocalDate.of(2026, 11, 30);

        mockMvc.perform(get("/api/lessons")
                        .param("startDate", start.toString())
                        .param("endDate", end.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(10))))
                // Verify November 2026 dates exist (e.g. 2026-11-02 was a Monday, 2026-11-04 Wednesday, 2026-11-06 Friday)
                .andExpect(jsonPath("$.data[?(@.groupCode == 'GRP-PROJ-2026')]", hasSize(greaterThanOrEqualTo(10))))
                .andExpect(jsonPath("$.data[?(@.groupCode == 'GRP-PROJ-2026')].lessonDate", hasItem("2026-11-02")))
                .andExpect(jsonPath("$.data[?(@.groupCode == 'GRP-PROJ-2026')].startTime", hasItem("15:00")));

        // 3. Crucial Assertion: Persistent DB rows did NOT bloat with November 2026 rows!
        long postQueryDbRows = lessonSessionRepository.count();
        assertThat(postQueryDbRows).isEqualTo(initialDbRows);
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("17. Admin overview endpoint accessible at both /api/admin/overview and /api/v1/admin/overview")
    void shouldAccessAdminOverviewViaBothEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/v1/admin/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
