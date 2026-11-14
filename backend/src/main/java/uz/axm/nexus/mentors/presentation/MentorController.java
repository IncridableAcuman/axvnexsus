package uz.axm.nexus.mentors.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.identity.application.ResetPasswordResultDto;
import uz.axm.nexus.mentors.application.*;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.util.List;

@RestController
@RequestMapping("/api/mentors")
@RequiredArgsConstructor
@Tag(name = "Mentors", description = "Mentorlarni boshqarish va HEMIS hisoblarini provizion qilish API lari")
public class MentorController {

    private final MentorService mentorService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping
    @PreAuthorize("hasAuthority('mentors.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'OBSERVER')")
    @Operation(summary = "Barcha mentorlar ro'yxatini olish (qidiruv, filial, status filtri bilan)")
    public ResponseEntity<List<Mentor>> getAllMentors(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status
    ) {
        if ((search != null && !search.isBlank()) || branchId != null || (status != null && !status.isBlank())) {
            return ResponseEntity.ok(mentorService.searchMentors(search, branchId, status));
        }
        return ResponseEntity.ok(mentorService.getAllMentors());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('mentors.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'OBSERVER')")
    @Operation(summary = "Alohida mentor ma'lumotlari, biriktirilgan guruhlar, o'quvchilar soni va yuklamasini olish")
    public ResponseEntity<ApiResponse<MentorDetailDto>> getMentorById(@PathVariable Long id) {
        MentorDetailDto dto = mentorService.getMentorDetailById(id);
        return ResponseEntity.ok(ApiResponse.ok("Mentor ma'lumotlari olindi", dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Mentor ma'lumotlarini tahrirlash")
    public ResponseEntity<ApiResponse<MentorDetailDto>> updateMentor(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMentorRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        MentorDetailDto updated = mentorService.updateMentor(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Mentor ma'lumotlari muvaffaqiyatli yangilandi", updated));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Mentor holatini o'zgartirish (ACTIVE, INACTIVE, ARCHIVED)")
    public ResponseEntity<ApiResponse<MentorDetailDto>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String reason
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        MentorDetailDto updated = mentorService.updateMentorStatus(id, status, reason, actor);
        return ResponseEntity.ok(ApiResponse.ok("Mentor holati muvaffaqiyatli yangilandi", updated));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Mentorni xavfsiz arxivlash (dars jadvallari va o'quv guruhlarini saqlab qolgan holda)")
    public ResponseEntity<ApiResponse<MentorDetailDto>> archiveMentor(
            @PathVariable Long id,
            @RequestParam(required = false) String reason
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        MentorDetailDto archived = mentorService.archiveMentor(id, reason, actor);
        return ResponseEntity.ok(ApiResponse.ok("Mentor muvaffaqiyatli arxivlandi", archived));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Yangi mentor qo'shish yoki mavjudini yangilash")
    public ResponseEntity<Mentor> createMentor(@RequestBody Mentor mentor) {
        return ResponseEntity.ok(mentorService.save(mentor));
    }

    @PostMapping("/provision")
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Admin tomonidan mentor yaratish va HEMIS ID raqami hamda tasodifiy parol berish")
    public ResponseEntity<ApiResponse<MentorProvisionDto>> provisionMentor(@Valid @RequestBody CreateMentorRequest request) {
        MentorProvisionDto dto = mentorService.provisionMentor(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Mentor va uning HEMIS hisobi muvaffaqiyatli yaratildi", dto));
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('mentors.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Admin tomonidan mentor parolini yangi tasodifiy parolga tiklash")
    public ResponseEntity<ApiResponse<ResetPasswordResultDto>> resetPassword(@PathVariable Long id) {
        ResetPasswordResultDto result = mentorService.resetMentorPassword(id);
        return ResponseEntity.ok(ApiResponse.ok("Mentor paroli muvaffaqiyatli yangilandi", result));
    }
}
