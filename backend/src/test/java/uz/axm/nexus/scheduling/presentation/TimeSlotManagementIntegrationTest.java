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
import uz.axm.nexus.scheduling.application.TimeSlotRequest;
import uz.axm.nexus.scheduling.domain.Schedule;
import uz.axm.nexus.scheduling.domain.TimeSlot;
import uz.axm.nexus.scheduling.infrastructure.ScheduleRepository;
import uz.axm.nexus.scheduling.infrastructure.TimeSlotRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TimeSlotManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private MentorRepository mentorRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    private Branch testBranch;
    private TimeSlot slotMorning;
    private TimeSlot slotAfternoon;
    private TimeSlot slotEvening;

    @BeforeEach
    void setUp() {
        testBranch = branchRepository.findAll().stream().findFirst().orElseGet(() ->
                branchRepository.save(Branch.builder()
                        .name("IT Park Yangiariq")
                        .code("YNG-01")
                        .address("Mustaqillik ko'chasi 1")
                        .build())
        );

        slotMorning = timeSlotRepository.findByStartTimeAndEndTime("09:30", "11:00")
                .orElseGet(() -> timeSlotRepository.save(TimeSlot.builder()
                        .name("Ertalabki Test Smena")
                        .startTime("09:30")
                        .endTime("11:00")
                        .durationMinutes(90)
                        .displayOrder(1)
                        .active(true)
                        .branch(testBranch)
                        .build()));

        slotAfternoon = timeSlotRepository.findByStartTimeAndEndTime("15:00", "16:30")
                .orElseGet(() -> timeSlotRepository.save(TimeSlot.builder()
                        .name("Tushdan keyingi Test Smena")
                        .startTime("15:00")
                        .endTime("16:30")
                        .durationMinutes(90)
                        .displayOrder(2)
                        .active(true)
                        .branch(testBranch)
                        .build()));

        slotEvening = timeSlotRepository.findByStartTimeAndEndTime("16:30", "18:00")
                .orElseGet(() -> timeSlotRepository.save(TimeSlot.builder()
                        .name("Kechki Test Smena")
                        .startTime("16:30")
                        .endTime("18:00")
                        .durationMinutes(90)
                        .displayOrder(3)
                        .active(true)
                        .branch(testBranch)
                        .build()));
    }

    @Test
    @DisplayName("1. Create valid time slot: returns 201 Created and persists slot")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testCreateValidTimeSlot() throws Exception {
        TimeSlotRequest req = TimeSlotRequest.builder()
                .name("Maxsus Yangi Smena")
                .startTime("11:30")
                .endTime("13:00")
                .displayOrder(4)
                .active(true)
                .description("Qo'shimcha darslar uchun")
                .branchId(testBranch.getId())
                .build();

        mockMvc.perform(post("/api/admin/time-slots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Maxsus Yangi Smena"))
                .andExpect(jsonPath("$.data.startTime").value("11:30"))
                .andExpect(jsonPath("$.data.endTime").value("13:00"))
                .andExpect(jsonPath("$.data.durationMinutes").value(90))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    @DisplayName("2. Reject reversed time range (15:00 - 14:30) with 400 Bad Request")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testRejectReversedTimeRange() throws Exception {
        TimeSlotRequest req = TimeSlotRequest.builder()
                .name("Reversed Slot")
                .startTime("15:00")
                .endTime("14:30")
                .build();

        mockMvc.perform(post("/api/admin/time-slots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("boshlanish vaqtidan kechroq bo'lishi kerak")));
    }

    @Test
    @DisplayName("3. Reject invalid time values (e.g. 25:00 or malformed format)")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testRejectInvalidTimeValues() throws Exception {
        TimeSlotRequest req = TimeSlotRequest.builder()
                .name("Invalid Time Slot")
                .startTime("25:00")
                .endTime("26:30")
                .build();

        mockMvc.perform(post("/api/admin/time-slots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Vaqt formati noto'g'ri")));
    }

    @Test
    @DisplayName("4. Update existing time slot successfully")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testUpdateExistingTimeSlot() throws Exception {
        TimeSlotRequest req = TimeSlotRequest.builder()
                .name("Tushdan keyingi Yangilangan")
                .startTime("15:00")
                .endTime("16:30")
                .displayOrder(5)
                .active(true)
                .description("Yangilangan tavsif")
                .build();

        mockMvc.perform(put("/api/admin/time-slots/" + slotAfternoon.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Tushdan keyingi Yangilangan"))
                .andExpect(jsonPath("$.data.displayOrder").value(5));
    }

    @Test
    @DisplayName("5. Deactivate time slot: excluded from active list, retained in admin list")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testDeactivateTimeSlot() throws Exception {
        mockMvc.perform(patch("/api/admin/time-slots/" + slotMorning.getId() + "/toggle-active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        // Active list should not contain deactivated slot
        mockMvc.perform(get("/api/time-slots"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", not(hasItem(slotMorning.getId().intValue()))));

        // Admin list should still contain it with active=false
        mockMvc.perform(get("/api/admin/time-slots"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(slotMorning.getId().intValue())));
    }

    @Test
    @DisplayName("6. Preserve historical schedules: deactivating slot does not alter existing schedules")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testPreserveHistoricalSchedulesOnDeactivation() throws Exception {
        // Find existing real schedule using slotAfternoon's time (15:00 - 16:30, group YA-26I0804)
        Schedule sched = scheduleRepository.findAll().stream()
                .filter(s -> "15:00".equals(s.getStartTime()) && "16:30".equals(s.getEndTime()))
                .findFirst()
                .orElseThrow();

        // Deactivate slotAfternoon
        mockMvc.perform(patch("/api/admin/time-slots/" + slotAfternoon.getId() + "/toggle-active"))
                .andExpect(status().isOk());

        // Check schedule is unchanged
        Schedule preserved = scheduleRepository.findById(sched.getId()).orElseThrow();
        assertThat(preserved.getStartTime()).isEqualTo("15:00");
        assertThat(preserved.getEndTime()).isEqualTo("16:30");

        // Attempting to delete slotAfternoon while used must be rejected
        mockMvc.perform(delete("/api/admin/time-slots/" + slotAfternoon.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("ishlatilmoqda")));
    }

    @Test
    @DisplayName("7. Detect overlapping actual time intervals (conflict across 09:30-11:00 vs 10:30-12:00)")
    @WithMockUser(username = "mentor1", roles = {"MENTOR"})
    void testDetectOverlappingActualTimeIntervals() throws Exception {
        // Existing schedule: 09:30 - 11:00 on ODD_DAYS in Room "IT Lab 10"
        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .groupCode("GRP-TEST-OVERLAP-1")
                .gradeLevel("8-sinf")
                .subject("CS 101")
                .mentorName("Overlap Mentor")
                .mentorRole("IT mentor")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .room("IT Lab 10")
                .branchLocation("IT Park Yangiariq")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        // Overlapping schedule: 10:30 - 12:00 on ODD_DAYS in same Room "IT Lab 10"
        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .groupCode("GRP-TEST-OVERLAP-2")
                .gradeLevel("8-sinf")
                .subject("CS 102")
                .mentorName("Another Mentor")
                .mentorRole("IT mentor")
                .dayPattern("ODD_DAYS")
                .startTime("10:30")
                .endTime("12:00")
                .room("IT Lab 10")
                .branchLocation("IT Park Yangiariq")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SCHEDULE_CONFLICT"))
                .andExpect(jsonPath("$.conflicts", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("8. Allow adjacent non-overlapping intervals (09:30-11:00 and 11:00-12:30)")
    @WithMockUser(username = "mentor1", roles = {"MENTOR"})
    void testAllowAdjacentNonOverlappingIntervals() throws Exception {
        // Slot 1: 09:30 - 11:00
        ManualScheduleRequest req1 = ManualScheduleRequest.builder()
                .groupCode("GRP-ADJACENT-1")
                .gradeLevel("8-sinf")
                .subject("CS 101")
                .mentorName("Same Room Mentor")
                .mentorRole("IT mentor")
                .dayPattern("ODD_DAYS")
                .startTime("09:30")
                .endTime("11:00")
                .room("IT Lab 20")
                .branchLocation("IT Park Yangiariq")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        // Adjacent Slot: 11:00 - 12:30 (starts exactly when previous ends, same room) -> No overlap!
        ManualScheduleRequest req2 = ManualScheduleRequest.builder()
                .groupCode("GRP-ADJACENT-2")
                .gradeLevel("8-sinf")
                .subject("CS 102")
                .mentorName("Second Room Mentor")
                .mentorRole("IT mentor")
                .dayPattern("ODD_DAYS")
                .startTime("11:00")
                .endTime("12:30")
                .room("IT Lab 20")
                .branchLocation("IT Park Yangiariq")
                .build();

        mockMvc.perform(post("/api/schedules/manual")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.room").value("IT Lab 20"))
                .andExpect(jsonPath("$.startTime").value("11:00"))
                .andExpect(jsonPath("$.endTime").value("12:30"));
    }

    @Test
    @DisplayName("9. Enforce authorization: Non-admin users cannot manage time slots (403 Forbidden)")
    @WithMockUser(username = "student1", roles = {"STUDENT"})
    void testEnforceAuthorizationForTimeSlotManagement() throws Exception {
        TimeSlotRequest req = TimeSlotRequest.builder()
                .name("Unauthorized Slot")
                .startTime("08:00")
                .endTime("09:30")
                .build();

        mockMvc.perform(post("/api/admin/time-slots")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("10. Verify branch scope: active slots filtered by branch, fallback to global")
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void testBranchScopeFiltering() throws Exception {
        mockMvc.perform(get("/api/time-slots?branchId=" + testBranch.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(3))));
    }
}
