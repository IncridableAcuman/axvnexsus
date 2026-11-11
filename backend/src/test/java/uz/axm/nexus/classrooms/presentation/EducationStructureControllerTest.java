package uz.axm.nexus.classrooms.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import uz.axm.nexus.classrooms.application.EnrollStudentRequest;
import uz.axm.nexus.classrooms.application.TransferStudentRequest;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import org.springframework.security.test.context.support.WithMockUser;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
class EducationStructureControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MentorRepository mentorRepository;

    @Test
    @DisplayName("O'quvchini guruhga a'zo qilib biriktirish va bir xil faol guruhga qayta biriktirishni taqiqlash")
    void shouldEnrollStudentAndPreventDuplicateActiveEnrollment() throws Exception {
        StudyGroup group = studyGroupRepository.findAll().get(0);

        Student student = studentRepository.save(Student.builder()
                .fullName("Yangi Test O'quvchi")
                .gradeLevel("8-sinf")
                .district("Yangiariq")
                .branchLocation("IT Park Yangiariq")
                .status("Faol")
                .build());

        EnrollStudentRequest enrollReq = EnrollStudentRequest.builder()
                .studentId(student.getId())
                .build();

        // 1. Successful enrollment
        mockMvc.perform(post("/api/groups/" + group.getId() + "/students")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(enrollReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.studentId").value(student.getId()));

        // 2. Duplicate enrollment attempt should fail
        mockMvc.perform(post("/api/groups/" + group.getId() + "/students")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(enrollReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("allaqachon faol a'zo")));
    }

    @Test
    @DisplayName("O'quvchini boshqa guruhga ko'chirish va tarixni saqlash")
    void shouldTransferStudentPreservingHistory() throws Exception {
        StudyGroup groupA = studyGroupRepository.findAll().get(0);
        StudyGroup groupB = studyGroupRepository.findAll().get(1);

        Student student = studentRepository.save(Student.builder()
                .fullName("Ko'chiriluvchi O'quvchi")
                .gradeLevel("8-sinf")
                .district("Yangiariq")
                .status("Faol")
                .build());

        // Enroll to Group A
        mockMvc.perform(post("/api/groups/" + groupA.getId() + "/students")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new EnrollStudentRequest(student.getId()))))
                .andExpect(status().isCreated());

        // Transfer to Group B
        TransferStudentRequest transferReq = TransferStudentRequest.builder()
                .targetGroupId(groupB.getId())
                .reason("Dars vaqti to'g'ri kelmadi")
                .build();

        mockMvc.perform(post("/api/groups/" + groupA.getId() + "/students/" + student.getId() + "/transfer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.groupCode").value(groupB.getGroupCode()))
                .andExpect(jsonPath("$.data.previousGroupCode").value(groupA.getGroupCode()))
                .andExpect(jsonPath("$.data.transferReason").value("Dars vaqti to'g'ri kelmadi"));

        // Verify student history
        mockMvc.perform(get("/api/groups/students/" + student.getId() + "/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    @DisplayName("Noto'g'ri sinf bosqichida guruh yaratish rad etilishi kerak")
    void shouldRejectInvalidGradeLevelOnGroupCreation() throws Exception {
        StudyGroup invalidGroup = StudyGroup.builder()
                .groupCode("TEST-INVALID-GRADE")
                .gradeLevel("12-sinf") // Invalid: only 8, 9, 10, 11
                .subject("Computer Science")
                .branchLocation("IT Park")
                .build();

        mockMvc.perform(post("/api/groups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidGroup)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Noto'g'ri sinf")));
    }
}
