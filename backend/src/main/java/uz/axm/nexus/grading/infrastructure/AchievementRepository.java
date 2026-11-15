package uz.axm.nexus.grading.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.grading.domain.Achievement;

import java.util.List;
import java.util.Optional;

@Repository
public interface AchievementRepository extends JpaRepository<Achievement, Long> {
    Optional<Achievement> findByCode(String code);
    List<Achievement> findByIsActiveTrue();
    List<Achievement> findByIsActiveTrueOrderByDisplayOrderAsc();
    List<Achievement> findAllByOrderByDisplayOrderAscCreatedAtAsc();
    List<Achievement> findByCategory(String category);
    List<Achievement> findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(String category);
}
