package uz.axm.nexus.ai.application.assistant;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.ai.domain.assistant.*;
import uz.axm.nexus.ai.infrastructure.AiInteractionLogRepository;
import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.assessments.domain.AssessmentQuestion;
import uz.axm.nexus.assessments.infrastructure.AssessmentQuestionRepository;
import uz.axm.nexus.assessments.infrastructure.AssessmentRepository;
import uz.axm.nexus.lessons.domain.Lesson;
import uz.axm.nexus.lessons.infrastructure.LessonRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiAssistantService {

    private final PiiSanitizer piiSanitizer;
    private final PromptGuardrail promptGuardrail;
    private final AiProviderFactory providerFactory;
    private final AiInteractionLogRepository interactionLogRepository;
    private final LessonRepository lessonRepository;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public AiCompletionResponse generateAssistance(AiPromptRequest request, String callerRole, Long callerUserId) {
        promptGuardrail.validate(request);

        // PII Sanitization
        String sanitizedPrompt = piiSanitizer.sanitize(request.getUserPrompt());
        String sanitizedContext = piiSanitizer.sanitize(request.getContextData());
        request.setUserPrompt(sanitizedPrompt);
        request.setContextData(sanitizedContext);

        String systemInstruction = promptGuardrail.buildSystemInstruction(request);

        AiProviderAdapter provider = providerFactory.getProvider(null);
        long startMs = System.currentTimeMillis();

        AiCompletionResponse response;
        String status = "SUCCESS";
        String errorMsg = null;

        try {
            response = provider.complete(request, systemInstruction);
        } catch (Exception ex) {
            log.error("AI provider execution error: {}", ex.getMessage(), ex);
            status = "ERROR";
            errorMsg = ex.getMessage();
            AiProviderAdapter mock = providerFactory.getProvider("mock");
            response = mock.complete(request, systemInstruction);
        }

        long duration = System.currentTimeMillis() - startMs;

        // Log interaction metadata without sensitive PII
        try {
            interactionLogRepository.save(AiInteractionLog.builder()
                    .userId(callerUserId)
                    .provider(response.getProvider())
                    .model(response.getModel())
                    .userRole(callerRole != null ? callerRole : (request.getRole() != null ? request.getRole().name() : "USER"))
                    .intent(request.getIntent() != null ? request.getIntent().name() : "GENERAL")
                    .targetGradeLevel(request.getGradeLevel())
                    .targetSubject(request.getSubject())
                    .promptLength(sanitizedPrompt.length())
                    .responseLength(response.getContent() != null ? response.getContent().length() : 0)
                    .durationMs(duration)
                    .status(status)
                    .errorMessage(errorMsg)
                    .build());
        } catch (Exception logEx) {
            log.warn("Failed to persist AI interaction log: {}", logEx.getMessage());
        }

        return response;
    }

    @Transactional
    public Lesson saveAsLessonDraft(AiLessonPlanDetailsDto details, Long mentorId, Long groupId) {
        if (details == null) {
            throw new IllegalArgumentException("Dars rejasi ma'lumotlari kiritilmagan.");
        }

        Lesson lesson = Lesson.builder()
                .title(details.getTitle() != null ? details.getTitle() : "Yangi AI Dars Rejasi (Qoralama)")
                .subject(details.getSubject() != null ? details.getSubject() : "Web Full-Stack Development")
                .gradeLevel(details.getGradeLevel() != null ? details.getGradeLevel() : "8-sinf")
                .topic(details.getTopic() != null ? details.getTopic() : details.getTitle())
                .learningObjectives(details.getLearningObjectives())
                .expectedOutcomes(details.getExpectedOutcomes())
                .requiredMaterials(details.getRequiredMaterials())
                .theoryContent(details.getTheoryContent())
                .theoryDurationMinutes(details.getTheoryDurationMinutes() != null ? details.getTheoryDurationMinutes() : 20)
                .practicalContent(details.getPracticalContent())
                .practicalDurationMinutes(details.getPracticalDurationMinutes() != null ? details.getPracticalDurationMinutes() : 25)
                .exercises(details.getExercises())
                .homework(details.getHomework())
                .durationMinutes(details.getDurationMinutes() != null ? details.getDurationMinutes() : 80)
                .groupId(groupId)
                .mentorId(mentorId)
                .status("DRAFT") // Strictly saved as DRAFT requiring mentor review
                .build();

        return lessonRepository.save(lesson);
    }

    @Transactional
    public Assessment saveAsAssessmentDraft(
            String title,
            String subject,
            String gradeLevel,
            Long groupId,
            Long mentorId,
            List<AiQuizQuestionDto> questions
    ) {
        if (questions == null || questions.isEmpty()) {
            throw new IllegalArgumentException("Test uchun savollar mavjud emas.");
        }

        int totalPoints = questions.stream().mapToInt(q -> q.getPoints() != null ? q.getPoints() : 10).sum();

        Assessment assessment = assessmentRepository.save(Assessment.builder()
                .title(title != null && !title.isBlank() ? title : "AI tomonidan tuzilgan test (Ko'rib chiqish talab etiladi)")
                .description("Sun'iy intellekt tomonidan tayyorlangan qoralama test. Nashr qilishdan oldin mentor tekshiruvi shart.")
                .subject(subject != null ? subject : "Web Full-Stack Development")
                .gradeLevel(gradeLevel != null ? gradeLevel : "8-sinf")
                .assessmentType("QUIZ")
                .totalPoints(totalPoints > 0 ? totalPoints : 100)
                .passingScore((int) (totalPoints * 0.6))
                .durationMinutes(45)
                .isPublished(false) // Strictly UNPUBLISHED draft requiring mentor review
                .groupId(groupId)
                .createdByMentorId(mentorId)
                .build());

        int order = 1;
        for (AiQuizQuestionDto q : questions) {
            String optionsJson = "[]";
            String correctJson = "[]";
            try {
                if (q.getOptions() != null) {
                    optionsJson = objectMapper.writeValueAsString(q.getOptions());
                }
                if (q.getCorrectAnswer() != null) {
                    correctJson = objectMapper.writeValueAsString(List.of(q.getCorrectAnswer()));
                }
            } catch (JsonProcessingException ignored) {
            }

            assessmentQuestionRepository.save(AssessmentQuestion.builder()
                    .assessmentId(assessment.getId())
                    .questionText(q.getQuestionText())
                    .questionType(q.getQuestionType() != null ? q.getQuestionType() : "MULTIPLE_CHOICE")
                    .points(q.getPoints() != null ? q.getPoints() : 10)
                    .orderIndex(order++)
                    .optionsJson(optionsJson)
                    .correctAnswersJson(correctJson)
                    .explanation(q.getExplanation())
                    .build());
        }

        return assessment;
    }

    public List<Map<String, String>> getSuggestedPrompts(AiRole role, String language) {
        String lang = (language != null) ? language.toLowerCase() : "uz";

        if (role == AiRole.MENTOR_ASSISTANT) {
            return switch (lang) {
                case "ru" -> List.of(
                        Map.of("label", "Слайды лекции (Rich Text)", "prompt", "Создай интерактивную презентацию из 6 слайдов по теме 'Архитектура компьютеров Фон Неймана' для 8 класса."),
                        Map.of("label", "План урока по архитектуре", "prompt", "Составь 80-минутный план урока по теме 'Архитектура компьютеров Фон Неймана' для 8 класса."),
                        Map.of("label", "Тестовые вопросы", "prompt", "Создай 4 тестовых вопроса с вариантами ответов по теме 'HTML5 и формы'."),
                        Map.of("label", "Практические упражнения", "prompt", "Подготовь трехуровневые практические упражнения по CSS Flexbox."),
                        Map.of("label", "Домашнее задание", "prompt", "Предложи творческое домашнее задание по созданию макета сайта.")
                );
                case "en" -> List.of(
                        Map.of("label", "Lecture Presentation Slides", "prompt", "Generate a rich-text 6-slide lecture presentation on Von Neumann Architecture for 8th grade."),
                        Map.of("label", "Computer Architecture Lesson Plan", "prompt", "Generate an 80-minute lesson plan on Von Neumann Architecture for 8th grade."),
                        Map.of("label", "Quiz Draft", "prompt", "Draft 4 multiple-choice quiz questions on CPU and memory hierarchy."),
                        Map.of("label", "Practical Lab Exercises", "prompt", "Create tiered practical exercises for CSS Flexbox and Grid."),
                        Map.of("label", "Differentiated Tasks", "prompt", "Suggest differentiated homework for foundational and advanced students.")
                );
                default -> List.of(
                        Map.of("label", "Maruza taqdimot slaydlari (Rich Text)", "prompt", "8-sinf uchun 'Fon Neyman kompyuter arxitekturasi va CPU tuzilishi' mavzusida 6 slayddan iborat interaktiv maruza taqdimotini yaratib ber."),
                        Map.of("label", "Dars rejasi (8-sinf Arxitektura)", "prompt", "8-sinf o'quvchilari uchun 'Fon Neyman kompyuter arxitekturasi va CPU tuzilishi' mavzusida 80 daqiqalik to'liq dars rejasi tayyorlab ber."),
                        Map.of("label", "Oraliq test savollari", "prompt", "8-sinf 'HTML5 semantik teglari va CSS Flexbox' bo'yicha 4 ta variantli oraliq test savollari tuzib ber."),
                        Map.of("label", "3 darajali amaliy mashqlar", "prompt", "CSS Flexbox bo'yicha o'quvchilar darajasiga mos (boshlang'ich, o'rta, yuqori) 3 ta amaliy laboratoriya topshirig'ini yarat."),
                        Map.of("label", "Mavzuni tushuntirish metodikasi", "prompt", "8-sinf o'quvchilariga kompyuter xotira iyerarxiyasini (Kesh, RAM, SSD) hayotiy analogiyalar bilan qanday tushuntirish mumkin?")
                );
            };
        } else {
            return switch (lang) {
                case "ru" -> List.of(
                        Map.of("label", "Объясни простыми словами", "prompt", "Объясни простыми словами, что такое оперативная память (RAM) и зачем она нужна?"),
                        Map.of("label", "Подсказка к задаче", "prompt", "Дай подсказку к практическому упражнению по Flexbox, не давая готового ответа."),
                        Map.of("label", "Разбор ошибки", "prompt", "Почему этот код не работает или выдает ошибку? Помоги разобраться.")
                );
                case "en" -> List.of(
                        Map.of("label", "Explain Simply", "prompt", "Explain what CPU cache is and why it exists using simple analogies."),
                        Map.of("label", "Exercise Hint", "prompt", "Give me a guided hint for my coding exercise without revealing the solution."),
                        Map.of("label", "Analyze Incorrect Answer", "prompt", "Explain why my chosen answer was wrong and how to think about it correctly.")
                );
                default -> List.of(
                        Map.of("label", "Oddiy tilda tushuntir", "prompt", "Protsessor (CPU) va tezkor xotira (RAM) qanday ishlashini oddiy va qiziqarli o'xshatishlar bilan tushuntirib ber."),
                        Map.of("label", "Mashq uchun maslahat (Hint)", "prompt", "Menga tayyor javobni aytmasdan, ushbu masala yechimi bo'yicha yo'naltiruvchi maslahat ber."),
                        Map.of("label", "Xatoyimni tahlil qil", "prompt", "Testda 'SSD doimiy xotira' deb belgilagandim, nima uchun 'RAM' to'g'ri javob hisoblanadi?"),
                        Map.of("label", "Qo'shimcha o'rganish manbalari", "prompt", "HTML va CSS bo'yicha o'z ustimda mustaqil ishlash uchun qanday bepul amaliy loyihalar va manbalarni tavsiya qilasan?")
                );
            };
        }
    }
}
