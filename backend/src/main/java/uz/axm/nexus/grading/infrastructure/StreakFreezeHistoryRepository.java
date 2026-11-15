package uz.axm.nexus.grading.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.grading.domain.StreakFreezeHistory;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StreakFreezeHistoryRepository extends JpaRepository<StreakFreezeHistory, Long> {
    List<StreakFreezeHistory> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    Optional<StreakFreezeHistory> findByStudentIdAndUsedDate(Long studentId, LocalDate usedDate);
    boolean existsByStudentIdAndUsedDate(Long studentId, LocalDate usedDate);
    boolean existsByStudentIdAndUsedDateAndActionTypeIn(Long studentId, LocalDate usedDate, Collection<String> actionTypes);
}
