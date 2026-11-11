package uz.axm.nexus.identity.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;
import uz.axm.nexus.identity.application.*;
import uz.axm.nexus.shared.application.ApiResponse;

@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication & Identity", description = "Foydalanuvchilarni ro'yxatdan o'tkazish, autentifikatsiya, pochta tekshiruvi va JWT tokenlar boshqaruvi")
public class AuthController {

    private final AuthService authService;
    private final CaptchaService captchaService;

    @Value("${app.mail.verification-url:http://localhost:5173}")
    private String appBaseUrl;

    @GetMapping("/captcha")
    @Operation(summary = "Botlardan himoyalanish uchun random 5 xonali CAPTCHA kodi va grafik tasvirini olish")
    public ResponseEntity<ApiResponse<CaptchaResponse>> getCaptcha() {
        CaptchaResponse response = captchaService.generateCaptcha();
        return ResponseEntity.ok(ApiResponse.ok("Xavfsizlik kodi muvaffaqiyatli yaratildi", response));
    }

    @PostMapping("/register")
    @Operation(summary = "Email va parol orqali yangi foydalanuvchini ro'yxatdan o'tkazish va tasdiqlash xatini RabbitMQ orqali jo'natish")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Foydalanuvchi muvaffaqiyatli ro'yxatdan o'tdi", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Tizimga kirish va haqiqiy JWT token olish (ID raqam, email yoki username orqali)")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Muvaffaqiyatli kirildi", response));
    }

    @GetMapping("/verify-email")
    @Operation(summary = "Email manzilidagi tasdiqlash havolasi orqali hisobni faollashtirish (HTML yoki JSON)")
    public Object verifyEmailViaLink(@RequestParam("token") String token, HttpServletRequest request) {
        boolean acceptsHtml = request.getHeader("Accept") != null && request.getHeader("Accept").contains("text/html");

        try {
            AuthResponse response = authService.verifyEmail(VerifyEmailRequest.builder().token(token).build());
            if (acceptsHtml) {
                ModelAndView modelAndView = new ModelAndView("email/verification-success");
                modelAndView.addObject("userName", response.getFullName());
                modelAndView.addObject("userEmail", response.getEmail());
                modelAndView.addObject("appUrl", appBaseUrl);
                return modelAndView;
            }
            return ResponseEntity.ok(ApiResponse.ok("Email manzili muvaffaqiyatli tasdiqlandi", response));
        } catch (Exception e) {
            log.warn("Email tasdiqlashda xatolik: {}", e.getMessage());
            if (acceptsHtml) {
                ModelAndView modelAndView = new ModelAndView("email/verification-failed");
                modelAndView.addObject("errorMessage", e.getMessage());
                modelAndView.addObject("appUrl", appBaseUrl);
                return modelAndView;
            }
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/verify-email")
    @Operation(summary = "API orqali emailni tasdiqlash (token yoki email va 6 xonali OTP kod yordamida)")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmailApi(@RequestBody VerifyEmailRequest request) {
        AuthResponse response = authService.verifyEmail(request);
        return ResponseEntity.ok(ApiResponse.ok("Email manzili muvaffaqiyatli tasdiqlandi", response));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Tasdiqlash xatini RabbitMQ orqali qayta yuborish")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request);
        return ResponseEntity.ok(ApiResponse.ok("Tasdiqlash xabari pochtangizga qayta yuborildi", null));
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh token orqali yangi access token olish")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.ok("Token muvaffaqiyatli yangilandi", response));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Parolni tiklash uchun email manziliga maxsus havola yuborish")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String token = authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.ok("Parolni qayta tiklash havolasi pochtangizga muvaffaqiyatli yuborildi", token));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Maxsus token yordamida yangi parolni o'rnatish")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok("Parol muvaffaqiyatli yangilandi. Endi yangi parol orqali tizimga kirishingiz mumkin.", null));
    }

    @GetMapping("/me")
    @Operation(summary = "Joriy tizimga kirgan foydalanuvchi profilini olish")
    public ResponseEntity<ApiResponse<AuthResponse>> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Autentifikatsiyadan o'tilmagan"));
        }
        AuthResponse response = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Foydalanuvchi profili", response));
    }
}
