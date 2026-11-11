package uz.axm.nexus.scheduling.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.scheduling.application.*;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/lessons")
@RequiredArgsConstructor
@Tag(name = "Scheduling & Attendance", description = "Dars mashg'ulotlari jadvali, to'qnashuvlarni oldini olish va davomat nazorati")
public class LessonAttendanceController {

    private final AttendanceScheduleService attendanceScheduleService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping
    @PreAuthorize("hasAuthority('lessons.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT', 'OBSERVER')")
    @Operation(summary = "Darslar ro'yxatini kalendar formati uchun olish (kunlik, haftalik, oylik)")
    public ResponseEntity<ApiResponse<List<LessonSessionDto>>> getSessions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long mentorId,
            @RequestParam(required = false) Long groupId
    ) {
        List<LessonSessionDto> sessions = attendanceScheduleService.getSessions(startDate, endDate, mentorId, groupId);
        return ResponseEntity.ok(ApiResponse.ok("Darslar jadvali olindi", sessions));
    }

    @GetMapping("/today")
    @PreAuthorize("hasAuthority('lessons.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT', 'OBSERVER')")
    @Operation(summary = "Bugungi darslar ro'yxatini olish (Boshqaruv paneli uchun)")
    public ResponseEntity<ApiResponse<List<LessonSessionDto>>> getTodaySessions(
            @RequestParam(required = false) Long mentorId
    ) {
        List<LessonSessionDto> todaySessions = attendanceScheduleService.getTodaySessions(mentorId);
        return ResponseEntity.ok(ApiResponse.ok("Bugungi darslar olindi", todaySessions));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('lessons.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT', 'OBSERVER')")
    @Operation(summary = "Dars mashg'uloti va davomat varaqasini olish")
    public ResponseEntity<ApiResponse<LessonSessionDto>> getSessionById(@PathVariable Long id) {
        LessonSessionDto session = attendanceScheduleService.getSessionById(id);
        return ResponseEntity.ok(ApiResponse.ok("Dars tafsilotlari olindi", session));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('lessons.create') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Yangi dars mashg'ulotini rejalashtirish (To'qnashuvlarni avtomatik tekshiradi)")
    public ResponseEntity<ApiResponse<LessonSessionDto>> createSession(
            @Valid @RequestBody CreateLessonSessionRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        LessonSessionDto created = attendanceScheduleService.createSession(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Dars muvaffaqiyatli rejalashtirildi", created));
    }

    @PostMapping("/{id}/reschedule")
    @PreAuthorize("hasAuthority('lessons.update') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Dars vaqtini o'zgartirish (reschedule) va yangi to'qnashuvlarni tekshirish")
    public ResponseEntity<ApiResponse<LessonSessionDto>> rescheduleSession(
            @PathVariable Long id,
            @Valid @RequestBody RescheduleLessonRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        LessonSessionDto updated = attendanceScheduleService.rescheduleSession(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Dars vaqti muvaffaqiyatli o'zgartirildi", updated));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('lessons.delete') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "Darsni bekor qilish (sababi bilan)")
    public ResponseEntity<ApiResponse<LessonSessionDto>> cancelSession(
            @PathVariable Long id,
            @Valid @RequestBody CancelLessonRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        LessonSessionDto cancelled = attendanceScheduleService.cancelSession(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Dars bekor qilindi", cancelled));
    }

    @PostMapping("/{id}/attendance")
    @PreAuthorize("hasAuthority('attendance.record') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Dars davomatini to'ldirish yoki yangilash (Audit qayd etiladi)")
    public ResponseEntity<ApiResponse<LessonSessionDto>> submitAttendance(
            @PathVariable Long id,
            @Valid @RequestBody SubmitAttendanceRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        LessonSessionDto updated = attendanceScheduleService.submitAttendance(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("Davomat muvaffaqiyatli qayd etildi", updated));
    }
}
