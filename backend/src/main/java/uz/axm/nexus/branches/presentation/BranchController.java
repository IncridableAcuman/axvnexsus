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
import uz.axm.nexus.branches.application.dto.BranchDto;
import uz.axm.nexus.branches.application.dto.BranchStatisticsDto;
import uz.axm.nexus.branches.application.dto.CreateBranchRequest;
import uz.axm.nexus.branches.application.dto.UpdateBranchRequest;
import uz.axm.nexus.classrooms.domain.Room;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@Tag(name = "Branch Management", description = "Hududiy filiallar, o'quv markazlari va infratuzilmani boshqarish")
public class BranchController {

    private final BranchService branchService;
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
        BranchDto branch = branchService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial ma'lumotlari olindi", branch));
    }

    @GetMapping("/{id}/statistics")
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR')")
    @Operation(summary = "Filial statistikasi, sig'im va o'quvchi ko'rsatkichlarini olish")
    public ResponseEntity<ApiResponse<BranchStatisticsDto>> getBranchStatistics(@PathVariable Long id) {
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
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT')")
    @Operation(summary = "Filialga biriktirilgan ta'lim guruhlarini olish")
    public ResponseEntity<ApiResponse<List<StudyGroup>>> getBranchGroups(@PathVariable Long id) {
        List<StudyGroup> groups = branchService.getBranchGroups(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial guruhlari olindi", groups));
    }

    @GetMapping("/{id}/rooms")
    @PreAuthorize("hasAuthority('branches.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR')")
    @Operation(summary = "Filialdagi IT xonalari va laboratoriyalarni olish")
    public ResponseEntity<ApiResponse<List<Room>>> getBranchRooms(@PathVariable Long id) {
        List<Room> rooms = branchService.getBranchRooms(id);
        return ResponseEntity.ok(ApiResponse.ok("Filial xonalari olindi", rooms));
    }
}
