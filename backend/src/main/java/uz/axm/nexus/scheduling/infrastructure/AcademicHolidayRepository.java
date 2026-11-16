package uz.axm.nexus.scheduling.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.scheduling.domain.AcademicHoliday;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AcademicHolidayRepository extends JpaRepository<AcademicHoliday, Long> {

    List<AcademicHoliday> findByHolidayDateBetween(LocalDate startDate, LocalDate endDate);

    @Query("SELECT h FROM AcademicHoliday h WHERE h.holidayDate BETWEEN :startDate AND :endDate " +
           "AND (h.branch IS NULL OR h.branch.id = :branchId)")
    List<AcademicHoliday> findHolidaysForBranchInRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("branchId") Long branchId
    );

    boolean existsByHolidayDate(LocalDate date);
}
