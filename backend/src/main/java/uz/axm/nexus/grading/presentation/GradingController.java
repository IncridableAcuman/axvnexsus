package uz.axm.nexus.grading.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.grading.application.GamificationConfigService;
import uz.axm.nexus.grading.application.GradingAndGamificationService;
import uz.axm.nexus.grading.domain.*;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/grading", "/api/v1/grading"})
@RequiredArgsConstructor
@Tag(name = "Grading & Gamification", description = "Modul 11: Ballar, reyting, akademik baholar va gamifikatsiya yutuqlari")
public class GradingController {

    private final GradingAndGamificationService gradingService;
    private final GamificationConfigService configService;
    private final ResourceOwnershipService resourceOwnershipService;
    private final CurrentUserHelper currentUserHelper;

    // =========================================================================
    // 1. ACADEMIC GRADES
    // =========================================================================

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

    // =========================================================================
    // 2. GAMIFICATION XP & TRANSACTIONS
    // =========================================================================

    @PostMapping("/points")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "O'quvchiga ball (XP) berish (Takroriy hisoblashdan himoyalangan)")
    public ResponseEntity<PointTransaction> awardPoints(@RequestBody Map<String, Object> payload) {
        String source = (String) payload.get("pointSource");
        if ("ADJUSTMENT".equalsIgnoreCase(source) && !currentUserHelper.isAdmin()) {
            throw new org.springframework.security.access.AccessDeniedException("Ballni to'g'rilash (ADJUSTMENT) faqat administratorlar uchun ruxsat etilgan!");
        }

        Long studentId = ((Number) payload.get("studentId")).longValue();
        int amount = ((Number) payload.get("amount")).intValue();
        String refId = payload.containsKey("referenceId") ? (String) payload.get("referenceId") : null;
        String refType = payload.containsKey("referenceType") ? (String) payload.get("referenceType") : null;
        String idempKey = payload.containsKey("idempotencyKey") ? (String) payload.get("idempotencyKey") : null;
        String reason = (String) payload.get("reason");
        Long awardedBy = currentUserHelper.getCurrentUserId();

        return ResponseEntity.ok(gradingService.awardPoints(studentId, amount, source, refId, refType, idempKey, reason, awardedBy));
    }

    @GetMapping("/points/me/total")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining jami to'plagan balli (XP)")
    public ResponseEntity<Map<String, Object>> getMyTotalPoints() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        int total = gradingService.getStudentTotalPoints(currentStudentId);
        return ResponseEntity.ok(Map.of("studentId", currentStudentId, "totalXp", total));
    }

    @GetMapping("/points/student/{studentId}/total")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining jami to'plagan balli (XP)")
    public ResponseEntity<Map<String, Object>> getStudentTotalPoints(@PathVariable Long studentId) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        int total = gradingService.getStudentTotalPoints(studentId);
        return ResponseEntity.ok(Map.of("studentId", studentId, "totalXp", total));
    }

    @GetMapping("/points/period")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Belgilangan davr oralig'ida to'plangan XP miqdori")
    public ResponseEntity<Map<String, Object>> getPointsByPeriod(
            @RequestParam(required = false) Long studentId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime endDate
    ) {
        Long targetStudentId = studentId;
        if (targetStudentId == null || currentUserHelper.isStudent()) {
            targetStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        } else {
            resourceOwnershipService.verifyStudentAccess(targetStudentId);
        }
        int earned = gradingService.getPointsByStudentAndPeriod(targetStudentId, startDate, endDate);
        return ResponseEntity.ok(Map.of(
                "studentId", targetStudentId,
                "startDate", startDate,
                "endDate", endDate,
                "earnedXp", earned
        ));
    }

    @PostMapping("/points/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Ballni to'g'rilash (Korrektirovka) — Majburiy izoh talab qilinadi")
    public ResponseEntity<PointTransaction> adjustPoints(@RequestBody Map<String, Object> payload) {
        Long studentId = ((Number) payload.get("studentId")).longValue();
        int delta = ((Number) payload.get("deltaAmount")).intValue();
        String reason = (String) payload.get("reason");
        Long authorizedUserId = currentUserHelper.getCurrentUserId();

        return ResponseEntity.ok(gradingService.recordAdjustment(studentId, delta, reason, authorizedUserId));
    }

    @GetMapping("/points/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining ball tranzaksiyalari tarixi")
    public ResponseEntity<List<PointTransaction>> getMyTransactions() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        return ResponseEntity.ok(gradingService.getStudentPointTransactions(currentStudentId));
    }

    @GetMapping("/points/me/paged")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining sahifalangan ball tranzaksiyalari")
    public ResponseEntity<Page<PointTransaction>> getMyTransactionsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) String source
    ) {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(100, size)));
        return ResponseEntity.ok(gradingService.getStudentPointTransactionsPaged(currentStudentId, source, pageable));
    }

    @GetMapping("/points/student/{studentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining ball tranzaksiyalari tarixi")
    public ResponseEntity<List<PointTransaction>> getStudentTransactions(@PathVariable Long studentId) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        return ResponseEntity.ok(gradingService.getStudentPointTransactions(studentId));
    }

    @GetMapping("/points/student/{studentId}/paged")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining sahifalangan ball tranzaksiyalari")
    public ResponseEntity<Page<PointTransaction>> getStudentTransactionsPaged(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) String source
    ) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(100, size)));
        return ResponseEntity.ok(gradingService.getStudentPointTransactionsPaged(studentId, source, pageable));
    }

    @GetMapping("/points/summary")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "XP statistikasi va manbalar bo'yicha taqsimot")
    public ResponseEntity<GradingAndGamificationService.StudentXpSummaryDto> getXpSummary(
            @RequestParam(required = false) Long studentId
    ) {
        Long targetStudentId = studentId;
        if (targetStudentId == null || currentUserHelper.isStudent()) {
            targetStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        } else {
            resourceOwnershipService.verifyStudentAccess(targetStudentId);
        }
        return ResponseEntity.ok(gradingService.getStudentXpSummary(targetStudentId));
    }

    // =========================================================================
    // 3. LEADERBOARDS & RANKINGS
    // =========================================================================

    @GetMapping("/leaderboard")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Talabalar reytingi (Haftalik, Oylik, Umumiy, Filial va Guruh filtrlari)")
    public ResponseEntity<List<GradingAndGamificationService.LeaderboardEntry>> getLeaderboard(
            @RequestParam(defaultValue = "ALL_TIME") String period,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return ResponseEntity.ok(gradingService.getLeaderboard(period, branchId, groupId, page, size));
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

    // =========================================================================
    // 4. DAILY STREAK & STREAK FREEZE
    // =========================================================================

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

    @PostMapping("/streak/freeze/use")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Streak Freeze ishlatish (O'tkazib yuborilgan kunni muzlatish)")
    public ResponseEntity<GradingAndGamificationService.StreakFreezeResult> useStreakFreeze(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate missedDate
    ) {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        Long userId = currentUserHelper.getCurrentUserId();
        return ResponseEntity.ok(gradingService.consumeStreakFreezeManually(currentStudentId, missedDate, userId));
    }

    @PostMapping("/streak/freeze/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Administrator tomonidan o'quvchiga Streak Freeze berish yoki to'g'rilash")
    public ResponseEntity<GradingAndGamificationService.StreakFreezeResult> adjustStreakFreeze(
            @RequestBody Map<String, Object> payload
    ) {
        Long studentId = ((Number) payload.get("studentId")).longValue();
        int delta = ((Number) payload.get("delta")).intValue();
        String reason = (String) payload.get("reason");
        Long authorizedUserId = currentUserHelper.getCurrentUserId();

        return ResponseEntity.ok(gradingService.adjustStreakFreeze(studentId, delta, reason, authorizedUserId));
    }

    @GetMapping("/streak/freeze/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Streak Freeze ishlatilish tarixi")
    public ResponseEntity<List<StreakFreezeHistory>> getStreakFreezeHistory(
            @RequestParam(required = false) Long studentId
    ) {
        Long targetStudentId = studentId;
        if (targetStudentId == null || currentUserHelper.isStudent()) {
            targetStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        } else {
            resourceOwnershipService.verifyStudentAccess(targetStudentId);
        }
        return ResponseEntity.ok(gradingService.getStreakFreezeHistory(targetStudentId));
    }

    // =========================================================================
    // 5. ACHIEVEMENTS & BADGES
    // =========================================================================

    @GetMapping("/achievements")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Tizimdagi barcha faol yutuq nishonlari (Badges)")
    public ResponseEntity<List<Achievement>> getAllAchievements() {
        return ResponseEntity.ok(gradingService.getAllAchievements());
    }

    @GetMapping("/achievements/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchi qo'lga kiritgan nishonlar")
    public ResponseEntity<List<StudentAchievement>> getMyAchievements() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        return ResponseEntity.ok(gradingService.getStudentAchievements(currentStudentId));
    }

    @GetMapping("/achievements/student/{studentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchi qo'lga kiritgan nishonlar")
    public ResponseEntity<List<StudentAchievement>> getStudentAchievements(@PathVariable Long studentId) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        return ResponseEntity.ok(gradingService.getStudentAchievements(studentId));
    }

    @PostMapping("/achievements")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Yangi yutuq nishonini yaratish (Admin)")
    public ResponseEntity<Achievement> createAchievement(@RequestBody Achievement achievement) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gradingService.createAchievement(achievement));
    }

    @PutMapping("/achievements/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Yutuq nishoni parametrlarini tahrirlash (Admin)")
    public ResponseEntity<Achievement> updateAchievement(@PathVariable Long id, @RequestBody Achievement achievement) {
        return ResponseEntity.ok(gradingService.updateAchievement(id, achievement));
    }

    @PatchMapping("/achievements/{id}/toggle")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Yutuq nishonini faollashtirish/faolsizlantirish (Admin)")
    public ResponseEntity<Achievement> toggleAchievementStatus(@PathVariable Long id) {
        return ResponseEntity.ok(gradingService.toggleAchievementStatus(id));
    }

    // =========================================================================
    // 6. ADMINISTRATION & CONFIGURATION
    // =========================================================================

    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Gamifikatsiya qoidalari va mukofot parametrlari (Admin)")
    public ResponseEntity<List<GamificationConfiguration>> getConfigurations(
            @RequestParam(required = false) String category
    ) {
        if (configService == null) return ResponseEntity.ok(List.of());
        if (category != null && !category.isBlank()) {
            return ResponseEntity.ok(configService.getConfigurationsByCategory(category.toUpperCase()));
        }
        return ResponseEntity.ok(configService.getAllConfigurations());
    }

    @PutMapping("/config")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Gamifikatsiya parametrini yangilash (Admin)")
    public ResponseEntity<GamificationConfiguration> updateConfiguration(@RequestBody Map<String, String> payload) {
        String key = payload.get("configKey");
        String value = payload.get("configValue");
        String description = payload.get("description");
        Long adminId = currentUserHelper.getCurrentUserId();

        if (key == null || value == null) {
            throw new IllegalArgumentException("configKey va configValue majburiy!");
        }

        return ResponseEntity.ok(configService.updateConfiguration(key, value, description, adminId));
    }

    @GetMapping("/metrics")
    @PreAuthorize("hasAuthority('analytics.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'OBSERVER', 'STUDENT')")
    @Operation(summary = "Gamifikatsiya, ballar va baholash mezonlari ko'rsatkichlari")
    public ResponseEntity<GradingAndGamificationService.GamificationMetricsDto> getGamificationMetrics() {
        return ResponseEntity.ok(gradingService.getGamificationMetrics());
    }
}
