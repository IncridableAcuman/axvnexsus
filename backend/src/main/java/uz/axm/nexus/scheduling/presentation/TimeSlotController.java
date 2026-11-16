package uz.axm.nexus.scheduling.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.scheduling.application.TimeSlotDto;
import uz.axm.nexus.scheduling.application.TimeSlotRequest;
import uz.axm.nexus.scheduling.application.TimeSlotService;
import uz.axm.nexus.shared.application.ApiResponse;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Lesson Time Slots", description = "Dars vaqtlari (Time Slots) boshqaruvi va integratsiyasi")
public class TimeSlotController {

    private final TimeSlotService timeSlotService;

    @GetMapping({"/api/time-slots", "/api/shifts"})
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Faol dars vaqtlari / smenalar ro'yxatini olish (Form va jadvallar uchun)")
    public ResponseEntity<ApiResponse<List<TimeSlotDto>>> getActiveTimeSlots(
            @RequestParam(required = false) Long branchId
    ) {
        List<TimeSlotDto> activeSlots = timeSlotService.getActiveTimeSlots(branchId);
        return ResponseEntity.ok(ApiResponse.ok("Faol dars vaqtlari olindi", activeSlots));
    }

    @GetMapping({"/api/admin/time-slots", "/api/v1/admin/time-slots", "/api/admin/shifts", "/api/shifts/all"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Barcha dars vaqtlarini (faol va nofaol) foydalanish statistikasi bilan olish")
    public ResponseEntity<ApiResponse<List<TimeSlotDto>>> getAllTimeSlots() {
        List<TimeSlotDto> allSlots = timeSlotService.getAllTimeSlots();
        return ResponseEntity.ok(ApiResponse.ok("Barcha dars vaqtlari olindi", allSlots));
    }

    @GetMapping({"/api/admin/time-slots/{id}", "/api/v1/admin/time-slots/{id}", "/api/shifts/{id}", "/api/admin/shifts/{id}"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Bitta dars vaqtini olish")
    public ResponseEntity<ApiResponse<TimeSlotDto>> getTimeSlotById(@PathVariable Long id) {
        TimeSlotDto slot = timeSlotService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok("Dars vaqti olindi", slot));
    }

    @PostMapping({"/api/admin/time-slots", "/api/v1/admin/time-slots", "/api/shifts", "/api/admin/shifts"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Yangi dars vaqtini qo'shish")
    public ResponseEntity<ApiResponse<TimeSlotDto>> createTimeSlot(@Valid @RequestBody TimeSlotRequest request) {
        TimeSlotDto created = timeSlotService.createTimeSlot(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Yangi dars vaqti muvaffaqiyatli qo'shildi", created));
    }

    @PutMapping({"/api/admin/time-slots/{id}", "/api/v1/admin/time-slots/{id}", "/api/shifts/{id}", "/api/admin/shifts/{id}"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Mavjud dars vaqtini tahrirlash")
    public ResponseEntity<ApiResponse<TimeSlotDto>> updateTimeSlot(
            @PathVariable Long id,
            @Valid @RequestBody TimeSlotRequest request
    ) {
        TimeSlotDto updated = timeSlotService.updateTimeSlot(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Dars vaqti muvaffaqiyatli yangilandi", updated));
    }

    @PatchMapping({"/api/admin/time-slots/{id}/toggle-active", "/api/v1/admin/time-slots/{id}/toggle-active", "/api/shifts/{id}/status", "/api/admin/shifts/{id}/status"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Dars vaqtini faollashtirish / nofaol qilish (Deactivate)")
    public ResponseEntity<ApiResponse<TimeSlotDto>> toggleActive(@PathVariable Long id) {
        TimeSlotDto toggled = timeSlotService.toggleActive(id);
        return ResponseEntity.ok(ApiResponse.ok("Dars vaqti holati o'zgartirildi", toggled));
    }

    @DeleteMapping({"/api/admin/time-slots/{id}", "/api/v1/admin/time-slots/{id}", "/api/shifts/{id}", "/api/admin/shifts/{id}"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Dars vaqtini o'chirish (agar jadvallarda ishlatilmagan bo'lsa)")
    public ResponseEntity<ApiResponse<Void>> deleteTimeSlot(@PathVariable Long id) {
        timeSlotService.deleteTimeSlot(id);
        return ResponseEntity.ok(ApiResponse.ok("Dars vaqti o'chirildi", null));
    }
}
