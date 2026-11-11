package uz.axm.nexus.scheduling.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.scheduling.application.ManualScheduleRequest;
import uz.axm.nexus.scheduling.application.ScheduleService;
import uz.axm.nexus.scheduling.domain.Schedule;

import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
@Tag(name = "Schedules & Timetable", description = "Dars jadvallari va haftalik taqsimot API lari")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    @PreAuthorize("hasAuthority('lessons.read') or isAuthenticated()")
    @Operation(summary = "Dars jadvallarini olish (sinf va mentor bo'yicha filter bilan)")
    public ResponseEntity<List<Schedule>> getSchedules(
            @RequestParam(required = false) String gradeLevel,
            @RequestParam(required = false) Long mentorId
    ) {
        if (gradeLevel != null && !gradeLevel.isBlank()) {
            return ResponseEntity.ok(scheduleService.getByGradeLevel(gradeLevel));
        }
        if (mentorId != null) {
            return ResponseEntity.ok(scheduleService.getByMentorId(mentorId));
        }
        return ResponseEntity.ok(scheduleService.getAllSchedules());
    }

    @PostMapping("/manual")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')")
    @Operation(summary = "Qo'lda dars jadvali va o'quvchilar guruhini yaratish")
    public ResponseEntity<Schedule> createManualSchedule(@RequestBody ManualScheduleRequest request) {
        return ResponseEntity.ok(scheduleService.createManualSchedule(request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')")
    @Operation(summary = "Dars jadvalini o'chirish")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long id) {
        scheduleService.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }
}
