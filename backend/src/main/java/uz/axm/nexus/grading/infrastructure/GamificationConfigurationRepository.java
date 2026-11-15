package uz.axm.nexus.grading.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.grading.domain.GamificationConfiguration;

import java.util.List;
import java.util.Optional;

@Repository
public interface GamificationConfigurationRepository extends JpaRepository<GamificationConfiguration, Long> {
    Optional<GamificationConfiguration> findByConfigKey(String configKey);
    List<GamificationConfiguration> findByCategoryOrderByConfigKeyAsc(String category);
}
