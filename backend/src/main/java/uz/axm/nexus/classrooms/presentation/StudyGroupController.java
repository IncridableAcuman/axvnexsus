package uz.axm.nexus.classrooms.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.classrooms.application.EducationStructureService;
import uz.axm.nexus.classrooms.application.EnrollStudentRequest;
import uz.axm.nexus.classrooms.application.GroupDetailDto;
import uz.axm.nexus.classrooms.application.GroupMembershipDto;
import uz.axm.nexus.classrooms.application.TransferStudentRequest;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@Tag(name = "Education Structure & Groups", description = "O'quv guruhlari, a'zolik tarixi va o'quvchilarni guruhlararo ko'chirish")
public class StudyGroupController {

    private final EducationStructureService educationStructureService;
    private final CurrentUserHelper currentUserHelper;
    private final ResourceOwnershipService resourceOwnershipService;

    @GetMapping
    @PreAuthorize("hasAuthority('groups.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT', 'OBSERVER')")
    @Operation(summary = "Guruhlar ro'yxatini filtrlash (sinf, mentor, status, qidiruv)")
    public ResponseEntity<List<StudyGroup>> getGroups(
            @RequestParam(required = false) String gradeLevel,
            @RequestParam(required = false) Long mentorId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(educationStructureService.getGroups(gradeLevel, mentorId, status, search));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('groups.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT')")
    @Operation(summary = "Guruh tafsilotlari, o'quvchilar ro'yxati va sig'im ma'lumotlarini olish")
    public ResponseEntity<ApiResponse<GroupDetailDto>> getGroupDetail(@PathVariable Long id) {
        Long resolvedMentorId = currentUserHelper.isMentor()
                ? resourceOwnershipService.getCurrentMentor().map(Mentor::getId).orElse(null)
                : null;
        GroupDetailDto detail = educationStructureService.getGroupDetail(id, resolvedMentorId);
        return ResponseEntity.ok(ApiResponse.ok("Guruh tafsilotlari olindi", detail));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('groups.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Yangi ta'lim guruhini yaratish")
    public ResponseEntity<ApiResponse<StudyGroup>> createGroup(
            @Valid @RequestBody StudyGroup group,
            @RequestParam(required = false) Long academicPeriodId,
            @RequestParam(required = false) Long mentorId
    ) {
        StudyGroup created = educationStructureService.createGroup(group, academicPeriodId, mentorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Guruh muvaffaqiyatli ochildi", created));
    }

    @PostMapping("/{id}/students")
    @PreAuthorize("hasAuthority('groups.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "O'quvchini guruhga a'zo qilib biriktirish")
    public ResponseEntity<ApiResponse<GroupMembershipDto>> enrollStudent(
            @PathVariable Long id,
            @Valid @RequestBody EnrollStudentRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        GroupMembershipDto membership = educationStructureService.enrollStudent(id, request.getStudentId(), actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("O'quvchi guruhga biriktirildi", membership));
    }

    @PostMapping("/{id}/students/{studentId}/transfer")
    @PreAuthorize("hasAuthority('groups.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "O'quvchini boshqa guruhga ko'chirish (tarixni saqlagan holda)")
    public ResponseEntity<ApiResponse<GroupMembershipDto>> transferStudent(
            @PathVariable Long id,
            @PathVariable Long studentId,
            @Valid @RequestBody TransferStudentRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        GroupMembershipDto result = educationStructureService.transferStudent(id, studentId, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("O'quvchi muvaffaqiyatli ko'chirildi", result));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAuthority('groups.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'OBSERVER')")
    @Operation(summary = "Guruh a'zolik va ko'chirishlar tarixini ko'rish")
    public ResponseEntity<ApiResponse<List<GroupMembershipDto>>> getGroupHistory(@PathVariable Long id) {
        List<GroupMembershipDto> history = educationStructureService.getGroupHistory(id);
        return ResponseEntity.ok(ApiResponse.ok("Guruh a'zolik tarixi olindi", history));
    }

    @GetMapping("/students/{studentId}/history")
    @PreAuthorize("hasAuthority('groups.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'STUDENT')")
    @Operation(summary = "O'quvchining barcha guruhlar bo'yicha ko'chish tarixini ko'rish")
    public ResponseEntity<ApiResponse<List<GroupMembershipDto>>> getStudentHistory(@PathVariable Long studentId) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        List<GroupMembershipDto> history = educationStructureService.getStudentHistory(studentId);
        return ResponseEntity.ok(ApiResponse.ok("O'quvchi ko'chish tarixi olindi", history));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('groups.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Guruh holatini yangilash (ACTIVE, ARCHIVED, COMPLETED)")
    public ResponseEntity<ApiResponse<StudyGroup>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        StudyGroup updated = educationStructureService.updateGroupStatus(id, status, actor);
        return ResponseEntity.ok(ApiResponse.ok("Guruh holati yangilandi", updated));
    }
}
