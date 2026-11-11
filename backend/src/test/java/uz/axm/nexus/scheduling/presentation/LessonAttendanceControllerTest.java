package uz.axm.nexus.scheduling.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.application.AttendanceItemDto;
import uz.axm.nexus.scheduling.application.CancelLessonRequest;
import uz.axm.nexus.scheduling.application.CreateLessonSessionRequest;
import uz.axm.nexus.scheduling.application.SubmitAttendanceRequest;
import uz.axm.nexus.scheduling.domain.LessonSession;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import org.springframework.security.test.context.support.WithMockUser;

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
class LessonAttendanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private MentorRepository mentorRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private LessonSessionRepository lessonSessionRepository;

    @Test
    @DisplayName("Dars jadvalini to'qnashuvsiz rejalashtirish va ayni vaqtda mentor to'qnashuvini rad etish")
    void shouldCreateSessionAndDetectMentorConflict() throws Exception {
        StudyGroup group = studyGroupRepository.findAll().get(0);
        Mentor mentor = mentorRepository.findAll().get(0);
        LocalDate testDate = LocalDate.now().plusDays(5);

        CreateLessonSessionRequest req1 = CreateLessonSessionRequest.builder()
                .groupId(group.getId())
                .mentorId(mentor.getId())
                .subject("Algorithmics")
                .topic("Binary Search")
                .lessonDate(testDate)
                .startTime("10:00")
                .endTime("11:30")
                .room("Lab 1")
                .build();

        // 1. First session created successfully
        mockMvc.perform(post("/api/lessons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SCHEDULED"));

        // 2. Overlapping session for same mentor on same date must be rejected
        CreateLessonSessionRequest conflictingReq = CreateLessonSessionRequest.builder()
                .groupId(group.getId())
                .mentorId(mentor.getId())
                .subject("Advanced Python")
                .lessonDate(testDate)
                .startTime("10:30") // Overlaps with 10:00 - 11:30!
                .endTime("12:00")
                .room("Lab 2")
                .build();

        mockMvc.perform(post("/api/lessons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(conflictingReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("to'qnashuv")));
    }

    @Test
    @DisplayName("Dars uchun davomatni to'ldirish va dars holatini COMPLETED ga o'tkazish")
    void shouldSubmitAttendanceSuccessfully() throws Exception {
        StudyGroup group = studyGroupRepository.findAll().get(0);
        Mentor mentor = mentorRepository.findAll().get(0);
        Student student = studentRepository.findAll().get(0);

        LessonSession session = lessonSessionRepository.save(LessonSession.builder()
                .group(group)
                .mentor(mentor)
                .subject("Web Development")
                .lessonDate(LocalDate.now().minusDays(1))
                .startTime("14:00")
                .endTime("15:30")
                .status("SCHEDULED")
                .build());

        SubmitAttendanceRequest attendanceReq = SubmitAttendanceRequest.builder()
                .records(List.of(
                        AttendanceItemDto.builder()
                                .studentId(student.getId())
                                .status("PRESENT")
                                .notes("Faol qatnashdi")
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/lessons/" + session.getId() + "/attendance")
                        .header("X-Admin-User", "admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attendanceReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.presentCount").value(1));
    }

    @Test
    @DisplayName("Darsni bekor qilish va sababini saqlash")
    void shouldCancelSessionWithReason() throws Exception {
        StudyGroup group = studyGroupRepository.findAll().get(0);
        Mentor mentor = mentorRepository.findAll().get(0);

        LessonSession session = lessonSessionRepository.save(LessonSession.builder()
                .group(group)
                .mentor(mentor)
                .subject("Cancel Test")
                .lessonDate(LocalDate.now().plusDays(2))
                .startTime("16:00")
                .endTime("17:30")
                .status("SCHEDULED")
                .build());

        CancelLessonRequest cancelReq = CancelLessonRequest.builder()
                .reason("Elektr tarmog'ida profilaktika ishlari")
                .build();

        mockMvc.perform(post("/api/lessons/" + session.getId() + "/cancel")
                        .header("X-Admin-User", "admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancellationReason").value("Elektr tarmog'ida profilaktika ishlari"));
    }
}
