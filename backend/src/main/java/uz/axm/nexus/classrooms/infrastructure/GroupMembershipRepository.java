package uz.axm.nexus.classrooms.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.classrooms.domain.GroupMembership;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupMembershipRepository extends JpaRepository<GroupMembership, Long> {
    List<GroupMembership> findByGroupIdAndStatus(Long groupId, String status);
    List<GroupMembership> findByGroupId(Long groupId);
    List<GroupMembership> findByStudentId(Long studentId);
    List<GroupMembership> findByStudentIdOrderByEnrolledAtDesc(Long studentId);
    Optional<GroupMembership> findByStudentIdAndStatus(Long studentId, String status);
    Optional<GroupMembership> findByStudentIdAndGroupIdAndStatus(Long studentId, Long groupId, String status);
    boolean existsByStudentIdAndGroupIdAndStatus(Long studentId, Long groupId, String status);
    boolean existsByStudentIdAndStatus(Long studentId, String status);
    long countByGroupIdAndStatus(Long groupId, String status);
}
