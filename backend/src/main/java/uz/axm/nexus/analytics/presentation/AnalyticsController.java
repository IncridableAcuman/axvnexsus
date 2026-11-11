package uz.axm.nexus.analytics.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.analytics.application.AnalyticsAuthorizationService;
import uz.axm.nexus.analytics.application.AnalyticsService;
import uz.axm.nexus.analytics.domain.*;
import uz.axm.nexus.users.domain.User;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics & Verification", description = "Modul 12: Rasmiy hisobotlar va tekshirilgan metrikalar tahlili")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final AnalyticsAuthorizationService authorizationService;

    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'OBSERVER')")
    @Operation(summary = "Tizim bo'yicha umumiy KPI va guruhlar solishtiruvi")
    public ResponseEntity<DashboardOverviewDto> getSystemOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        return ResponseEntity.ok(analyticsService.getSystemOverview(from, to, requester));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Individual o'quvchi rivojlanish hisoboti va davomat statistikasi")
    public ResponseEntity<IndividualStudentAnalyticsDto> getStudentAnalytics(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        return ResponseEntity.ok(analyticsService.getIndividualStudentAnalytics(studentId, from, to, requester));
    }

    @GetMapping("/group/{groupId}")
    @PreAuthorize("hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Guruh ko'rsatkichlari, o'rtacha ballar va o'zlashtirish tahlili")
    public ResponseEntity<GroupAnalyticsDto> getGroupAnalytics(
            @PathVariable Long groupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        return ResponseEntity.ok(analyticsService.getGroupAnalytics(groupId, from, to, requester));
    }

    @GetMapping("/assessment/{assessmentId}")
    @PreAuthorize("hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Test yoki oraliq nazorat bo'yicha batafsil tahlil")
    public ResponseEntity<AssessmentAnalyticsDto> getAssessmentAnalytics(
            @PathVariable Long assessmentId
    ) {
        User requester = authorizationService.resolveCurrentUser();
        return ResponseEntity.ok(analyticsService.getAssessmentAnalytics(assessmentId, requester));
    }

    @GetMapping("/mentor/{mentorId}")
    @PreAuthorize("hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'OBSERVER')")
    @Operation(summary = "Mentor pedagogik faolligi va yuklamasi hisoboti")
    public ResponseEntity<MentorActivityAnalyticsDto> getMentorActivity(
            @PathVariable Long mentorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        return ResponseEntity.ok(analyticsService.getMentorActivityAnalytics(mentorId, from, to, requester));
    }

    @GetMapping("/subjects")
    @PreAuthorize("hasAuthority('analytics.read') or isAuthenticated()")
    @Operation(summary = "Fanlar kesimida o'zlashtirish ko'rsatkichlari")
    public ResponseEntity<List<SubjectPerformanceDto>> getSubjectPerformance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(analyticsService.getSubjectLevelPerformance(from, to));
    }

    @GetMapping("/academic-period/{periodId}")
    @PreAuthorize("hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'OBSERVER')")
    @Operation(summary = "Semestr / O'quv davri bo'yicha jamlangan xulosa hisobot")
    public ResponseEntity<AcademicPeriodSummaryDto> getAcademicPeriodSummary(
            @PathVariable Long periodId
    ) {
        User requester = authorizationService.resolveCurrentUser();
        return ResponseEntity.ok(analyticsService.getAcademicPeriodSummary(periodId, requester));
    }

    @GetMapping("/rules")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Hisoblash qoidalari, maxrajlar va formulalar hujjati")
    public ResponseEntity<MetricRuleDocumentationDto> getRulesDocumentation() {
        return ResponseEntity.ok(analyticsService.getRuleDocumentation());
    }
}
