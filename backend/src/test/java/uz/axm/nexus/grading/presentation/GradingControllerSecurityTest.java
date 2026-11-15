package uz.axm.nexus.grading.presentation;

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

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GradingControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "mentor1", roles = {"MENTOR"})
    @DisplayName("Mentor 'ADJUSTMENT' manbasi orqali noqonuniy ball berishga uringanda 403 rad etilishi kerak")
    void shouldPreventMentorFromUsingAdjustmentSource() throws Exception {
        Map<String, Object> payload = Map.of(
                "studentId", 1L,
                "amount", 100,
                "pointSource", "ADJUSTMENT",
                "reason", "Noqonuniy qo'shish"
        );

        mockMvc.perform(post("/api/grading/points")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "student1", roles = {"STUDENT"})
    @DisplayName("Talaba ballni to'g'rilash (adjust) endpointiga murojaat qilganda 403 rad etilishi kerak")
    void shouldPreventStudentFromAdjustingPoints() throws Exception {
        Map<String, Object> payload = Map.of(
                "studentId", 1L,
                "deltaAmount", 50,
                "reason", "O'zimga ball qo'shish"
        );

        mockMvc.perform(post("/api/grading/points/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "student1", roles = {"STUDENT"})
    @DisplayName("Talaba streak freeze balansini o'zgartirish endpointiga murojaat qilganda 403 rad etilishi kerak")
    void shouldPreventStudentFromAdjustingStreakFreeze() throws Exception {
        Map<String, Object> payload = Map.of(
                "studentId", 1L,
                "delta", 2,
                "reason", "Freeze ko'paytirish"
        );

        mockMvc.perform(post("/api/grading/streak/freeze/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("Administrator gamifikatsiya konfiguratsiyalarini ko'rishi va yangilashi mumkin")
    void shouldAllowAdminToManageConfigurations() throws Exception {
        mockMvc.perform(get("/api/grading/config"))
                .andExpect(status().isOk());

        Map<String, String> updatePayload = Map.of(
                "configKey", "xp.quiz.complete",
                "configValue", "15",
                "description", "Test yakunlash uchun 15 XP"
        );

        mockMvc.perform(put("/api/grading/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatePayload)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    @DisplayName("Administrator yangi yutuq nishoni yaratishi mumkin")
    void shouldAllowAdminToCreateAchievement() throws Exception {
        Map<String, Object> achPayload = Map.of(
                "code", "SECURITY_MASTER_" + System.currentTimeMillis(),
                "title", "Xavfsizlik Ustasi",
                "description", "Xavfsizlik qoidalarini to'liq o'zlashtirish",
                "icon", "Shield",
                "badgeColor", "blue",
                "category", "PERFORMANCE",
                "xpReward", 150
        );

        mockMvc.perform(post("/api/grading/achievements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(achPayload)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Autentifikatsiyadan o'tmagan foydalanuvchi profiliga kirishga uringanda 401/403 bo'lishi kerak")
    void shouldRejectUnauthenticatedAccessToMyProfile() throws Exception {
        mockMvc.perform(get("/api/grading/profile/me"))
                .andExpect(status().isUnauthorized());
    }
}
