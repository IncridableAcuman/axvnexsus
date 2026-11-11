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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/grading")
@RequiredArgsConstructor
@Tag(name = "Grading & Gamification", description = "Modul 11: Ballar, reyting, akademik baholar va gamifikatsiya yutuqlari")
public class GradingController {

    private final GradingAndGamificationService gradingService;

    // Academic Grades
    @PostMapping("/grades")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Akademik bahoni qayd qilish")
    public ResponseEntity<GradeRecord> recordGrade(@RequestBody GradeRecord record) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gradingService.recordGrade(record));
    }

    @GetMapping("/grades/student/{studentId}")
    @Operation(summary = "O'quvchining barcha fanlar bo'yicha akademik baholari")
    public ResponseEntity<List<GradeRecord>> getStudentGrades(@PathVariable Long studentId) {
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

    @GetMapping("/points/student/{studentId}")
    @Operation(summary = "O'quvchining ball tranzaksiyalari tarixi")
    public ResponseEntity<List<PointTransaction>> getStudentTransactions(@PathVariable Long studentId) {
        return ResponseEntity.ok(gradingService.getStudentPointTransactions(studentId));
    }

    // Leaderboards
    @GetMapping("/leaderboard")
    @Operation(summary = "Talabalar reytingi (Haftalik, Oylik, Umumiy)")
    public ResponseEntity<List<GradingAndGamificationService.LeaderboardEntry>> getLeaderboard(
            @RequestParam(defaultValue = "ALL_TIME") String period
    ) {
        return ResponseEntity.ok(gradingService.getLeaderboard(period));
    }

    @GetMapping("/leaderboard/groups")
    @Operation(summary = "Guruhlar umumiy reytingi")
    public ResponseEntity<List<GradingAndGamificationService.GroupLeaderboardEntry>> getGroupLeaderboard() {
        return ResponseEntity.ok(gradingService.getGroupLeaderboard());
    }

    @GetMapping("/profile/{studentId}")
    @Operation(summary = "O'quvchining gamifikatsiya profili (XP, rank, yutuqlar, streak)")
    public ResponseEntity<GradingAndGamificationService.StudentGamificationProfile> getStudentProfile(
            @PathVariable Long studentId
    ) {
        return ResponseEntity.ok(gradingService.getStudentProfile(studentId));
    }

    // Daily Streak & Indicators
    @PostMapping("/streak/check-in")
    @Operation(summary = "Kunlik streak'ga erishish (Daily Check-in) va bonus XP olish")
    public ResponseEntity<GradingAndGamificationService.StreakCheckInResult> checkInStreak(
            @RequestParam Long studentId,
            @RequestParam(defaultValue = "DAILY_CHECKIN") String activityType
    ) {
        return ResponseEntity.ok(gradingService.recordDailyActivity(studentId, activityType));
    }

    @GetMapping("/streak/student/{studentId}")
    @Operation(summary = "O'quvchining joriy streak ko'rsatkichi va intizom tarixi")
    public ResponseEntity<GradingAndGamificationService.StreakStatusDto> getStudentStreak(
            @PathVariable Long studentId
    ) {
        return ResponseEntity.ok(gradingService.getStudentStreak(studentId));
    }

    @GetMapping("/metrics")
    @Operation(summary = "Gamifikatsiya, ballar va baholash mezonlari ko'rsatkichlari")
    public ResponseEntity<GradingAndGamificationService.GamificationMetricsDto> getGamificationMetrics() {
        return ResponseEntity.ok(gradingService.getGamificationMetrics());
    }
}
