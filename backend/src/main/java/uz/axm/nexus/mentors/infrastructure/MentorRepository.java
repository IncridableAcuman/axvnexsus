package uz.axm.nexus.mentors.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.mentors.domain.Mentor;

import java.util.Optional;

@Repository
public interface MentorRepository extends JpaRepository<Mentor, Long> {
    Optional<Mentor> findByFullNameIgnoreCase(String fullName);
    Optional<Mentor> findByFullNameContainingIgnoreCase(String fullName);
    Optional<Mentor> findByUserId(Long userId);
}
