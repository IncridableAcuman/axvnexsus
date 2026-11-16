package uz.axm.nexus.branches.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.branches.application.BranchService;
import uz.axm.nexus.branches.application.dto.*;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@Tag(name = "Branch Management", description = "Hududiy filiallar, o'quv markazlari va infratuzilmani boshqarish")
public class BranchController {

    private final BranchService branchService;
    private final ResourceOwnershipService resourceOwnershipService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT', 'OBSERVER')")
    @Operation(summary = "Barcha filiallar ro'yxatini filtrlash va qidirish")
    public ResponseEntity<ApiResponse<List<BranchDto>>> getAllBranches(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String search
    ) {
        List<BranchDto> branches = branchService.getAll(status, region, search);
        return ResponseEntity.ok(ApiResponse.ok("Filiallar ro'yxati olindi", branches));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT', 'OBSERVER')")
    @Operation(summary = "Filial tafsilotlarini olish")
    public ResponseEntity<ApiResponse<BranchDto>> getBranchById(@PathVariable Long id) {
        resourceOwnershipService.verifyBranchAccess(id);
        BranchDto branch = branchService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial ma'lumotlari olindi", branch));
    }

    @GetMapping("/{id}/statistics")
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'OBSERVER')")
    @Operation(summary = "Filial statistikasi, sig'im va o'quvchi ko'rsatkichlarini olish")
    public ResponseEntity<ApiResponse<BranchStatisticsDto>> getBranchStatistics(@PathVariable Long id) {
        resourceOwnershipService.verifyBranchAccess(id);
        BranchStatisticsDto statistics = branchService.getStatistics(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial statistikasi olindi", statistics));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('branches.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Yangi filial qo'shish")
    public ResponseEntity<ApiResponse<BranchDto>> createBranch(@Valid @RequestBody CreateBranchRequest request) {
        String actor = currentUserHelper.getCurrentUsername();
        BranchDto created = branchService.create(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Filial muvaffaqiyatli yaratildi", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('branches.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Filial ma'lumotlarini yangilash")
    public ResponseEntity<ApiResponse<BranchDto>> updateBranch(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBranchRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        BranchDto updated = branchService.update(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Filial ma'lumotlari yangilandi", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('branches.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Filialni o'chirish yoki arxivlash")
    public ResponseEntity<ApiResponse<Void>> deleteBranch(@PathVariable Long id) {
        String actor = currentUserHelper.getCurrentUsername();
        branchService.deleteOrArchive(id, actor);
        return ResponseEntity.ok(ApiResponse.ok("Filial muvaffaqiyatli o'chirildi / arxivlandi", null));
    }

    @GetMapping("/{id}/groups")
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT', 'OBSERVER')")
    @Operation(summary = "Filialga biriktirilgan ta'lim guruhlarini olish")
    public ResponseEntity<ApiResponse<List<BranchGroupDto>>> getBranchGroups(@PathVariable Long id) {
        resourceOwnershipService.verifyBranchAccess(id);
        List<BranchGroupDto> groups = branchService.getBranchGroups(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial guruhlari olindi", groups));
    }

    @GetMapping("/{id}/rooms")
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT', 'OBSERVER')")
    @Operation(summary = "Filialdagi IT xonalari va laboratoriyalarni olish")
    public ResponseEntity<ApiResponse<List<BranchRoomDto>>> getBranchRooms(@PathVariable Long id) {
        resourceOwnershipService.verifyBranchAccess(id);
        List<BranchRoomDto> rooms = branchService.getBranchRooms(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial xonalari olindi", rooms));
    }

    @GetMapping("/{id}/mentors")
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'OBSERVER')")
    @Operation(summary = "Filialga biriktirilgan mentorlarni olish")
    public ResponseEntity<ApiResponse<List<BranchMentorDto>>> getBranchMentors(@PathVariable Long id) {
        resourceOwnershipService.verifyBranchAccess(id);
        List<BranchMentorDto> mentors = branchService.getBranchMentors(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial mentorlari olindi", mentors));
    }

    @GetMapping("/{id}/activity")
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR')")
    @Operation(summary = "Filial audit tarixi va faoliyatini olish")
    public ResponseEntity<ApiResponse<List<BranchActivityDto>>> getBranchAuditLogs(@PathVariable Long id) {
        resourceOwnershipService.verifyBranchAccess(id);
        List<BranchActivityDto> logs = branchService.getBranchAuditLogs(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial audit tarixi olindi", logs));
    }

    @PostMapping("/{id}/rooms")
    @PreAuthorize("hasAuthority('branches.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Filialga yangi laboratoriya/xona qo'shish")
    public ResponseEntity<ApiResponse<BranchRoomDto>> createBranchRoom(
            @PathVariable Long id,
            @Valid @RequestBody CreateRoomRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        BranchRoomDto room = branchService.createRoom(id, request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Xona muvaffaqiyatli qo'shildi", room));
    }

    @PutMapping("/{id}/rooms/{roomId}")
    @PreAuthorize("hasAuthority('branches.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Filial laboratoriya/xonasini tahrirlash")
    public ResponseEntity<ApiResponse<BranchRoomDto>> updateBranchRoom(
            @PathVariable Long id,
            @PathVariable Long roomId,
            @Valid @RequestBody UpdateRoomRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        BranchRoomDto room = branchService.updateRoom(id, roomId, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Xona muvaffaqiyatli yangilandi", room));
    }

    @DeleteMapping("/{id}/rooms/{roomId}")
    @PreAuthorize("hasAuthority('branches.manage') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Filial laboratoriya/xonasini o'chirish yoki nofaol qilish")
    public ResponseEntity<ApiResponse<Void>> deleteBranchRoom(
            @PathVariable Long id,
            @PathVariable Long roomId
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        branchService.deleteOrDeactivateRoom(id, roomId, actor);
        return ResponseEntity.ok(ApiResponse.ok("Xona muvaffaqiyatli o'chirildi / nofaol qilindi", null));
    }
}
