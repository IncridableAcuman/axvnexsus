package uz.axm.nexus.branches.presentation;

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
import uz.axm.nexus.branches.application.dto.CreateBranchRequest;
import uz.axm.nexus.branches.application.dto.UpdateBranchRequest;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.branches.infrastructure.BranchRepository;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BranchManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BranchRepository branchRepository;

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("Barcha filiallar ro'yxatini olish va qidirish")
    void shouldGetAllBranchesAndSearch() throws Exception {
        mockMvc.perform(get("/api/branches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].code").value("ITP-YANGIARIQ"));

        mockMvc.perform(get("/api/branches")
                        .param("search", "Yangiariq"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].region").value("Xorazm viloyati"));
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("Filial tafsilotlari va statistikasini olish")
    void shouldGetBranchDetailsAndStatistics() throws Exception {
        Branch branch = branchRepository.findByCodeIgnoreCase("ITP-YANGIARIQ")
                .orElseThrow();

        mockMvc.perform(get("/api/branches/" + branch.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(branch.getId()))
                .andExpect(jsonPath("$.data.code").value("ITP-YANGIARIQ"));

        mockMvc.perform(get("/api/branches/" + branch.getId() + "/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.branchId").value(branch.getId()))
                .andExpect(jsonPath("$.data.totalGroups").isNumber())
                .andExpect(jsonPath("$.data.totalStudents").isNumber())
                .andExpect(jsonPath("$.data.capacityUtilizationRate").isNumber());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("Yangi filial yaratish, tahrirlash va unikal kod tekshiruvi")
    void shouldCreateUpdateAndValidateBranch() throws Exception {
        String uniqueCode = "TEST-BRANCH-" + System.currentTimeMillis() % 100000;

        CreateBranchRequest createReq = CreateBranchRequest.builder()
                .name("Urganch IT Hub")
                .code(uniqueCode)
                .region("Xorazm viloyati")
                .district("Urganch shahri")
                .address("Al-Xorazmiy ko'chasi, 12")
                .phone("+998 62 224 00 00")
                .email("urganch@axm.uz")
                .description("Urganch shahridagi yangi zamonaviy ta'lim filiali")
                .status("ACTIVE")
                .build();

        // 1. Create branch
        String response = mockMvc.perform(post("/api/branches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value(uniqueCode))
                .andReturn().getResponse().getContentAsString();

        Number branchId = com.jayway.jsonpath.JsonPath.read(response, "$.data.id");

        // 2. Duplicate code creation should fail
        mockMvc.perform(post("/api/branches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("allaqachon mavjud")));

        // 3. Update branch
        UpdateBranchRequest updateReq = UpdateBranchRequest.builder()
                .name("Urganch IT Markazi (Kengaytirilgan)")
                .code(uniqueCode)
                .region("Xorazm viloyati")
                .district("Urganch shahri")
                .address("Al-Xorazmiy ko'chasi, 12-A")
                .phone("+998 62 224 11 11")
                .email("urganch.hub@axm.uz")
                .description("Yangi laboratoriyalar bilan kengaytirilgan filial")
                .status("ACTIVE")
                .build();

        mockMvc.perform(put("/api/branches/" + branchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Urganch IT Markazi (Kengaytirilgan)"));

        // 4. Delete empty branch
        mockMvc.perform(delete("/api/branches/" + branchId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(username = "student_user", roles = {"STUDENT"})
    @DisplayName("O'quvchi roli filial yaratishga urinishda 403 taqiqlanishi kerak")
    void shouldDenyStudentFromCreatingBranch() throws Exception {
        CreateBranchRequest createReq = CreateBranchRequest.builder()
                .name("Hacker Branch")
                .code("HACK-01")
                .region("Toshkent")
                .build();

        mockMvc.perform(post("/api/branches")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
    @DisplayName("Filialga tegishli guruhlar va xonalarni olish")
    void shouldGetBranchGroupsAndRooms() throws Exception {
        Branch branch = branchRepository.findByCodeIgnoreCase("ITP-YANGIARIQ").orElseThrow();

        mockMvc.perform(get("/api/branches/" + branch.getId() + "/groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", isA(java.util.List.class)));

        mockMvc.perform(get("/api/branches/" + branch.getId() + "/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", isA(java.util.List.class)));
    }
}
