package uz.axm.nexus.users.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.users.domain.Student;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findByGradeLevel(String gradeLevel);
    List<Student> findByMentorId(Long mentorId);
    List<Student> findByStudyGroupId(Long studyGroupId);
    default List<Student> findByGroupId(Long groupId) {
        return findByStudyGroupId(groupId);
    }
    Optional<Student> findByPinfl(String pinfl);
    Optional<Student> findByStudentIdNumber(String studentIdNumber);
    Optional<Student> findByUserId(Long userId);
    Optional<Student> findByFullNameIgnoreCase(String fullName);
}
