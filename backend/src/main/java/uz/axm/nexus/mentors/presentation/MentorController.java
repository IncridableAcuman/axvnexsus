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
import uz.axm.nexus.mentors.application.CreateMentorRequest;
import uz.axm.nexus.mentors.application.MentorProvisionDto;
import uz.axm.nexus.mentors.application.MentorService;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.shared.application.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/api/mentors")
@RequiredArgsConstructor
@Tag(name = "Mentors", description = "Mentorlarni boshqarish va HEMIS hisoblarini provizion qilish API lari")
public class MentorController {

    private final MentorService mentorService;

    @GetMapping
    @PreAuthorize("hasAuthority('mentors.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'OBSERVER')")
    @Operation(summary = "Barcha mentorlar ro'yxatini olish")
    public ResponseEntity<List<Mentor>> getAllMentors() {
        return ResponseEntity.ok(mentorService.getAllMentors());
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
