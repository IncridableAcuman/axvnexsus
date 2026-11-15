package uz.axm.nexus.grading.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.grading.domain.StudentAchievement;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentAchievementRepository extends JpaRepository<StudentAchievement, Long> {
    List<StudentAchievement> findByStudentId(Long studentId);
    Optional<StudentAchievement> findByStudentIdAndAchievementId(Long studentId, Long achievementId);
    boolean existsByStudentIdAndAchievementId(Long studentId, Long achievementId);
    long countByStudentId(Long studentId);
}
