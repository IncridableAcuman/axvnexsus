package uz.axm.nexus.scheduling.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.scheduling.domain.Schedule;

import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByGradeLevel(String gradeLevel);
    List<Schedule> findByMentorId(Long mentorId);
    List<Schedule> findByStudyGroupId(Long studyGroupId);
    long countByStartTimeAndEndTime(String startTime, String endTime);
}
