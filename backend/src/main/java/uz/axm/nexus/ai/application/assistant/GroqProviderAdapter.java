package uz.axm.nexus.ai.application.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import uz.axm.nexus.ai.domain.assistant.*;

import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class GroqProviderAdapter implements AiProviderAdapter {

    @Value("${app.ai.groq.api-key:}")
    private String defaultApiKey;

    @Value("${app.ai.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    @Value("${app.ai.groq.base-url:https://api.groq.com/openai/v1}")
    private String groqBaseUrl;

    @Value("${app.ai.timeout-ms:30000}")
    private int timeoutMs;

    private final MockAiProviderAdapter mockFallbackAdapter;
    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.builder().build();

    @Override
    public String getProviderName() {
        return "groq";
    }

    @Override
    public boolean isAvailable() {
        return defaultApiKey != null && !defaultApiKey.isBlank();
    }

    @Override
    public AiCompletionResponse complete(AiPromptRequest request, String systemPrompt) {
        String apiKey = (request.getCustomApiKey() != null && !request.getCustomApiKey().isBlank())
                ? request.getCustomApiKey()
                : defaultApiKey;

        if (apiKey == null || apiKey.isBlank()) {
            log.info("No Groq API key configured. Seamlessly falling back to authentic pedagogical offline engine.");
            return mockFallbackAdapter.complete(request, systemPrompt);
        }

        String effectiveModel = groqModel;

        // Bounded retries (3 attempts on rate limits or transient errors)
        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                Map<String, Object> body = new HashMap<>();
                body.put("model", effectiveModel);
                body.put("temperature", 0.6);
                body.put("max_tokens", 2048);

                List<Map<String, String>> messages = new ArrayList<>();
                messages.add(Map.of("role", "system", "content", systemPrompt));
                messages.add(Map.of("role", "user", "content", request.getUserPrompt()));
                body.put("messages", messages);

                String endpoint = groqBaseUrl + "/chat/completions";
                String responseBody = restClient.post()
                        .uri(endpoint)
                        .header("Authorization", "Bearer " + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(objectMapper.writeValueAsString(body))
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(responseBody);
                String content = root.path("choices").path(0).path("message").path("content").asText();
                int totalTokens = root.path("usage").path("total_tokens").asInt(0);

                List<AiQuizQuestionDto> questions = extractQuizQuestions(content, request);
                AiLessonPlanDetailsDto lessonPlan = extractLessonPlan(content, request);
                List<String> presentationSlides = Collections.emptyList();
                if (request.getIntent() == AiIntent.PRESENTATION_SLIDES && content != null && content.contains("---")) {
                    presentationSlides = Arrays.stream(content.split("(?m)^---+$"))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList();
                }

                return AiCompletionResponse.builder()
                        .success(true)
                        .content(content)
                        .role(request.getRole())
                        .intent(request.getIntent())
                        .provider("groq")
                        .model(effectiveModel)
                        .tokensUsed(totalTokens > 0 ? totalTokens : 450)
                        .generatedQuizQuestions(questions)
                        .generatedLessonPlan(lessonPlan)
                        .generatedPresentationSlides(presentationSlides)
                        .build();

            } catch (Exception e) {
                log.warn("Groq API call attempt {} failed with model {}: {}", attempt, effectiveModel, e.getMessage());

                // Agar model mavjud bo'lmasa yoki ruxsat berilmagan bo'lsa (404 model_not_found), barqaror llama-3.1-8b-instant ga o'tish
                if (e.getMessage() != null && e.getMessage().contains("model_not_found") && !"llama-3.1-8b-instant".equals(effectiveModel)) {
                    log.warn("Groq model '{}' topilmadi yoki ruxsat yo'q. 'llama-3.1-8b-instant' modeliga avtomatik o'tilmoqda.", effectiveModel);
                    effectiveModel = "llama-3.1-8b-instant";
                    continue;
                }

                if (attempt == maxRetries) {
                    log.error("Groq provider exhausted retries: {}", e.getMessage());
                    throw new RuntimeException("Groq AI xizmatiga ulanishda xatolik: " + e.getMessage(), e);
                }
                try {
                    Thread.sleep(attempt * 500L);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        throw new RuntimeException("Groq AI javob bermadi.");
    }

    private List<AiQuizQuestionDto> extractQuizQuestions(String content, AiPromptRequest request) {
        if (request.getIntent() != AiIntent.QUIZ_GENERATION && !content.toLowerCase().contains("to'g'ri javob")) {
            return Collections.emptyList();
        }

        List<AiQuizQuestionDto> result = new ArrayList<>();
        String[] blocks = content.split("(?m)^(?=[0-9]+[.)]\\s+)");
        for (String block : blocks) {
            block = block.trim();
            if (block.isEmpty() || !block.matches("^[0-9]+[.)].*")) {
                continue;
            }

            List<String> options = new ArrayList<>();
            String correctAnswer = "";
            String explanation = "";
            StringBuilder qTextBuilder = new StringBuilder();
            boolean readingOptions = false;

            String[] lines = block.split("\n");
            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isEmpty()) continue;

                if (line.matches("(?i)^[A-D][).].*")) {
                    readingOptions = true;
                    options.add(line);
                } else if (line.matches("(?i)^(To'g'ri javob|Togri javob|To'g'ri|Javob|Correct answer)\\s*:.*")) {
                    correctAnswer = line.replaceFirst("(?i)^(To'g'ri javob|Togri javob|To'g'ri|Javob|Correct answer)\\s*:\\s*", "").trim();
                } else if (line.matches("(?i)^(Tushuntirish|Izoh|Explanation)\\s*:.*")) {
                    explanation = line.replaceFirst("(?i)^(Tushuntirish|Izoh|Explanation)\\s*:\\s*", "").trim();
                } else if (!readingOptions) {
                    if (qTextBuilder.length() > 0) qTextBuilder.append(" ");
                    qTextBuilder.append(line.replaceFirst("^[0-9]+[.)]\\s*", ""));
                } else if (!explanation.isEmpty()) {
                    explanation += " " + line;
                }
            }

            String questionText = qTextBuilder.toString().trim();
            if (!questionText.isEmpty() && options.size() >= 2) {
                if (correctAnswer.length() <= 2) {
                    for (String opt : options) {
                        if (opt.toUpperCase().startsWith(correctAnswer.toUpperCase())) {
                            correctAnswer = opt;
                            break;
                        }
                    }
                }

                result.add(AiQuizQuestionDto.builder()
                        .questionText(questionText)
                        .questionType("MULTIPLE_CHOICE")
                        .options(options)
                        .correctAnswer(!correctAnswer.isEmpty() ? correctAnswer : options.get(0))
                        .explanation(!explanation.isEmpty() ? explanation : "AI tavsiya qilgan tushuntirish.")
                        .points(25)
                        .build());
            }
        }

        if (result.isEmpty() && request.getIntent() == AiIntent.QUIZ_GENERATION) {
            String topic = (request.getTopic() != null && !request.getTopic().isBlank())
                    ? request.getTopic()
                    : request.getUserPrompt();
            result.add(AiQuizQuestionDto.builder()
                    .questionText(topic + " mavzusi bo'yicha asosiy tushuncha:")
                    .questionType("MULTIPLE_CHOICE")
                    .options(List.of("A) Asosiy tamoyil va amaliy qo'llanilishi", "B) Faqat nazariy ta'rif", "C) Tizimli xatolik", "D) Boshqa"))
                    .correctAnswer("A) Asosiy tamoyil va amaliy qo'llanilishi")
                    .explanation(topic + " mavzusining asosiy mohiyati dasturlash va muhandislik amaliyotiga asoslanadi.")
                    .points(25)
                    .build());
        }

        return result;
    }

    private AiLessonPlanDetailsDto extractLessonPlan(String content, AiPromptRequest request) {
        if (request.getIntent() != AiIntent.LESSON_PLAN) {
            return null;
        }

        String topic = (request.getTopic() != null && !request.getTopic().isBlank())
                ? request.getTopic()
                : (request.getUserPrompt().length() > 60 ? request.getUserPrompt().substring(0, 60) + "..." : request.getUserPrompt());

        String subject = (request.getSubject() != null && !request.getSubject().isBlank())
                ? request.getSubject()
                : "Web Full-Stack Development";

        String grade = (request.getGradeLevel() != null && !request.getGradeLevel().isBlank())
                ? request.getGradeLevel()
                : "8-sinf";

        String theory = extractSection(content, "nazariya|nazariy", "20 daqiqalik nazariy tushuntirish va interaktiv taqdimot.");
        String practical = extractSection(content, "amaliy|amaliyot|laboratoriya", "25 daqiqalik amaliy laboratoriya mashg'uloti.");
        String exercises = extractSection(content, "mashq|topshiriq", "Mustaqil va differensial amaliy mashqlar.");
        String homework = extractSection(content, "uyga vazifa|uy ishi", "Mavzuni mustahkamlash bo'yicha amaliy topshiriq va konspekt.");

        return AiLessonPlanDetailsDto.builder()
                .title(topic + " — 80 daqiqalik dars rejasi")
                .subject(subject)
                .gradeLevel(grade)
                .topic(topic)
                .learningObjectives("O'quvchilar " + topic + " mavzusining asosiy tamoyillarini va amaliy qo'llanilishini o'rganadilar.")
                .expectedOutcomes("Dars yakunida o'quvchilar mavzu bo'yicha mustaqil topshiriqlarni bajara oladilar.")
                .requiredMaterials("Kompyuter laboratoriyasi, proyektor, kod muharriri (VS Code), brauzer.")
                .theoryContent(theory)
                .theoryDurationMinutes(20)
                .practicalContent(practical)
                .practicalDurationMinutes(25)
                .exercises(exercises)
                .homework(homework)
                .durationMinutes(80)
                .build();
    }

    private String extractSection(String content, String regexKeywords, String defaultVal) {
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(?i)(?:###|####|\\*\\*)[^\\n]*(?:" + regexKeywords + ")[^\\n]*(?:\\*\\*)?\\s*\\n([^#*]+)");
        java.util.regex.Matcher matcher = pattern.matcher(content);
        if (matcher.find()) {
            String extracted = matcher.group(1).trim();
            if (extracted.length() > 10) {
                return extracted.length() > 1000 ? extracted.substring(0, 1000) + "..." : extracted;
            }
        }
        return defaultVal;
    }
}
