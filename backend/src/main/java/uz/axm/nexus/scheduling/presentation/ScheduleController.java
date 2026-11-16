package uz.axm.nexus.scheduling.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.scheduling.application.ManualScheduleRequest;
import uz.axm.nexus.scheduling.application.SchedulePreviewRequest;
import uz.axm.nexus.scheduling.application.SchedulePreviewResponse;
import uz.axm.nexus.scheduling.application.ScheduleService;
import uz.axm.nexus.scheduling.domain.LessonSession;
import uz.axm.nexus.scheduling.domain.Schedule;
import uz.axm.nexus.shared.application.ApiResponse;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
@Tag(name = "Schedules & Timetable", description = "Takrorlanuvchi dars jadvallari va akademik taqvim boshqaruvi")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping({"", "/recurring"})
    @PreAuthorize("hasAuthority('lessons.read') or isAuthenticated()")
    @Operation(summary = "Dars jadvallarini olish (sinf, mentor, filial va status bo'yicha filter bilan)")
    public ResponseEntity<List<Schedule>> getSchedules(
            @RequestParam(required = false) String gradeLevel,
            @RequestParam(required = false) Long mentorId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status
    ) {
        if (gradeLevel != null && !gradeLevel.isBlank()) {
            return ResponseEntity.ok(scheduleService.getByGradeLevel(gradeLevel));
        }
        if (mentorId != null) {
            return ResponseEntity.ok(scheduleService.getByMentorId(mentorId));
        }
        if (branchId != null) {
            return ResponseEntity.ok(scheduleService.getByBranchId(branchId));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(scheduleService.getByStatus(status));
        }
        return ResponseEntity.ok(scheduleService.getAllSchedules());
    }

    @GetMapping({"/{id}", "/recurring/{id}"})
    @PreAuthorize("hasAuthority('lessons.read') or isAuthenticated()")
    @Operation(summary = "Bitta dars jadvalini olish")
    public ResponseEntity<Schedule> getScheduleById(@PathVariable Long id) {
        return scheduleService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping({"", "/manual", "/recurring"})
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROGRAM_ADMIN', 'COORDINATOR', 'REGIONAL_COORDINATOR', 'MENTOR')")
    @Operation(summary = "Takrorlanuvchi dars jadvalini yaratish va kalendar mashg'ulotlarini generatsiya qilish")
    public ResponseEntity<Schedule> createManualSchedule(@RequestBody ManualScheduleRequest request) {
        return ResponseEntity.ok(scheduleService.createManualSchedule(request));
    }

    @PutMapping({"/{id}", "/recurring/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROGRAM_ADMIN', 'COORDINATOR', 'REGIONAL_COORDINATOR', 'MENTOR')")
    @Operation(summary = "Dars jadvalini yangilash va kelgusi darslarni qayta generatsiya qilish")
    public ResponseEntity<Schedule> updateSchedule(@PathVariable Long id, @RequestBody ManualScheduleRequest request) {
        return ResponseEntity.ok(scheduleService.updateSchedule(id, request));
    }

    @DeleteMapping({"/{id}", "/recurring/{id}"})
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROGRAM_ADMIN', 'COORDINATOR', 'REGIONAL_COORDINATOR', 'MENTOR')")
    @Operation(summary = "Dars jadvalini o'chirish yoki arxivlash (tarixiy davomat saqlanadi)")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long id) {
        scheduleService.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping({"/{id}/archive", "/recurring/{id}/archive"})
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROGRAM_ADMIN', 'COORDINATOR', 'REGIONAL_COORDINATOR')")
    @Operation(summary = "Dars jadvalini arxivlash va kelgusi mashg'ulotlarni bekor qilish")
    public ResponseEntity<Schedule> archiveSchedule(
            @PathVariable Long id,
            @RequestParam(required = false) String reason
    ) {
        return ResponseEntity.ok(scheduleService.archiveSchedule(id, reason));
    }

    @PostMapping({"/preview", "/recurring/preview"})
    @PreAuthorize("hasAuthority('lessons.read') or isAuthenticated()")
    @Operation(summary = "Dars jadvali generatsiyasi sanalari va to'qnashuvlarini oldindan ko'rish (Preview)")
    public ResponseEntity<ApiResponse<SchedulePreviewResponse>> previewSchedule(@RequestBody SchedulePreviewRequest request) {
        SchedulePreviewResponse response = scheduleService.previewSchedule(request);
        return ResponseEntity.ok(ApiResponse.ok("Preview olindi", response));
    }

    @PostMapping({"/{id}/generate", "/recurring/{id}/generate"})
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROGRAM_ADMIN', 'COORDINATOR', 'REGIONAL_COORDINATOR', 'MENTOR')")
    @Operation(summary = "Dars jadvali uchun kalendar mashg'ulotlarini generatsiya qilish")
    public ResponseEntity<ApiResponse<List<LessonSession>>> generateSessions(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        List<LessonSession> sessions = scheduleService.generateSessionsForSchedule(id, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok("Dars mashg'ulotlari muvaffaqiyatli generatsiya qilindi", sessions));
    }

    @PostMapping({"/{id}/regenerate", "/recurring/{id}/regenerate"})
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'PROGRAM_ADMIN', 'COORDINATOR', 'REGIONAL_COORDINATOR', 'MENTOR')")
    @Operation(summary = "Kelgusi mashg'ulotlarni yangilangan qoidalar asosida qayta generatsiya qilish")
    public ResponseEntity<ApiResponse<List<LessonSession>>> regenerateSessions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "FUTURE_ONLY") String updateScope
    ) {
        List<LessonSession> sessions = scheduleService.regenerateSessionsForSchedule(id, updateScope);
        return ResponseEntity.ok(ApiResponse.ok("Kelgusi darslar qayta generatsiya qilindi", sessions));
    }
}
