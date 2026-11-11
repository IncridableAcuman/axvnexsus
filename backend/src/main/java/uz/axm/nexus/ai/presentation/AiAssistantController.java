package uz.axm.nexus.ai.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.ai.application.assistant.AiAssistantService;
import uz.axm.nexus.ai.application.assistant.AiProviderFactory;
import uz.axm.nexus.ai.domain.assistant.*;
import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.lessons.domain.Lesson;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.domain.User;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/assistant")
@RequiredArgsConstructor
@Tag(name = "AI Teaching & Learning Assistant", description = "Modul 13: Mentorlar va o'quvchilar uchun pedagogik AI yordamchisi")
public class AiAssistantController {

    private final AiAssistantService aiAssistantService;
    private final AiProviderFactory providerFactory;
    private final CurrentUserHelper currentUserHelper;

    @PostMapping("/generate")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Pedagogik AI assistentiga so'rov yuborish (Dars rejasi, testlar, tushuntirishlar)")
    public ResponseEntity<AiCompletionResponse> generateAssistance(
            @RequestBody AiPromptRequest request
    ) {
        Long callerUserId = currentUserHelper.getCurrentUserId();
        String callerRole = currentUserHelper.getCurrentUser().map(User::getRole).orElse("ROLE_STUDENT");
        AiCompletionResponse response = aiAssistantService.generateAssistance(request, callerRole, callerUserId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/convert-to-lesson")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "AI tomonidan yaratilgan dars rejasini ko'rib chiqish uchun DRAFT lesson sifatida saqlash")
    public ResponseEntity<Lesson> convertToLessonDraft(@RequestBody ConvertLessonDraftRequest request) {
        Lesson lesson = aiAssistantService.saveAsLessonDraft(request.getDetails(), request.getMentorId(), request.getGroupId());
        return ResponseEntity.ok(lesson);
    }

    @PostMapping("/convert-to-assessment")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "AI tomonidan yaratilgan test savollarini ko'rib chiqish uchun DRAFT assessment sifatida saqlash")
    public ResponseEntity<Assessment> convertToAssessmentDraft(@RequestBody ConvertAssessmentDraftRequest request) {
        Assessment assessment = aiAssistantService.saveAsAssessmentDraft(
                request.getTitle(),
                request.getSubject(),
                request.getGradeLevel(),
                request.getGroupId(),
                request.getMentorId(),
                request.getQuestions()
        );
        return ResponseEntity.ok(assessment);
    }

    @GetMapping("/prompts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Tavsiya etilgan tayyor so'rovlar (promptlar) ro'yxati")
    public ResponseEntity<List<Map<String, String>>> getSuggestedPrompts(
            @RequestParam(required = false, defaultValue = "MENTOR_ASSISTANT") AiRole role,
            @RequestParam(required = false, defaultValue = "uz") String language
    ) {
        return ResponseEntity.ok(aiAssistantService.getSuggestedPrompts(role, language));
    }

    @GetMapping("/providers")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Mavjud va faol AI provayderlari ro'yxati")
    public ResponseEntity<Map<String, Object>> getProvidersInfo() {
        return ResponseEntity.ok(Map.of(
                "activeProvider", providerFactory.getDefaultActiveProvider(),
                "availableProviders", providerFactory.getAvailableProviders()
        ));
    }
}
