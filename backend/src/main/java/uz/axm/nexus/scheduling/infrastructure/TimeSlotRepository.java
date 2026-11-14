package uz.axm.nexus.scheduling.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.scheduling.domain.TimeSlot;

import java.util.List;

@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {

    List<TimeSlot> findByActiveTrueOrderByDisplayOrderAscStartTimeAsc();

    List<TimeSlot> findAllByOrderByDisplayOrderAscStartTimeAsc();

    List<TimeSlot> findByBranchIdAndActiveTrueOrderByDisplayOrderAscStartTimeAsc(Long branchId);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    boolean existsByStartTimeAndEndTime(String startTime, String endTime);

    boolean existsByStartTimeAndEndTimeAndIdNot(String startTime, String endTime, Long id);

    java.util.Optional<TimeSlot> findByStartTimeAndEndTime(String startTime, String endTime);
}
