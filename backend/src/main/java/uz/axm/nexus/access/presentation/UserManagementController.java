package uz.axm.nexus.access.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.access.application.AssignRolesRequest;
import uz.axm.nexus.access.application.RbacService;
import uz.axm.nexus.access.application.UpdateUserStatusRequest;
import uz.axm.nexus.access.application.UserDto;
import uz.axm.nexus.access.application.UserManagementService;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.application.PageResponse;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Management & RBAC", description = "Modul 04: Foydalanuvchilarni qidirish, ko'p rolli biriktirish va audit bilan to'xtatish (suspend)")
public class UserManagementController {

    private final UserManagementService userManagementService;
    private final RbacService rbacService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'OBSERVER') or hasAuthority('users.read')")
    @Operation(summary = "Foydalanuvchilarni sahifalab va filtrlar (qidiruv, rol, status) bo'yicha olish")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> searchUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PageResponse<UserDto> response = userManagementService.searchUsers(query, role, enabled, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.ok("Foydalanuvchilar ro'yxati olindi", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'OBSERVER') or hasAuthority('users.read')")
    @Operation(summary = "Foydalanuvchi ma'lumotlarini (barcha biriktirilgan rollari va huquqlari bilan) olish")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Long id) {
        UserDto dto = userManagementService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.ok("Foydalanuvchi ma'lumotlari olindi", dto));
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN') or hasAuthority('roles.assign')")
    @Operation(summary = "Foydalanuvchiga bir vaqtda bir nechta rollarni biriktirish (Multi-Role)")
    public ResponseEntity<ApiResponse<UserDto>> assignRoles(
            @PathVariable Long id,
            @Valid @RequestBody AssignRolesRequest request
    ) {
        String effectiveActor = currentUserHelper.getCurrentUsername();
        UserDto dto = rbacService.assignRolesToUser(id, request.getRoles(), effectiveActor);
        return ResponseEntity.ok(ApiResponse.ok("Foydalanuvchi rollari muvaffaqiyatli yangilandi", dto));
    }

    @DeleteMapping("/{id}/roles/{roleName}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN') or hasAuthority('roles.assign')")
    @Operation(summary = "Foydalanuvchidan ma'lum rolni bekor qilish (Revoke Role)")
    public ResponseEntity<ApiResponse<UserDto>> revokeRole(
            @PathVariable Long id,
            @PathVariable String roleName
    ) {
        String effectiveActor = currentUserHelper.getCurrentUsername();
        UserDto dto = rbacService.revokeRoleFromUser(id, roleName, effectiveActor);
        return ResponseEntity.ok(ApiResponse.ok("Rol muvaffaqiyatli olib tashlandi", dto));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN') or hasAuthority('users.disable')")
    @Operation(summary = "Foydalanuvchi hisobini faollashtirish yoki to'xtatib qo'yish (Suspension/Activation)")
    public ResponseEntity<ApiResponse<UserDto>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        String effectiveActor = currentUserHelper.getCurrentUsername();
        UserDto dto = rbacService.updateUserStatus(id, request.isEnabled(), request.getReason(), effectiveActor);
        return ResponseEntity.ok(ApiResponse.ok("Foydalanuvchi hisobi holati yangilandi", dto));
    }
}
