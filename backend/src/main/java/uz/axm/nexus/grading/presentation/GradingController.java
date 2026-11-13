package uz.axm.nexus.grading.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.grading.application.GradingAndGamificationService;
import uz.axm.nexus.grading.domain.GradeRecord;
import uz.axm.nexus.grading.domain.PointTransaction;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/grading", "/api/v1/grading"})
@RequiredArgsConstructor
@Tag(name = "Grading & Gamification", description = "Modul 11: Ballar, reyting, akademik baholar va gamifikatsiya yutuqlari")
public class GradingController {

    private final GradingAndGamificationService gradingService;
    private final ResourceOwnershipService resourceOwnershipService;
    private final CurrentUserHelper currentUserHelper;

    // Academic Grades
    @PostMapping("/grades")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Akademik bahoni qayd qilish")
    public ResponseEntity<GradeRecord> recordGrade(@RequestBody GradeRecord record) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gradingService.recordGrade(record));
    }

    @GetMapping("/grades/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining akademik baholari")
    public ResponseEntity<List<GradeRecord>> getMyGrades() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        return ResponseEntity.ok(gradingService.getStudentGrades(currentStudentId));
    }

    @GetMapping("/grades/student/{studentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining barcha fanlar bo'yicha akademik baholari")
    public ResponseEntity<List<GradeRecord>> getStudentGrades(@PathVariable Long studentId) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        return ResponseEntity.ok(gradingService.getStudentGrades(studentId));
    }

    // Gamification Points
    @PostMapping("/points")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "O'quvchiga ball (XP) berish (Takroriy hisoblashdan himoyalangan)")
    public ResponseEntity<PointTransaction> awardPoints(@RequestBody Map<String, Object> payload) {
        Long studentId = ((Number) payload.get("studentId")).longValue();
        int amount = ((Number) payload.get("amount")).intValue();
        String source = (String) payload.get("pointSource");
        String refId = payload.containsKey("referenceId") ? (String) payload.get("referenceId") : null;
        String refType = payload.containsKey("referenceType") ? (String) payload.get("referenceType") : null;
        String idempKey = payload.containsKey("idempotencyKey") ? (String) payload.get("idempotencyKey") : null;
        String reason = (String) payload.get("reason");
        Long awardedBy = payload.containsKey("awardedByUserId") && payload.get("awardedByUserId") != null
                ? ((Number) payload.get("awardedByUserId")).longValue() : null;

        return ResponseEntity.ok(gradingService.awardPoints(studentId, amount, source, refId, refType, idempKey, reason, awardedBy));
    }

    @PostMapping("/points/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Ballni to'g'rilash (Korrektirovka) — Majburiy izoh talab qilinadi")
    public ResponseEntity<PointTransaction> adjustPoints(@RequestBody Map<String, Object> payload) {
        Long studentId = ((Number) payload.get("studentId")).longValue();
        int delta = ((Number) payload.get("deltaAmount")).intValue();
        String reason = (String) payload.get("reason");
        Long authorizedUserId = payload.containsKey("authorizedUserId") && payload.get("authorizedUserId") != null
                ? ((Number) payload.get("authorizedUserId")).longValue() : null;

        return ResponseEntity.ok(gradingService.recordAdjustment(studentId, delta, reason, authorizedUserId));
    }

    @GetMapping("/points/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining ball tranzaksiyalari tarixi")
    public ResponseEntity<List<PointTransaction>> getMyTransactions() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        return ResponseEntity.ok(gradingService.getStudentPointTransactions(currentStudentId));
    }

    @GetMapping("/points/student/{studentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining ball tranzaksiyalari tarixi")
    public ResponseEntity<List<PointTransaction>> getStudentTransactions(@PathVariable Long studentId) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        return ResponseEntity.ok(gradingService.getStudentPointTransactions(studentId));
    }

    // Leaderboards
    @GetMapping("/leaderboard")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Talabalar reytingi (Haftalik, Oylik, Umumiy)")
    public ResponseEntity<List<GradingAndGamificationService.LeaderboardEntry>> getLeaderboard(
            @RequestParam(defaultValue = "ALL_TIME") String period
    ) {
        return ResponseEntity.ok(gradingService.getLeaderboard(period));
    }

    @GetMapping("/leaderboard/groups")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Guruhlar umumiy reytingi")
    public ResponseEntity<List<GradingAndGamificationService.GroupLeaderboardEntry>> getGroupLeaderboard() {
        return ResponseEntity.ok(gradingService.getGroupLeaderboard());
    }

    @GetMapping("/profile/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining shaxsiy gamifikatsiya profili (XP, rank, yutuqlar, streak)")
    public ResponseEntity<GradingAndGamificationService.StudentGamificationProfile> getMyProfile() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        return ResponseEntity.ok(gradingService.getStudentProfile(currentStudentId));
    }

    @GetMapping("/profile/{studentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining gamifikatsiya profili (XP, rank, yutuqlar, streak)")
    public ResponseEntity<GradingAndGamificationService.StudentGamificationProfile> getStudentProfile(
            @PathVariable Long studentId
    ) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        return ResponseEntity.ok(gradingService.getStudentProfile(studentId));
    }

    // Daily Streak & Indicators
    @PostMapping("/streak/check-in")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kunlik streak'ga erishish (Daily Check-in) va bonus XP olish")
    public ResponseEntity<GradingAndGamificationService.StreakCheckInResult> checkInStreak(
            @RequestParam(required = false) Long studentId,
            @RequestParam(defaultValue = "DAILY_CHECKIN") String activityType
    ) {
        Long targetStudentId = studentId;
        if (targetStudentId == null || currentUserHelper.isStudent()) {
            targetStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        } else {
            resourceOwnershipService.verifyStudentAccess(targetStudentId);
        }
        return ResponseEntity.ok(gradingService.recordDailyActivity(targetStudentId, activityType));
    }

    @GetMapping("/streak/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining streak ko'rsatkichi va intizom tarixi")
    public ResponseEntity<GradingAndGamificationService.StreakStatusDto> getMyStreak() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        return ResponseEntity.ok(gradingService.getStudentStreak(currentStudentId));
    }

    @GetMapping("/streak/student/{studentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining joriy streak ko'rsatkichi va intizom tarixi")
    public ResponseEntity<GradingAndGamificationService.StreakStatusDto> getStudentStreak(
            @PathVariable Long studentId
    ) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        return ResponseEntity.ok(gradingService.getStudentStreak(studentId));
    }

    @GetMapping("/metrics")
    @PreAuthorize("hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'OBSERVER')")
    @Operation(summary = "Gamifikatsiya, ballar va baholash mezonlari ko'rsatkichlari")
    public ResponseEntity<GradingAndGamificationService.GamificationMetricsDto> getGamificationMetrics() {
        return ResponseEntity.ok(gradingService.getGamificationMetrics());
    }
}
