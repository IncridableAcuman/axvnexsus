package uz.axm.nexus.grading.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.grading.domain.StudentStreak;

import java.util.Optional;

@Repository
public interface StudentStreakRepository extends JpaRepository<StudentStreak, Long> {
    Optional<StudentStreak> findByStudentId(Long studentId);
}
