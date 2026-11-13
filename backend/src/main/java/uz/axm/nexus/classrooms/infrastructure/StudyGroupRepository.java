package uz.axm.nexus.classrooms.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.classrooms.domain.StudyGroup;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudyGroupRepository extends JpaRepository<StudyGroup, Long> {
    Optional<StudyGroup> findByGroupCodeIgnoreCase(String groupCode);
    boolean existsByGroupCodeIgnoreCaseAndIdNot(String groupCode, Long id);
    List<StudyGroup> findByGradeLevel(String gradeLevel);
    List<StudyGroup> findByMentorId(Long mentorId);
    List<StudyGroup> findByBranchId(Long branchId);
    List<StudyGroup> findByBranchIdAndStatus(Long branchId, String status);
    long countByBranchId(Long branchId);
    long countByBranchIdAndStatus(Long branchId, String status);
}
