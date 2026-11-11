package uz.axm.nexus.audit.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.access.application.UserDto;
import uz.axm.nexus.access.application.UserManagementService;
import uz.axm.nexus.audit.application.*;
import uz.axm.nexus.audit.domain.AuditLog;
import uz.axm.nexus.audit.domain.SystemConfig;
import uz.axm.nexus.grading.domain.GradeRecord;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.application.PageResponse;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Operations & Audit", description = "Modul 04: Administratorlik operatsiyalari, tizim monitoringi, audit jurnallari va kontent moderatsiyasi")
public class AdminOperationsController {

    private final AdminOperationsService adminOperationsService;
    private final AuditService auditService;
    private final UserManagementService userManagementService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Platforma umumiy ko'rsatkichlari va KPI statistikasi")
    public ResponseEntity<ApiResponse<AdminOverviewDto>> getOverview() {
        AdminOverviewDto stats = adminOperationsService.getOverviewStats();
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('users.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Foydalanuvchilarni boshqarish ro'yxati (filtrlash va sahifalash)")
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> getUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PageResponse<UserDto> users = userManagementService.searchUsers(query, role, enabled, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @PutMapping("/users/{id}/status")
    @PreAuthorize("hasAuthority('users.disable') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Foydalanuvchini bloklash / faollashtirish (Auditga qayd etiladi)")
    public ResponseEntity<ApiResponse<UserDto>> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            HttpServletRequest httpRequest
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        String ip = httpRequest.getRemoteAddr();
        UserDto updated = adminOperationsService.updateUserStatus(id, request, actor, ip);
        return ResponseEntity.ok(ApiResponse.ok("Foydalanuvchi holati yangilandi", updated));
    }

    @PutMapping("/users/{id}/roles")
    @PreAuthorize("hasAuthority('roles.assign') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Foydalanuvchi rollarini boshqarish (Auditga qayd etiladi)")
    public ResponseEntity<ApiResponse<UserDto>> updateUserRoles(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRolesRequest request,
            HttpServletRequest httpRequest
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        String ip = httpRequest.getRemoteAddr();
        UserDto updated = adminOperationsService.updateUserRoles(id, request, actor, ip);
        return ResponseEntity.ok(ApiResponse.ok("Foydalanuvchi rollari yangilandi", updated));
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('audit.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Audit jurnallarini qidirish va filtrlash")
    public ResponseEntity<ApiResponse<PageResponse<AuditLog>>> getAuditLogs(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityName,
            @RequestParam(required = false) String performedBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> auditPage = auditService.searchAuditLogs(query, action, entityName, performedBy, from, to, pageRequest);

        PageResponse<AuditLog> pageResponse = PageResponse.<AuditLog>builder()
                .content(auditPage.getContent())
                .page(auditPage.getNumber())
                .size(auditPage.getSize())
                .totalElements(auditPage.getTotalElements())
                .totalPages(auditPage.getTotalPages())
                .last(auditPage.isLast())
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Audit jurnallari olindi", pageResponse));
    }

    @GetMapping("/audit-logs/export")
    @PreAuthorize("hasAuthority('audit.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Audit jurnallarini CSV yoki JSON formatda eksport qilish (Audited)")
    public ResponseEntity<byte[]> exportAuditLogs(
            @RequestParam(defaultValue = "csv") String format,
            HttpServletRequest httpRequest
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        String ip = httpRequest.getRemoteAddr();
        byte[] data = auditService.exportAuditLogs(format, actor, ip);

        String filename = "audit_report_" + System.currentTimeMillis() + ("json".equalsIgnoreCase(format) ? ".json" : ".csv");
        MediaType mediaType = "json".equalsIgnoreCase(format) ? MediaType.APPLICATION_JSON : MediaType.parseMediaType("text/csv");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(data);
    }

    @GetMapping("/system-config")
    @PreAuthorize("hasAuthority('system.configure') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Tizim konfiguratsiya parametrlarini ko'rish (Maxfiylik himoyalangan)")
    public ResponseEntity<ApiResponse<List<SystemConfig>>> getSystemConfigs() {
        List<SystemConfig> configs = adminOperationsService.getSystemConfigs();
        return ResponseEntity.ok(ApiResponse.ok(configs));
    }

    @PutMapping("/system-config")
    @PreAuthorize("hasAuthority('system.configure') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Tizim konfiguratsiya parametrini yangilash (Auditga qayd etiladi)")
    public ResponseEntity<ApiResponse<SystemConfig>> updateSystemConfig(
            @Valid @RequestBody UpdateSystemConfigRequest request,
            HttpServletRequest httpRequest
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        String ip = httpRequest.getRemoteAddr();
        SystemConfig updated = adminOperationsService.updateSystemConfig(request, actor, ip);
        return ResponseEntity.ok(ApiResponse.ok("Tizim parametri yangilandi", updated));
    }

    @GetMapping("/health-overview")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'OBSERVER')")
    @Operation(summary = "Tizim operatsion holati va infratuzilma salomatligi")
    public ResponseEntity<ApiResponse<OperationalHealthDto>> getHealthOverview() {
        OperationalHealthDto health = adminOperationsService.getOperationalHealth();
        return ResponseEntity.ok(ApiResponse.ok(health));
    }

    @PostMapping("/content-moderation")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'CONTENT_MANAGER')")
    @Operation(summary = "Ta'lim materiallari va darslarni moderatsiya qilish (Auditga qayd etiladi)")
    public ResponseEntity<ApiResponse<Void>> moderateContent(
            @Valid @RequestBody ContentModerationRequest request,
            HttpServletRequest httpRequest
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        String ip = httpRequest.getRemoteAddr();
        adminOperationsService.moderateContent(request, actor, ip);
        return ResponseEntity.ok(ApiResponse.ok("Kontent moderatsiyadan o'tkazildi", null));
    }

    @PostMapping("/grade-override")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Bahoni asosli qayta ko'rib chiqish va override qilish (Auditga qayd etiladi)")
    public ResponseEntity<ApiResponse<GradeRecord>> overrideGrade(
            @Valid @RequestBody GradeOverrideRequest request,
            HttpServletRequest httpRequest
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        String ip = httpRequest.getRemoteAddr();
        GradeRecord record = adminOperationsService.overrideGrade(request, actor, ip);
        return ResponseEntity.ok(ApiResponse.ok("Baho yangilandi va auditga kiritildi", record));
    }
}
