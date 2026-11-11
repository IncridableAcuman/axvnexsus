package uz.axm.nexus.shared.presentation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.RateLimitException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    private String getLocalizedMessage(String code, String defaultMsg, Object... args) {
        try {
            return messageSource.getMessage(code, args, defaultMsg, LocaleContextHolder.getLocale());
        } catch (Exception e) {
            return defaultMsg;
        }
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resurs topilmadi: {}", ex.getMessage());
        String msg = getLocalizedMessage("error.resource_not_found", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("ERR_RESOURCE_NOT_FOUND", msg));
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ApiResponse<Void>> handleRateLimit(RateLimitException ex) {
        log.warn("So'rovlar limiti oshib ketdi: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(ApiResponse.error("ERR_RATE_LIMIT_EXCEEDED", ex.getMessage()));
    }

    @ExceptionHandler({
            org.springframework.security.core.AuthenticationException.class,
            org.springframework.security.authentication.AuthenticationCredentialsNotFoundException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(Exception ex) {
        log.warn("Autentifikatsiya xatoligi: {}", ex.getMessage());
        String msg = getLocalizedMessage("error.unauthorized", "Tizimga kirish talab etiladi. Token mavjud emas yoki eskirgan.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("ERR_UNAUTHORIZED", msg));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Ruxsat berilmadi: {}", ex.getMessage());
        String msg = getLocalizedMessage("error.access_denied", "Ushbu amalni bajarish uchun sizda yetarli huquq mavjud emas.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("ERR_ACCESS_DENIED", msg));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex) {
        log.warn("Biznes xatolik: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("ERR_BUSINESS_RULE_VIOLATION", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Noto'g'ri argument: {}", ex.getMessage());
        String msg = getLocalizedMessage("error.invalid_argument", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("ERR_INVALID_ARGUMENT", msg));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        log.warn("Yaroqsiz so'rov tanasi yoki JSON formati: {}", ex.getMessage());
        String msg = getLocalizedMessage("error.malformed_json", "So'rov tanasi noto'g'ri shakllantirilgan yoki qiymat turi mos emas.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("ERR_MALFORMED_JSON", msg));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        String msg = getLocalizedMessage("error.validation_failed", "Ma'lumotlarni tekshirishda xatolik yuz berdi");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ApiResponse.<Map<String, String>>builder()
                        .success(false)
                        .errorCode("ERR_VALIDATION_FAILED")
                        .message(msg)
                        .data(errors)
                        .build()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        log.error("Kutilmagan server xatosi yuz berdi: ", ex);
        String msg = getLocalizedMessage("error.internal_server_error", "Serverda ichki xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("ERR_INTERNAL_SERVER_ERROR", msg));
    }
}
