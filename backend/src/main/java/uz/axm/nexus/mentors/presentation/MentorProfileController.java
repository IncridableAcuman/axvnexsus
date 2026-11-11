package uz.axm.nexus.mentors.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.mentors.application.MentorProfileDto;
import uz.axm.nexus.mentors.application.MentorProfileService;
import uz.axm.nexus.mentors.application.PublicMentorProfileDto;
import uz.axm.nexus.mentors.application.ReviewProfileRequest;
import uz.axm.nexus.mentors.application.UpdateMentorProfileRequest;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.domain.User;

import java.util.List;

@RestController
@RequestMapping("/api/mentors")
@RequiredArgsConstructor
@Tag(name = "Mentor Profiles & Showcase", description = "Modul 06: Mentorlarning ommaviy va ichki profillari, ko'nikmalari hamda ma'muriy moderatsiya")
public class MentorProfileController {

    private final MentorProfileService mentorProfileService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping("/public")
    @Operation(summary = "Tasdiqlangan va ommaga e'lon qilingan mentor profillarini olish (maxfiy kontaktlarsiz)")
    public ResponseEntity<ApiResponse<List<PublicMentorProfileDto>>> getPublicProfiles() {
        List<PublicMentorProfileDto> profiles = mentorProfileService.getPublicProfiles();
        return ResponseEntity.ok(ApiResponse.ok("Ommaviy mentorlar ro'yxati olindi", profiles));
    }

    @GetMapping("/public/{id}")
    @Operation(summary = "Alohida mentorning ommaviy profiling olish")
    public ResponseEntity<ApiResponse<PublicMentorProfileDto>> getPublicProfileById(@PathVariable Long id) {
        PublicMentorProfileDto profile = mentorProfileService.getPublicProfileById(id);
        return ResponseEntity.ok(ApiResponse.ok("Mentor profili olindi", profile));
    }

    @GetMapping("/{mentorId}/profile")
    @PreAuthorize("hasAuthority('mentors.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Mentorning to'liq profiling olish (tahrirlash yoki admin ko'rishi uchun)")
    public ResponseEntity<ApiResponse<MentorProfileDto>> getProfileByMentorId(@PathVariable Long mentorId) {
        MentorProfileDto profile = mentorProfileService.getProfileByMentorId(mentorId);
        return ResponseEntity.ok(ApiResponse.ok("To'liq profil olindi", profile));
    }

    @PutMapping("/{mentorId}/profile")
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MENTOR')")
    @Operation(summary = "Mentor profiling ma'lumotlarini tahrirlash")
    public ResponseEntity<ApiResponse<MentorProfileDto>> updateProfile(
            @PathVariable Long mentorId,
            @Valid @RequestBody UpdateMentorProfileRequest request
    ) {
        Long callerUserId = currentUserHelper.getCurrentUserId();
        String callerRole = currentUserHelper.getCurrentUser().map(User::getRole).orElse("ROLE_MENTOR");
        MentorProfileDto updated = mentorProfileService.updateProfile(mentorId, request, callerUserId, callerRole);
        return ResponseEntity.ok(ApiResponse.ok("Mentor profili yangilandi", updated));
    }

    @GetMapping("/profiles/admin")
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Administrator uchun barcha mentor profillarini (statuslari bilan) ko'rish")
    public ResponseEntity<ApiResponse<List<MentorProfileDto>>> getAllProfilesForAdmin() {
        List<MentorProfileDto> profiles = mentorProfileService.getAllProfilesForAdmin();
        return ResponseEntity.ok(ApiResponse.ok("Barcha profillar olindi", profiles));
    }

    @PatchMapping("/profiles/{profileId}/review")
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Mentor profilini tasdiqlash yoki rad etish (Administrative Review)")
    public ResponseEntity<ApiResponse<MentorProfileDto>> reviewProfile(
            @PathVariable Long profileId,
            @Valid @RequestBody ReviewProfileRequest request
    ) {
        String reviewerUsername = currentUserHelper.getCurrentUsername();
        MentorProfileDto reviewed = mentorProfileService.reviewProfile(profileId, request, reviewerUsername);
        return ResponseEntity.ok(ApiResponse.ok("Mentor profili muvaffaqiyatli ko'rib chiqildi", reviewed));
    }
}
