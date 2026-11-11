package uz.axm.nexus.notifications.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import uz.axm.nexus.notifications.application.*;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.application.PageResponse;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "Notifications", description = "Bildirishnomalar va xabarnomalar boshqaruvi (Modul 14)")
public class NotificationController {

    private final NotificationService notificationService;
    private final AiNotificationService aiNotificationService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping
    @Operation(summary = "Foydalanuvchi bildirishnomalari ro'yxati (sahifalangan)")
    public ResponseEntity<ApiResponse<PageResponse<NotificationDto>>> getUserNotifications(
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<NotificationDto> resultPage = notificationService.getUserNotifications(currentUserId, unreadOnly, type, pageRequest);

        PageResponse<NotificationDto> pageResponse = PageResponse.<NotificationDto>builder()
                .content(resultPage.getContent())
                .page(resultPage.getNumber())
                .size(resultPage.getSize())
                .totalElements(resultPage.getTotalElements())
                .totalPages(resultPage.getTotalPages())
                .last(resultPage.isLast())
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Bildirishnomalar olindi", pageResponse));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "O'qilmagan bildirishnomalar soni")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        long count = notificationService.getUnreadCount(currentUserId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", count)));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Bildirishnomani o'qilgan deb belgilash")
    public ResponseEntity<ApiResponse<NotificationDto>> markAsRead(@PathVariable Long id) {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        NotificationDto updated = notificationService.markAsRead(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.ok("Bildirishnoma o'qildi", updated));
    }

    @PutMapping("/read-all")
    @Operation(summary = "Barcha bildirishnomalarni o'qilgan deb belgilash")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> markAllAsRead() {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        int updatedCount = notificationService.markAllAsRead(currentUserId);
        return ResponseEntity.ok(ApiResponse.ok("Barcha bildirishnomalar o'qilgan deb belgilandi", Map.of("markedCount", updatedCount)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Bildirishnomani o'chirish")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        notificationService.deleteNotification(id, currentUserId);
        return ResponseEntity.ok(ApiResponse.ok("Bildirishnoma o'chirildi", null));
    }

    @GetMapping("/preferences")
    @Operation(summary = "Foydalanuvchining bildirishnoma sozlamalari")
    public ResponseEntity<ApiResponse<NotificationPreferenceDto>> getPreferences() {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        NotificationPreferenceDto preferences = notificationService.getPreferences(currentUserId);
        return ResponseEntity.ok(ApiResponse.ok(preferences));
    }

    @PutMapping("/preferences")
    @Operation(summary = "Bildirishnoma sozlamalarini yangilash")
    public ResponseEntity<ApiResponse<NotificationPreferenceDto>> updatePreferences(
            @RequestBody NotificationPreferenceDto dto
    ) {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        NotificationPreferenceDto updated = notificationService.updatePreferences(currentUserId, dto);
        return ResponseEntity.ok(ApiResponse.ok("Sozlamalar saqlandi", updated));
    }

    @PostMapping("/broadcast")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Ma'muriy ommaviy e'lon yuborish (Administrator)")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> broadcastAnnouncement(
            @Valid @RequestBody BroadcastNotificationRequest request
    ) {
        int delivered = notificationService.broadcastAnnouncement(request);
        return ResponseEntity.ok(ApiResponse.ok("E'lon barcha mo'ljallangan foydalanuvchilarga yetkazildi", Map.of("deliveredCount", delivered)));
    }

    @PostMapping("/ai/generate-announcement")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'MENTOR')")
    @Operation(summary = "Groq AI yordamida e'lon matnini generatsiya qilish")
    public ResponseEntity<ApiResponse<AiNotificationDraftResponse>> generateAiAnnouncement(
            @Valid @RequestBody AiNotificationDraftRequest request
    ) {
        AiNotificationDraftResponse draft = aiNotificationService.generateAnnouncementDraft(request);
        return ResponseEntity.ok(ApiResponse.ok("AI e'lon matni muvaffaqiyatli shakllantirildi", draft));
    }

    @GetMapping("/ai/daily-digest")
    @Operation(summary = "Foydalanuvchining o'qilmagan xabarlari asosida Groq AI Kunlik Xulosasi")
    public ResponseEntity<ApiResponse<AiDailyDigestResponse>> getAiDailyDigest(
            @RequestParam(required = false) String customApiKey
    ) {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        AiDailyDigestResponse digest = aiNotificationService.generateDailyDigest(currentUserId, customApiKey);
        return ResponseEntity.ok(ApiResponse.ok("Kunlik AI xulosa tayyorlandi", digest));
    }

    @PostMapping("/ai/broadcast")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "Groq AI orqali e'lon yaratib to'g'ridan-to'g'ri ommaviy yuborish")
    public ResponseEntity<ApiResponse<Map<String, Object>>> broadcastAiAnnouncement(
            @Valid @RequestBody AiBroadcastRequest request
    ) {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        Map<String, Object> result = aiNotificationService.broadcastAiAnnouncement(request, currentUserId);
        return ResponseEntity.ok(ApiResponse.ok("AI e'lon muvaffaqiyatli tarqatildi", result));
    }
}
