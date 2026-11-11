package uz.axm.nexus.users.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.application.UserPreferenceDto;
import uz.axm.nexus.users.application.UserPreferenceService;

@RestController
@RequestMapping("/api/v1/user-preferences")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "User Preferences", description = "Foydalanuvchi interfeys sozlamalari va lokalizatsiya (Modul 15)")
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping
    @Operation(summary = "Foydalanuvchi sozlamalarini olish (til, mavzu, animatsiya)")
    public ResponseEntity<ApiResponse<UserPreferenceDto>> getPreferences() {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        UserPreferenceDto preferences = userPreferenceService.getPreferences(currentUserId);
        return ResponseEntity.ok(ApiResponse.ok(preferences));
    }

    @PutMapping
    @Operation(summary = "Foydalanuvchi sozlamalarini yangilash")
    public ResponseEntity<ApiResponse<UserPreferenceDto>> updatePreferences(
            @RequestBody UserPreferenceDto dto
    ) {
        Long currentUserId = currentUserHelper.getCurrentUserId();
        UserPreferenceDto updated = userPreferenceService.updatePreferences(currentUserId, dto);
        return ResponseEntity.ok(ApiResponse.ok("Sozlamalar saqlandi", updated));
    }
}
