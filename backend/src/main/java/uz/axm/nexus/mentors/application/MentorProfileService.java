package uz.axm.nexus.mentors.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.mentors.domain.*;
import uz.axm.nexus.mentors.infrastructure.*;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MentorProfileService {

    private final MentorProfileRepository mentorProfileRepository;
    private final MentorRepository mentorRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    private static final Pattern URL_PATTERN = Pattern.compile("^(https?://).+");

    @Transactional(readOnly = true)
    public List<PublicMentorProfileDto> getPublicProfiles() {
        return mentorProfileRepository.findByPublicationStatus("PUBLISHED").stream()
                .map(this::toPublicDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PublicMentorProfileDto getPublicProfileById(Long id) {
        MentorProfile profile = mentorProfileRepository.findById(id)
                .filter(p -> "PUBLISHED".equalsIgnoreCase(p.getPublicationStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Ommaviy mentor profili topilmadi: #" + id));
        return toPublicDto(profile);
    }

    @Transactional(readOnly = true)
    public MentorProfileDto getProfileByMentorId(Long mentorId) {
        MentorProfile profile = mentorProfileRepository.findByMentorId(mentorId)
                .orElseGet(() -> {
                    Mentor mentor = mentorRepository.findById(mentorId)
                            .orElseThrow(() -> new ResourceNotFoundException("Mentor topilmadi: #" + mentorId));
                    return createDefaultProfile(mentor);
                });
        return toFullDto(profile);
    }

    @Transactional(readOnly = true)
    public MentorProfileDto getProfileByUserId(Long userId) {
        if (userId == null) return null;
        return mentorProfileRepository.findByUserId(userId)
                .map(this::toFullDto)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<MentorProfileDto> getAllProfilesForAdmin() {
        return mentorProfileRepository.findAll().stream()
                .map(this::toFullDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public MentorProfileDto updateProfile(Long mentorId, UpdateMentorProfileRequest request, Long callerUserId, String callerRole) {
        validateUrls(request);

        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor topilmadi: #" + mentorId));

        MentorProfile profile = mentorProfileRepository.findByMentorId(mentorId)
                .orElseGet(() -> createDefaultProfile(mentor));

        // Ownership enforcement:
        if (callerUserId != null && profile.getUser() != null && !callerUserId.equals(profile.getUser().getId())) {
            boolean isAdmin = callerRole != null && (callerRole.contains("ADMIN") || callerRole.contains("SUPER_ADMIN"));
            if (!isAdmin) {
                throw new BusinessException("Ruxsat berilmagan: Siz faqat o'zingizning mentor profilingizni tahrirlashingiz mumkin");
            }
        }

        profile.setDisplayName(request.getDisplayName().trim());
        profile.setHeadline(request.getHeadline());
        profile.setBio(request.getBio());
        profile.setYearsOfExperience(request.getYearsOfExperience() != null ? request.getYearsOfExperience() : 0);
        profile.setBranchLocation(request.getBranchLocation());
        profile.setPhone(request.getPhone());
        profile.setEmail(request.getEmail());
        profile.setContactPublic(request.isContactPublic());
        profile.setGithubUrl(request.getGithubUrl());
        profile.setLinkedinUrl(request.getLinkedinUrl());
        profile.setPortfolioUrl(request.getPortfolioUrl());
        profile.setProfilePhotoUrl(request.getProfilePhotoUrl());

        // Any substantive change by mentor requires review before publishing
        boolean isAdmin = callerRole != null && (callerRole.contains("ADMIN") || callerRole.contains("SUPER_ADMIN"));
        if (!isAdmin) {
            profile.setPublicationStatus("PENDING_REVIEW");
        } else if ("DRAFT".equals(profile.getPublicationStatus())) {
            profile.setPublicationStatus("PUBLISHED");
        }

        // Update skills
        if (request.getSkills() != null) {
            profile.getSkills().clear();
            for (SkillDto sd : request.getSkills()) {
                MentorSkill skill = MentorSkill.builder()
                        .profile(profile)
                        .skillName(sd.getSkillName().trim())
                        .proficiencyLevel(sd.getProficiencyLevel() != null ? sd.getProficiencyLevel() : "INTERMEDIATE")
                        .category(sd.getCategory())
                        .build();
                profile.getSkills().add(skill);
            }
        }

        // Update experiences
        if (request.getExperiences() != null) {
            profile.getExperiences().clear();
            for (ExperienceDto ed : request.getExperiences()) {
                MentorExperience exp = MentorExperience.builder()
                        .profile(profile)
                        .companyName(ed.getCompanyName() != null ? ed.getCompanyName().trim() : "")
                        .roleTitle(ed.getRoleTitle() != null ? ed.getRoleTitle().trim() : "")
                        .description(ed.getDescription())
                        .startDate(parseDate(ed.getStartDate()))
                        .endDate(parseDate(ed.getEndDate()))
                        .isCurrent(ed.isCurrent())
                        .build();
                profile.getExperiences().add(exp);
            }
        }

        // Update educations
        if (request.getEducations() != null) {
            profile.getEducations().clear();
            for (EducationDto ed : request.getEducations()) {
                MentorEducation edu = MentorEducation.builder()
                        .profile(profile)
                        .institution(ed.getInstitution() != null ? ed.getInstitution().trim() : "")
                        .degreeOrCertificate(ed.getDegreeOrCertificate() != null ? ed.getDegreeOrCertificate().trim() : "")
                        .fieldOfStudy(ed.getFieldOfStudy())
                        .issueYear(ed.getIssueYear())
                        .verificationStatus(ed.getVerificationStatus() != null ? ed.getVerificationStatus() : "UNVERIFIED")
                        .build();
                profile.getEducations().add(edu);
            }
        }

        MentorProfile saved = mentorProfileRepository.save(profile);
        auditService.logAction("MENTOR_PROFILE_UPDATED", "MentorProfile", String.valueOf(saved.getId()),
                callerRole != null ? callerRole : "MENTOR", "Mentor profili yangilandi (" + saved.getPublicationStatus() + ")");

        return toFullDto(saved);
    }

    @Transactional
    public MentorProfileDto reviewProfile(Long profileId, ReviewProfileRequest request, String reviewerUsername) {
        MentorProfile profile = mentorProfileRepository.findById(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor profili topilmadi: #" + profileId));

        String status = request.getStatus().trim().toUpperCase();
        if (!Set.of("APPROVED", "REJECTED", "PUBLISHED", "DRAFT").contains(status)) {
            throw new BusinessException("Noto'g'ri ko'rib chiqish holati: " + status);
        }

        profile.setPublicationStatus(status);
        profile.setReviewedBy(reviewerUsername);
        profile.setReviewedAt(LocalDateTime.now());
        if ("REJECTED".equals(status)) {
            profile.setRejectionReason(request.getRejectionReason());
        } else {
            profile.setRejectionReason(null);
        }

        MentorProfile saved = mentorProfileRepository.save(profile);
        auditService.logAction("MENTOR_PROFILE_REVIEWED", "MentorProfile", String.valueOf(saved.getId()),
                reviewerUsername, "Profil ko'rib chiqildi: " + status + (request.getRejectionReason() != null ? ". Sabab: " + request.getRejectionReason() : ""));

        return toFullDto(saved);
    }

    private void validateUrls(UpdateMentorProfileRequest req) {
        validateSingleUrl("GitHub", req.getGithubUrl());
        validateSingleUrl("LinkedIn", req.getLinkedinUrl());
        validateSingleUrl("Portfolio", req.getPortfolioUrl());
    }

    private void validateSingleUrl(String field, String url) {
        if (url != null && !url.trim().isBlank()) {
            if (!URL_PATTERN.matcher(url.trim()).matches()) {
                throw new BusinessException(field + " URL manzili noto'g'ri formatda. http:// yoki https:// bilan boshlanishi kerak");
            }
        }
    }

    private java.time.LocalDate parseDate(String d) {
        if (d == null || d.isBlank()) return null;
        d = d.trim();
        if (d.matches("^\\d{4}$")) {
            return java.time.LocalDate.of(Integer.parseInt(d), 1, 1);
        }
        if (d.matches("^\\d{4}-\\d{2}$")) {
            return java.time.LocalDate.of(Integer.parseInt(d.substring(0, 4)), Integer.parseInt(d.substring(5, 7)), 1);
        }
        try {
            return java.time.LocalDate.parse(d);
        } catch (Exception e) {
            return null;
        }
    }

    private MentorProfile createDefaultProfile(Mentor mentor) {
        MentorProfile profile = MentorProfile.builder()
                .mentor(mentor)
                .displayName(mentor.getFullName())
                .headline(mentor.getRole())
                .bio(mentor.getBio())
                .branchLocation(mentor.getBranchLocation())
                .phone(mentor.getPhone())
                .email(mentor.getEmail())
                .isContactPublic(false)
                .publicationStatus("PUBLISHED") // Initial seeded mentors start published
                .yearsOfExperience(3)
                .build();
        return mentorProfileRepository.save(profile);
    }

    public PublicMentorProfileDto toPublicDto(MentorProfile p) {
        return PublicMentorProfileDto.builder()
                .id(p.getId())
                .mentorId(p.getMentor() != null ? p.getMentor().getId() : null)
                .displayName(p.getDisplayName())
                .headline(p.getHeadline())
                .bio(p.getBio())
                .yearsOfExperience(p.getYearsOfExperience())
                .branchLocation(p.getBranchLocation())
                .publicPhone(p.isContactPublic() ? p.getPhone() : null)
                .publicEmail(p.isContactPublic() ? p.getEmail() : null)
                .githubUrl(p.getGithubUrl())
                .linkedinUrl(p.getLinkedinUrl())
                .portfolioUrl(p.getPortfolioUrl())
                .profilePhotoUrl(p.getProfilePhotoUrl())
                .skills(p.getSkills() != null ? p.getSkills().stream().map(s -> SkillDto.builder().id(s.getId()).skillName(s.getSkillName()).proficiencyLevel(s.getProficiencyLevel()).category(s.getCategory()).build()).collect(Collectors.toList()) : List.of())
                .experiences(p.getExperiences() != null ? p.getExperiences().stream().map(e -> ExperienceDto.builder().id(e.getId()).companyName(e.getCompanyName()).roleTitle(e.getRoleTitle()).description(e.getDescription()).startDate(e.getStartDate() != null ? e.getStartDate().toString() : null).endDate(e.getEndDate() != null ? e.getEndDate().toString() : null).isCurrent(e.isCurrent()).build()).collect(Collectors.toList()) : List.of())
                .educations(p.getEducations() != null ? p.getEducations().stream().map(ed -> EducationDto.builder().id(ed.getId()).institution(ed.getInstitution()).degreeOrCertificate(ed.getDegreeOrCertificate()).fieldOfStudy(ed.getFieldOfStudy()).issueYear(ed.getIssueYear()).verificationStatus(ed.getVerificationStatus()).build()).collect(Collectors.toList()) : List.of())
                .build();
    }

    public MentorProfileDto toFullDto(MentorProfile p) {
        return MentorProfileDto.builder()
                .id(p.getId())
                .mentorId(p.getMentor() != null ? p.getMentor().getId() : null)
                .userId(p.getUser() != null ? p.getUser().getId() : null)
                .displayName(p.getDisplayName())
                .headline(p.getHeadline())
                .bio(p.getBio())
                .yearsOfExperience(p.getYearsOfExperience())
                .branchLocation(p.getBranchLocation())
                .phone(p.getPhone())
                .email(p.getEmail())
                .isContactPublic(p.isContactPublic())
                .githubUrl(p.getGithubUrl())
                .linkedinUrl(p.getLinkedinUrl())
                .portfolioUrl(p.getPortfolioUrl())
                .profilePhotoUrl(p.getProfilePhotoUrl())
                .publicationStatus(p.getPublicationStatus())
                .rejectionReason(p.getRejectionReason())
                .reviewedBy(p.getReviewedBy())
                .reviewedAt(p.getReviewedAt())
                .skills(p.getSkills() != null ? p.getSkills().stream().map(s -> SkillDto.builder().id(s.getId()).skillName(s.getSkillName()).proficiencyLevel(s.getProficiencyLevel()).category(s.getCategory()).build()).collect(Collectors.toList()) : List.of())
                .experiences(p.getExperiences() != null ? p.getExperiences().stream().map(e -> ExperienceDto.builder().id(e.getId()).companyName(e.getCompanyName()).roleTitle(e.getRoleTitle()).description(e.getDescription()).startDate(e.getStartDate() != null ? e.getStartDate().toString() : null).endDate(e.getEndDate() != null ? e.getEndDate().toString() : null).isCurrent(e.isCurrent()).build()).collect(Collectors.toList()) : List.of())
                .educations(p.getEducations() != null ? p.getEducations().stream().map(ed -> EducationDto.builder().id(ed.getId()).institution(ed.getInstitution()).degreeOrCertificate(ed.getDegreeOrCertificate()).fieldOfStudy(ed.getFieldOfStudy()).issueYear(ed.getIssueYear()).verificationStatus(ed.getVerificationStatus()).build()).collect(Collectors.toList()) : List.of())
                .build();
    }
}
