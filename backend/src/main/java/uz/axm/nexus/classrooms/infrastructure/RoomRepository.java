package uz.axm.nexus.classrooms.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.classrooms.domain.Room;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByName(String name);
    List<Room> findByBranchLocation(String branchLocation);
    List<Room> findByBranchId(Long branchId);
    long countByBranchId(Long branchId);
}
