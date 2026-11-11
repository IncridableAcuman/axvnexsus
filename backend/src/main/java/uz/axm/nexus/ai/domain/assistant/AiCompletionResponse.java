package uz.axm.nexus.ai.domain.assistant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCompletionResponse {
    @Builder.Default
    private boolean success = true;

    private String content; // Asosiy tavsiya yoki javob (Markdown)
    private AiRole role;
    private AiIntent intent;
    private String provider; // "groq", "openai", "mock"
    private String model;
    private Integer tokensUsed;

    @Builder.Default
    private String advisoryDisclaimer = "Sun'iy intellekt tavsiyalari maslahat xarakteriga ega bo'lib, rasmiy hisoblanmaydi. Dars rejasi yoki testlarni e'lon qilishdan oldin mentor tekshirishi shart.";

    // Agar so'rov test yaratish bo'lsa, tuzilgan savollar
    private List<AiQuizQuestionDto> generatedQuizQuestions;

    // Agar so'rov dars rejasi bo'lsa, tuzilgan dars tuzilmasi
    private AiLessonPlanDetailsDto generatedLessonPlan;

    // Agar so'rov maruza taqdimoti bo'lsa, tuzilgan slaydlar
    private List<String> generatedPresentationSlides;

    private String errorMessage;
}
