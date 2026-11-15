package uz.axm.nexus.grading.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.grading.domain.GamificationConfiguration;
import uz.axm.nexus.grading.infrastructure.GamificationConfigurationRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class GamificationConfigService {

    private final GamificationConfigurationRepository configRepository;
    private final Map<String, String> memoryCache = new ConcurrentHashMap<>();

    public int getIntConfig(String key, int defaultValue) {
        String val = memoryCache.computeIfAbsent(key, k ->
                configRepository.findByConfigKey(k)
                        .map(GamificationConfiguration::getConfigValue)
                        .orElse(null)
        );
        if (val == null) return defaultValue;
        try {
            return Integer.parseInt(val.trim());
        } catch (NumberFormatException e) {
            log.warn("Konfiguratsiya '{}' butun songa o'girilmadi: '{}', standart qiymat ({}) ishlatiladi", key, val, defaultValue);
            return defaultValue;
        }
    }

    public String getStringConfig(String key, String defaultValue) {
        String val = memoryCache.computeIfAbsent(key, k ->
                configRepository.findByConfigKey(k)
                        .map(GamificationConfiguration::getConfigValue)
                        .orElse(null)
        );
        return val != null ? val : defaultValue;
    }

    public int getQuizCompleteXp() {
        return getIntConfig("xp.quiz.complete", 10);
    }

    public int getQuizPassXp() {
        return getIntConfig("xp.quiz.pass", 20);
    }

    public int getQuizHighScoreXp() {
        return getIntConfig("xp.quiz.high_score", 30);
    }

    public int getAssignmentCompleteXp() {
        return getIntConfig("xp.assignment.complete", 15);
    }

    public int getAssignmentOnTimeXp() {
        return getIntConfig("xp.assignment.on_time", 10);
    }

    public int getAssignmentExcellentXp() {
        return getIntConfig("xp.assignment.excellent", 25);
    }

    public int getLessonCompleteXp() {
        return getIntConfig("xp.lesson.complete", 5);
    }

    public int getDailyStreakXp() {
        return getIntConfig("xp.streak.daily", 15);
    }

    public int getDefaultStreakFreezeCount() {
        return getIntConfig("streak.freeze.default_balance", 1);
    }

    public int getMaxStreakFreezeCount() {
        return getIntConfig("streak.freeze.max_balance", 5);
    }

    public int getStreakMilestoneXp(int days, int defaultXp) {
        return getIntConfig("xp.streak.milestone." + days, defaultXp);
    }

    public int getLevelThreshold(int level, int defaultThreshold) {
        return getIntConfig("level.threshold." + level, defaultThreshold);
    }

    public String getStreakFreezePolicy() {
        return getStringConfig("streak.freeze.policy", "AUTO");
    }

    public List<GamificationConfiguration> getAllConfigurations() {
        return configRepository.findAll();
    }

    public List<GamificationConfiguration> getConfigurationsByCategory(String category) {
        return configRepository.findByCategoryOrderByConfigKeyAsc(category);
    }

    @Transactional
    public GamificationConfiguration updateConfiguration(String key, String value, String description, Long userId) {
        GamificationConfiguration config = configRepository.findByConfigKey(key)
                .orElseGet(() -> GamificationConfiguration.builder()
                        .configKey(key)
                        .category("XP_REWARD")
                        .build());

        config.setConfigValue(value);
        if (description != null && !description.isBlank()) {
            config.setDescription(description);
        }
        config.setUpdatedByUserId(userId);
        config.setUpdatedAt(LocalDateTime.now());

        GamificationConfiguration saved = configRepository.save(config);
        memoryCache.put(key, value);
        log.info("Gamifikatsiya konfiguratsiyasi yangilandi: Key={}, Value={}, UserID={}", key, value, userId);
        return saved;
    }

    public void clearCache() {
        memoryCache.clear();
    }
}
