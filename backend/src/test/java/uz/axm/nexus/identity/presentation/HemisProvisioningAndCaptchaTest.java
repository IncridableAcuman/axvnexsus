package uz.axm.nexus.identity.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.identity.application.CaptchaResponse;
import uz.axm.nexus.identity.application.CaptchaService;
import uz.axm.nexus.identity.application.LoginRequest;
import uz.axm.nexus.mentors.application.CreateMentorRequest;
import uz.axm.nexus.users.application.CreateStudentRequest;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class HemisProvisioningAndCaptchaTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CaptchaService captchaService;

    @Test
    @DisplayName("CAPTCHA olish API si 5 xonali kod va SVG qaytarishi kerak")
    void shouldReturnCaptchaWithSvg() throws Exception {
        mockMvc.perform(get("/api/auth/captcha"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.captchaId", notNullValue()))
                .andExpect(jsonPath("$.data.captchaSvg", containsString("<svg")));
    }

    @Test
    @DisplayName("Noto'g'ri CAPTCHA bilan login qilinganda xatolik qaytarishi kerak")
    void shouldFailLoginWithInvalidCaptcha() throws Exception {
        CaptchaResponse captcha = captchaService.generateCaptcha();

        LoginRequest loginReq = LoginRequest.builder()
                .username("admin")
                .password("admin123")
                .captchaId(captcha.getCaptchaId())
                .captchaCode("WRONG")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("CAPTCHA")));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("Admin tomonidan mentor yaratilishi, HEMIS ID va tasodifiy parol berilishi hamda login qilish tekshiriladi")
    void shouldProvisionMentorAndLoginSuccessfully() throws Exception {
        CreateMentorRequest req = CreateMentorRequest.builder()
                .fullName("Alisher Navoiy Mentori")
                .role("IT mentor")
                .phone("+998 90 999 88 77")
                .email("navoiy.mentor@axm-nexus.uz")
                .branchLocation("IT Park Yangiariq")
                .bio("Dasturlash asoslari va algoritmlar bo'yicha katta mentor")
                .build();

        MvcResult result = mockMvc.perform(post("/api/mentors/provision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.hemisId", startsWith("326")))
                .andExpect(jsonPath("$.data.temporaryPassword", notNullValue()))
                .andReturn();

        String responseJson = result.getResponse().getContentAsString();
        String hemisId = objectMapper.readTree(responseJson).path("data").path("hemisId").asText();
        String tempPassword = objectMapper.readTree(responseJson).path("data").path("temporaryPassword").asText();

        // Check login with provisioned HEMIS ID and password
        LoginRequest loginReq = LoginRequest.builder()
                .username(hemisId)
                .password(tempPassword)
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value(hemisId))
                .andExpect(jsonPath("$.data.roles", hasItem("ROLE_MENTOR")));
    }

    @Test
    @WithMockUser(username = "mentor", roles = {"MENTOR"})
    @DisplayName("Mentor tomonidan o'quvchi qo'shilishi, HEMIS student ID va tasodifiy parol berilishi hamda login tekshiriladi")
    void shouldProvisionStudentAndLoginSuccessfully() throws Exception {
        CreateStudentRequest req = CreateStudentRequest.builder()
                .fullName("Bobur Mirzo Shaxzoda")
                .gradeLevel("8-sinf")
                .phone("+998 93 111 22 33")
                .direction("Web Full-Stack")
                .branchLocation("IT Park Yangiariq")
                .build();

        MvcResult result = mockMvc.perform(post("/api/students/provision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studentIdNumber", startsWith("426")))
                .andExpect(jsonPath("$.data.temporaryPassword", notNullValue()))
                .andReturn();

        String responseJson = result.getResponse().getContentAsString();
        String studentIdNumber = objectMapper.readTree(responseJson).path("data").path("studentIdNumber").asText();
        String tempPassword = objectMapper.readTree(responseJson).path("data").path("temporaryPassword").asText();

        // Check login with provisioned student HEMIS ID and password
        LoginRequest loginReq = LoginRequest.builder()
                .username(studentIdNumber)
                .password(tempPassword)
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value(studentIdNumber))
                .andExpect(jsonPath("$.data.roles", hasItem("ROLE_STUDENT")));
    }
}
