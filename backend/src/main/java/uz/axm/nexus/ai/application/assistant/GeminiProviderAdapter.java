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
public class GeminiProviderAdapter implements AiProviderAdapter {

    @Value("${app.ai.gemini.api-key:}")
    private String defaultApiKey;

    @Value("${app.ai.gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    private final MockAiProviderAdapter mockFallbackAdapter;
    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.builder().build();

    @Override
    public String getProviderName() {
        return "gemini";
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
            log.info("No Gemini API key configured. Falling back to pedagogical engine.");
            return mockFallbackAdapter.complete(request, systemPrompt);
        }

        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String fullPrompt = (systemPrompt != null && !systemPrompt.isBlank())
                        ? systemPrompt + "\n\nFoydalanuvchi so'rovi:\n" + request.getUserPrompt()
                        : request.getUserPrompt();

                Map<String, Object> part = Map.of("text", fullPrompt);
                Map<String, Object> contentObj = Map.of("parts", List.of(part));
                Map<String, Object> requestBody = Map.of(
                        "contents", List.of(contentObj),
                        "generationConfig", Map.of(
                                "temperature", 0.6,
                                "maxOutputTokens", 2048
                        )
                );

                String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + geminiModel + ":generateContent?key=" + apiKey;

                String responseBody = restClient.post()
                        .uri(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(objectMapper.writeValueAsString(requestBody))
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode candidates = root.path("candidates");
                String content = "";
                if (candidates.isArray() && !candidates.isEmpty()) {
                    content = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                }

                int totalTokens = root.path("usageMetadata").path("totalTokenCount").asInt(450);

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
                        .provider("gemini")
                        .model(geminiModel)
                        .tokensUsed(totalTokens)
                        .generatedQuizQuestions(Collections.emptyList())
                        .generatedLessonPlan(null)
                        .generatedPresentationSlides(presentationSlides)
                        .build();

            } catch (Exception e) {
                log.warn("Gemini API call attempt {} failed: {}", attempt, e.getMessage());
                if (attempt == maxRetries) {
                    log.error("Gemini provider exhausted retries: {}", e.getMessage());
                    throw new RuntimeException("Gemini AI xizmatiga ulanishda xatolik: " + e.getMessage(), e);
                }
                try {
                    Thread.sleep(attempt * 500L);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        throw new RuntimeException("Gemini AI javob bermadi.");
    }
}
