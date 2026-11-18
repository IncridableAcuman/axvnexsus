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
import uz.axm.nexus.scheduling.application.*;
import uz.axm.nexus.scheduling.domain.*;
import uz.axm.nexus.scheduling.infrastructure.*;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.time.DayOfWeek;
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
class Module02RecurringScheduleIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private LessonSessionRepository lessonSessionRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private AcademicHolidayRepository academicHolidayRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private MentorRepository mentorRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RecurringScheduleGenerator recurringScheduleGenerator;

    private Branch branchYangiariq;
    private Branch branchUrgench;
    private TimeSlot shiftMorning;
    private TimeSlot shiftAfternoon;

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

        shiftMorning = timeSlotRepository.findByStartTimeAndEndTime("09:30", "11:00")
                .orElseGet(() -> timeSlotRepository.save(TimeSlot.builder()
                        .name("Shift 1: Ertalabki smena")
                        .startTime("09:30")
                        .endTime("11:00")
                        .durationMinutes(90)
                        .active(true)
                        .displayOrder(1)
                        .build()));

        shiftAfternoon = timeSlotRepository.findByStartTimeAndEndTime("15:00", "16:30")
                .orElseGet(() -> timeSlotRepository.save(TimeSlot.builder()
                        .name("Shift 2: Tushdan keyingi smena")
                        .startTime("15:00")
                        .endTime("16:30")
                        .durationMinutes(90)
                        .active(true)
                        .displayOrder(2)
                        .build()));
    }

    // 1. Odd weekday date generation
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("1. Odd weekday date generation: generates Monday, Wednesday, Friday sessions")
    void testOddWeekdayDateGeneration() throws Exception {
        LocalDate start = LocalDate.of(2026, 11, 2); // Monday
        LocalDate end = LocalDate.of(2026, 11, 8);   // Sunday

        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Odd Mentor")
                .groupCode("GRP-M02-ODD")
                .gradeLevel("8-sinf")
                .subject("Computer Science")
                .dayPattern("ODD_DAYS")
                .shiftId(shiftMorning.getId())
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        String res = mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);
        List<LessonSession> sessions = lessonSessionRepository.findByScheduleId(schedule.getId());

        // Mon Nov 2, Wed Nov 4, Fri Nov 6 -> Exactly 3 sessions
        assertThat(sessions).hasSize(3);
        assertThat(sessions).extracting(LessonSession::getLessonDate)
                .containsExactlyInAnyOrder(
                        LocalDate.of(2026, 11, 2),
                        LocalDate.of(2026, 11, 4),
                        LocalDate.of(2026, 11, 6)
                );
    }

    // 2. Even weekday date generation
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("2. Even weekday date generation: generates Tuesday, Thursday, Saturday sessions")
    void testEvenWeekdayDateGeneration() throws Exception {
        LocalDate start = LocalDate.of(2026, 11, 2); // Monday
        LocalDate end = LocalDate.of(2026, 11, 8);   // Sunday

        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Even Mentor")
                .groupCode("GRP-M02-EVEN")
                .gradeLevel("8-sinf")
                .subject("Web Development")
                .dayPattern("EVEN_DAYS")
                .shiftId(shiftAfternoon.getId())
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        String res = mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);
        List<LessonSession> sessions = lessonSessionRepository.findByScheduleId(schedule.getId());

        // Tue Nov 3, Thu Nov 5, Sat Nov 7 -> Exactly 3 sessions
        assertThat(sessions).hasSize(3);
        assertThat(sessions).extracting(LessonSession::getLessonDate)
                .containsExactlyInAnyOrder(
                        LocalDate.of(2026, 11, 3),
                        LocalDate.of(2026, 11, 5),
                        LocalDate.of(2026, 11, 7)
                );
    }

    // 3. All-six-day generation
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("3. All-six-day generation: Monday through Saturday, excluding Sunday")
    void testAllSixDaysGeneration() throws Exception {
        LocalDate start = LocalDate.of(2026, 11, 2); // Monday
        LocalDate end = LocalDate.of(2026, 11, 8);   // Sunday

        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Intensive Mentor")
                .groupCode("GRP-M02-ALL6")
                .gradeLevel("9-sinf")
                .subject("Algorithms")
                .dayPattern("ALL_SIX_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        String res = mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);
        List<LessonSession> sessions = lessonSessionRepository.findByScheduleId(schedule.getId());

        assertThat(sessions).hasSize(6);
        for (LessonSession s : sessions) {
            assertThat(s.getLessonDate().getDayOfWeek()).isNotEqualTo(DayOfWeek.SUNDAY);
        }
    }

    // 4. Custom weekday generation
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("4. Custom weekday generation: only admin-selected days")
    void testCustomWeekdayGeneration() throws Exception {
        LocalDate start = LocalDate.of(2026, 11, 2);
        LocalDate end = LocalDate.of(2026, 11, 8);

        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Custom Mentor")
                .groupCode("GRP-M02-CUSTOM")
                .gradeLevel("8-sinf")
                .subject("Python AI")
                .dayPattern("CUSTOM")
                .selectedDays(List.of("Dushanba", "Payshanba"))
                .startTime("15:00")
                .endTime("16:30")
                .room("Lab Custom 404")
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        String res = mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);
        List<LessonSession> sessions = lessonSessionRepository.findByScheduleId(schedule.getId());

        assertThat(sessions).hasSize(2);
        assertThat(sessions).extracting(s -> s.getLessonDate().getDayOfWeek())
                .containsExactlyInAnyOrder(DayOfWeek.MONDAY, DayOfWeek.THURSDAY);
    }

    // 5. Sunday rejection
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("5. Sunday rejection: selection of Sunday is strictly rejected")
    void testSundayRejection() throws Exception {
        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Sunday Mentor")
                .groupCode("GRP-M02-SUN")
                .gradeLevel("8-sinf")
                .subject("Art")
                .dayPattern("CUSTOM")
                .selectedDays(List.of("Yakshanba"))
                .startTime("09:30")
                .endTime("11:00")
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Yakshanba")));
    }

    // 6. Date-range boundaries
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("6. Date-range boundaries: startDate > endDate is rejected")
    void testDateRangeBoundaries() throws Exception {
        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Boundary Mentor")
                .groupCode("GRP-M02-BOUND")
                .gradeLevel("8-sinf")
                .subject("Physics")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .startDate(LocalDate.of(2027, 5, 1))
                .endDate(LocalDate.of(2026, 11, 1)) // Earlier than start!
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Boshlanish sanasi")));
    }

    // 7. Invalid time rejection
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("7. Invalid time rejection: startTime >= endTime (e.g. 15:00-14:30) is rejected")
    void testInvalidTimeRejection() throws Exception {
        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Time Mentor")
                .groupCode("GRP-M02-TIME")
                .gradeLevel("8-sinf")
                .subject("Math")
                .dayPattern("ODD_DAYS")
                .startTime("15:00")
                .endTime("14:30") // Invalid!
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("kechroq")));
    }

    // 8. Shift configuration
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("8. Shift configuration: selecting shift auto-configures start and end time")
    void testShiftConfiguration() throws Exception {
        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Shift Mentor")
                .groupCode("GRP-M02-SHIFT")
                .gradeLevel("8-sinf")
                .subject("Computer Science")
                .dayPattern("ODD_DAYS")
                .shiftId(shiftMorning.getId())
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startTime").value("09:30"))
                .andExpect(jsonPath("$.endTime").value("11:00"))
                .andExpect(jsonPath("$.timeSlot.id").value(shiftMorning.getId()));
    }

    // 9. Duplicate generation prevention
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("9. Duplicate generation prevention: calling generation multiple times is idempotent")
    void testDuplicateGenerationPrevention() throws Exception {
        LocalDate start = LocalDate.of(2026, 11, 2);
        LocalDate end = LocalDate.of(2026, 11, 8);

        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Idempotent Mentor")
                .groupCode("GRP-M02-IDEM")
                .gradeLevel("8-sinf")
                .subject("CS")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        String res = mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);
        long count1 = lessonSessionRepository.findByScheduleId(schedule.getId()).size();
        assertThat(count1).isEqualTo(3);

        // Regenerate for the exact same date range
        mockMvc.perform(post("/api/schedules/" + schedule.getId() + "/generate")
                        .param("startDate", start.toString())
                        .param("endDate", end.toString()))
                .andExpect(status().isOk());

        long count2 = lessonSessionRepository.findByScheduleId(schedule.getId()).size();
        assertThat(count2).isEqualTo(3); // No duplicate sessions created!
    }

    // 10. Mentor conflict detection on concrete date
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("10. Mentor conflict detection: double-booking mentor at same date/time returns conflict")
    void testMentorConflictDetection() throws Exception {
        LocalDate start = LocalDate.of(2026, 11, 2);
        LocalDate end = LocalDate.of(2026, 11, 8);

        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .mentorName("Busy Mentor")
                .groupCode("GRP-M02-M1")
                .gradeLevel("8-sinf")
                .subject("CS 1")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .room("Room 1")
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .mentorName("Busy Mentor") // Same mentor!
                .groupCode("GRP-M02-M2")
                .gradeLevel("9-sinf")
                .subject("CS 2")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00") // Same time!
                .room("Room 2") // Different room
                .startDate(start)
                .endDate(end)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SCHEDULE_CONFLICT"))
                .andExpect(jsonPath("$.conflicts[0].type").value("MENTOR"));
    }

    // 11. Classroom conflict detection on concrete date
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("11. Classroom conflict detection: double-booking classroom at same date/time returns conflict")
    void testClassroomConflictDetection() throws Exception {
        LocalDate start = LocalDate.of(2026, 11, 2);
        LocalDate end = LocalDate.of(2026, 11, 8);

        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .mentorName("Room Mentor 1")
                .groupCode("GRP-M02-R1")
                .gradeLevel("8-sinf")
                .subject("CS")
                .dayPattern("ODD_DAYS")
                .startTime("15:00")
                .endTime("16:30")
                .room("Shared Lab")
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .mentorName("Room Mentor 2") // Different mentor
                .groupCode("GRP-M02-R2")
                .gradeLevel("9-sinf")
                .subject("Web")
                .dayPattern("ODD_DAYS")
                .startTime("15:30") // Overlapping 15:00-16:30!
                .endTime("17:00")
                .room("Shared Lab") // Same room!
                .startDate(start)
                .endDate(end)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SCHEDULE_CONFLICT"))
                .andExpect(jsonPath("$.conflicts[0].type").value("CLASSROOM"));
    }

    // 12. Group conflict detection on concrete date
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("12. Group conflict detection: scheduling group for two lessons at same time is rejected")
    void testGroupConflictDetection() throws Exception {
        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .mentorName("Group Mentor 1")
                .groupCode("GRP-SAME")
                .gradeLevel("8-sinf")
                .subject("Math")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .room("Lab Unique Conflict 1")
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .mentorName("Group Mentor 2")
                .groupCode("GRP-SAME") // Same group!
                .gradeLevel("8-sinf")
                .subject("Physics")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .room("Lab Unique Conflict 2")
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SCHEDULE_CONFLICT"))
                .andExpect(jsonPath("$.conflicts[0].type").value("GROUP"));
    }

    // 13. Branch authorization
    @Test
    @WithMockUser(username = "mentorYangiariq", roles = {"MENTOR"})
    @DisplayName("13. Branch authorization: mentor from Yangiariq cannot create schedule for Urganch")
    void testBranchAuthorization() throws Exception {
        User user = userRepository.save(User.builder()
                .username("mentorYangiariq")
                .fullName("Mentor Yangiariq")
                .email("yangiariq_mentor@axm.uz")
                .password("hash")
                .role("ROLE_MENTOR")
                .build());

        mentorRepository.save(Mentor.builder()
                .user(user)
                .fullName("Mentor Yangiariq")
                .role("IT mentor")
                .branch(branchYangiariq)
                .branchLocation(branchYangiariq.getName())
                .status("ACTIVE")
                .build());

        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("Mentor Yangiariq")
                .groupCode("GRP-CROSS-BRANCH")
                .gradeLevel("8-sinf")
                .subject("CS")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .branchId(branchUrgench.getId()) // Different branch!
                .branchLocation(branchUrgench.getName())
                .build();

        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("boshqa filial")));
    }

    // 14. Recurring schedule editing with scope
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("14. Recurring schedule editing: updates future sessions while preserving historical completed")
    void testRecurringScheduleEditing() throws Exception {
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusWeeks(2);

        ManualScheduleRequest createReq = ManualScheduleRequest.builder()
                .mentorName("Editable Mentor")
                .groupCode("GRP-M02-EDIT")
                .gradeLevel("8-sinf")
                .subject("Old Subject")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .room("Lab Edit Unique 99")
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        String res = mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);

        // Edit subject and time
        ManualScheduleRequest updateReq = ManualScheduleRequest.builder()
                .mentorName("Editable Mentor")
                .groupCode("GRP-M02-EDIT")
                .gradeLevel("8-sinf")
                .subject("New Advanced Subject")
                .dayPattern("ODD_DAYS")
                .startTime("15:00")
                .endTime("16:30")
                .room("Lab Edit Unique 99")
                .startDate(start)
                .endDate(end)
                .updateScope("FUTURE_ONLY")
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(put("/api/schedules/recurring/" + schedule.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subject").value("New Advanced Subject"))
                .andExpect(jsonPath("$.startTime").value("15:00"));
    }

    // 15. Future-session regeneration
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("15. Future-session regeneration: switching days cancels old uncompleted future sessions and generates new")
    void testFutureSessionRegeneration() throws Exception {
        LocalDate today = LocalDate.now();
        LocalDate start = today;
        LocalDate end = today.plusWeeks(2);

        ManualScheduleRequest createReq = ManualScheduleRequest.builder()
                .mentorName("Regen Mentor")
                .groupCode("GRP-M02-REGEN")
                .gradeLevel("8-sinf")
                .subject("Web Full-Stack")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .startDate(start)
                .endDate(end)
                .generateSessions(true)
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        String res = mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);

        // Update schedule from ODD_DAYS to EVEN_DAYS
        ManualScheduleRequest updateReq = ManualScheduleRequest.builder()
                .mentorName("Regen Mentor")
                .groupCode("GRP-M02-REGEN")
                .gradeLevel("8-sinf")
                .subject("Web Full-Stack")
                .dayPattern("EVEN_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .startDate(start)
                .endDate(end)
                .updateScope("FUTURE_ONLY")
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        mockMvc.perform(put("/api/schedules/recurring/" + schedule.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk());

        List<LessonSession> activeSessions = lessonSessionRepository.findByScheduleId(schedule.getId()).stream()
                .filter(s -> !"CANCELLED".equalsIgnoreCase(s.getStatus()))
                .toList();

        // All active sessions should now be on Tuesday, Thursday, or Saturday!
        for (LessonSession s : activeSessions) {
            assertThat(s.getLessonDate().getDayOfWeek())
                    .isIn(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY);
        }
    }

    // 16. Historical session preservation on delete/archive
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("16. Historical session preservation: completed sessions and attendance remain intact when schedule is deleted")
    void testHistoricalSessionPreservation() throws Exception {
        ManualScheduleRequest req = ManualScheduleRequest.builder()
                .mentorName("History Keeper")
                .groupCode("GRP-M02-HIST")
                .gradeLevel("8-sinf")
                .subject("Data Science")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .branchLocation("IT Park Yangiariq filiali")
                .branchId(branchYangiariq.getId())
                .build();

        String res = mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Schedule schedule = objectMapper.readValue(res, Schedule.class);
        StudyGroup group = studyGroupRepository.findByGroupCodeIgnoreCase("GRP-M02-HIST").orElseThrow();
        Mentor mentor = mentorRepository.findByFullNameIgnoreCase("History Keeper").orElseThrow();

        Student student = studentRepository.save(Student.builder()
                .fullName("Bobur Mirzo")
                .studentIdNumber("STU-M02-HIST")
                .status("ACTIVE")
                .studyGroup(group)
                .mentor(mentor)
                .build());

        LessonSession completedSession = lessonSessionRepository.save(LessonSession.builder()
                .schedule(schedule)
                .group(group)
                .mentor(mentor)
                .subject("Data Science")
                .topic("Pandas Analysis")
                .lessonDate(LocalDate.now().minusDays(5))
                .startTime("09:30")
                .endTime("11:00")
                .status("COMPLETED")
                .build());

        AttendanceRecord record = attendanceRecordRepository.save(AttendanceRecord.builder()
                .lessonSession(completedSession)
                .student(student)
                .status("PRESENT")
                .recordedBy("History Keeper")
                .recordedAt(LocalDateTime.now().minusDays(5))
                .build());

        // Delete the schedule
        mockMvc.perform(delete("/api/schedules/recurring/" + schedule.getId()))
                .andExpect(status().isNoContent());

        // Schedule is deleted, but completed lesson session and attendance records are intact!
        assertThat(scheduleRepository.findById(schedule.getId())).isEmpty();

        LessonSession retainedSession = lessonSessionRepository.findById(completedSession.getId()).orElseThrow();
        assertThat(retainedSession.getStatus()).isEqualTo("COMPLETED");

        AttendanceRecord retainedRecord = attendanceRecordRepository.findById(record.getId()).orElseThrow();
        assertThat(retainedRecord.getStatus()).isEqualTo("PRESENT");
        assertThat(retainedRecord.getStudent().getFullName()).isEqualTo("Bobur Mirzo");
    }

    // 17. Individual session cancellation
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("17. Individual session cancellation: marks session as CANCELLED with reason")
    void testIndividualSessionCancellation() throws Exception {
        StudyGroup group = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("GRP-M02-CANCEL")
                .gradeLevel("8-sinf")
                .subject("Physics")
                .build());

        Mentor mentor = mentorRepository.save(Mentor.builder()
                .fullName("Cancel Test Mentor")
                .role("IT mentor")
                .status("ACTIVE")
                .build());

        LessonSession session = lessonSessionRepository.save(LessonSession.builder()
                .group(group)
                .mentor(mentor)
                .subject("Physics")
                .lessonDate(LocalDate.now().plusDays(2))
                .startTime("09:30")
                .endTime("11:00")
                .status("SCHEDULED")
                .build());

        CancelLessonRequest cancelReq = new CancelLessonRequest("Xona ta'mirlanmoqda");

        mockMvc.perform(post("/api/calendar/sessions/" + session.getId() + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancellationReason").value("Xona ta'mirlanmoqda"));

        LessonSession updated = lessonSessionRepository.findById(session.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("CANCELLED");
        assertThat(updated.getCancellationReason()).isEqualTo("Xona ta'mirlanmoqda");
        assertThat(updated.getIsManuallyModified()).isTrue();
    }

    // 18. Individual session rescheduling
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("18. Individual session rescheduling: moves session to new date/time with conflict checks")
    void testIndividualSessionRescheduling() throws Exception {
        StudyGroup group = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("GRP-M02-RESCHED")
                .gradeLevel("8-sinf")
                .subject("Robotics")
                .build());

        Mentor mentor = mentorRepository.save(Mentor.builder()
                .fullName("Reschedule Test Mentor")
                .role("IT mentor")
                .status("ACTIVE")
                .build());

        LessonSession session = lessonSessionRepository.save(LessonSession.builder()
                .group(group)
                .mentor(mentor)
                .subject("Robotics")
                .lessonDate(LocalDate.now().plusDays(2))
                .startTime("09:30")
                .endTime("11:00")
                .room("Lab 1")
                .status("SCHEDULED")
                .build());

        RescheduleLessonRequest rescheduleReq = RescheduleLessonRequest.builder()
                .newDate(LocalDate.now().plusDays(3))
                .newStartTime("15:00")
                .newEndTime("16:30")
                .newRoom("Lab 2")
                .reason("Mentor iltimosiga ko'ra")
                .build();

        mockMvc.perform(post("/api/calendar/sessions/" + session.getId() + "/reschedule")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rescheduleReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESCHEDULED"))
                .andExpect(jsonPath("$.data.startTime").value("15:00"))
                .andExpect(jsonPath("$.data.room").value("Lab 2"));

        LessonSession updated = lessonSessionRepository.findById(session.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("RESCHEDULED");
        assertThat(updated.getLessonDate()).isEqualTo(LocalDate.now().plusDays(3));
        assertThat(updated.getIsManuallyModified()).isTrue();
    }

    // 19. Attendance integration with concrete session
    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("19. Attendance integration: records attendance and completes session; rejects cancelled session")
    void testAttendanceIntegration() throws Exception {
        StudyGroup group = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("GRP-M02-ATT")
                .gradeLevel("8-sinf")
                .subject("Web")
                .build());

        Mentor mentor = mentorRepository.save(Mentor.builder()
                .fullName("Attendance Test Mentor")
                .role("IT mentor")
                .status("ACTIVE")
                .build());

        Student student = studentRepository.save(Student.builder()
                .fullName("Nodirabegim")
                .studentIdNumber("STU-M02-ATT-1")
                .studyGroup(group)
                .mentor(mentor)
                .status("Faol")
                .build());

        LessonSession session = lessonSessionRepository.save(LessonSession.builder()
                .group(group)
                .mentor(mentor)
                .subject("Web")
                .lessonDate(LocalDate.now())
                .startTime("09:30")
                .endTime("11:00")
                .status("SCHEDULED")
                .build());

        SubmitAttendanceRequest attReq = SubmitAttendanceRequest.builder()
                .records(List.of(
                        AttendanceItemDto.builder()
                                .studentId(student.getId())
                                .status("PRESENT")
                                .notes("Faol qatnashdi")
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/calendar/sessions/" + session.getId() + "/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.presentCount").value(1));

        // Rejection for cancelled session
        session.setStatus("CANCELLED");
        lessonSessionRepository.save(session);

        mockMvc.perform(post("/api/calendar/sessions/" + session.getId() + "/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Bekor qilingan dars")));
    }

    // 20. Unauthorized access rejection
    @Test
    @DisplayName("20. Unauthorized access rejection: unauthenticated requests are rejected with 401/403")
    void testUnauthorizedAccessRejection() throws Exception {
        mockMvc.perform(post("/api/schedules/recurring")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/calendar/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
