package uz.axm.nexus.mentors.presentation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import uz.axm.nexus.mentors.application.EducationDto;
import uz.axm.nexus.mentors.application.ExperienceDto;
import uz.axm.nexus.mentors.application.ReviewProfileRequest;
import uz.axm.nexus.mentors.application.SkillDto;
import uz.axm.nexus.mentors.application.UpdateMentorProfileRequest;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.domain.MentorProfile;
import uz.axm.nexus.mentors.infrastructure.MentorProfileRepository;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;

import java.util.List;

import org.springframework.security.test.context.support.WithMockUser;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "admin", roles = {"SUPER_ADMIN", "ADMIN"})
class MentorProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MentorRepository mentorRepository;

    @Autowired
    private MentorProfileRepository mentorProfileRepository;

    @Test
    @DisplayName("Ommaviy profilda maxfiy kontaktlar yashirilishi va faqat tasdiqlangan profillar chiqishi kerak")
    void shouldMaskPrivateContactInPublicView() throws Exception {
        Mentor mentor = mentorRepository.findAll().get(0);

        // Update profile to have private contact
        MentorProfile profile = mentorProfileRepository.findByMentorId(mentor.getId()).orElseThrow();
        profile.setContactPublic(false);
        profile.setPhone("+998 90 999 88 77");
        profile.setEmail("private.mentor@test.uz");
        profile.setPublicationStatus("PUBLISHED");
        mentorProfileRepository.save(profile);

        mockMvc.perform(get("/api/mentors/public/" + profile.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.publicPhone").doesNotExist())
                .andExpect(jsonPath("$.data.publicEmail").doesNotExist())
                .andExpect(jsonPath("$.data.displayName").value(profile.getDisplayName()));
    }

    @Test
    @DisplayName("Mentor profilidagi tashqi havolalar (URL) to'g'ri validatsiya qilinishi kerak")
    void shouldValidateExternalUrls() throws Exception {
        Mentor mentor = mentorRepository.findAll().get(0);

        UpdateMentorProfileRequest invalidReq = UpdateMentorProfileRequest.builder()
                .displayName("Valid Name")
                .githubUrl("invalid-github-url-without-protocol")
                .build();

        mockMvc.perform(put("/api/mentors/" + mentor.getId() + "/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("http:// yoki https://")));
    }

    @Test
    @DisplayName("Administrator tomonidan profilni ko'rib chiqish va tasdiqlash/rad etish")
    void shouldReviewProfileByAdmin() throws Exception {
        Mentor mentor = mentorRepository.findAll().get(0);
        MentorProfile profile = mentorProfileRepository.findByMentorId(mentor.getId()).orElseThrow();

        ReviewProfileRequest reviewReq = ReviewProfileRequest.builder()
                .status("REJECTED")
                .rejectionReason("Ma'lumotlar to'liq kiritilmagan")
                .build();

        mockMvc.perform(patch("/api/mentors/profiles/" + profile.getId() + "/review")
                        .header("X-Admin-User", "admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.publicationStatus").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectionReason").value("Ma'lumotlar to'liq kiritilmagan"));
    }

    @Test
    @DisplayName("Mentor ko'nikmalari, ish tajribasi va ta'limini yangilash va qaytarish")
    void shouldUpdateSkillsExperienceAndEducation() throws Exception {
        Mentor mentor = mentorRepository.findAll().get(0);

        UpdateMentorProfileRequest req = UpdateMentorProfileRequest.builder()
                .displayName("Abdusharipov Izzatbek")
                .headline("Al-Xorazmiy Vorislari IT Mentori (Web Full-stack & Frontend)")
                .bio("Web Full-Stack va Frontend dasturlash bo'yicha amaliyotchi mutaxassis.")
                .yearsOfExperience(4)
                .isContactPublic(true)
                .phone("+998 90 123 45 67")
                .email("abdusharipovizzat03@gmail.com")
                .githubUrl("https://github.com/izzatbek-dev")
                .skills(List.of(
                        SkillDto.builder().skillName("React & TypeScript").proficiencyLevel("EXPERT").category("Frontend").build()
                ))
                .experiences(List.of(
                        ExperienceDto.builder().companyName("Al-Xorazmiy Vorislari").roleTitle("Bosh IT Mentori").startDate("2023-09-01").isCurrent(true).build()
                ))
                .educations(List.of(
                        EducationDto.builder().institution("TATU Urganch filiali").degreeOrCertificate("Bakalavr").issueYear(2024).build()
                ))
                .build();

        mockMvc.perform(put("/api/mentors/" + mentor.getId() + "/profile")
                        .header("X-User-Role", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.skills[0].skillName").value("React & TypeScript"))
                .andExpect(jsonPath("$.data.experiences[0].companyName").value("Al-Xorazmiy Vorislari"))
                .andExpect(jsonPath("$.data.educations[0].institution").value("TATU Urganch filiali"));
    }
}
