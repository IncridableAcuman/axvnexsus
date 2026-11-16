package uz.axm.nexus.scheduling.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.scheduling.domain.LessonSession;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LessonSessionRepository extends JpaRepository<LessonSession, Long> {
    List<LessonSession> findByLessonDate(LocalDate date);
    List<LessonSession> findByLessonDateBetween(LocalDate start, LocalDate end);
    List<LessonSession> findByMentorIdAndLessonDate(Long mentorId, LocalDate date);
    List<LessonSession> findByMentorIdAndLessonDateBetween(Long mentorId, LocalDate start, LocalDate end);
    List<LessonSession> findByGroupIdAndLessonDateBetween(Long groupId, LocalDate start, LocalDate end);
    List<LessonSession> findByMentorIdAndLessonDateAndStatusNot(Long mentorId, LocalDate date, String status);
    List<LessonSession> findByRoomAndLessonDateAndStatusNot(String room, LocalDate date, String status);
    List<LessonSession> findByGroupIdAndLessonDateAndStatusNot(Long groupId, LocalDate date, String status);
    List<LessonSession> findByScheduleId(Long scheduleId);
    List<LessonSession> findByScheduleIdAndLessonDateGreaterThanEqual(Long scheduleId, LocalDate fromDate);
    List<LessonSession> findByScheduleIdAndLessonDateBetween(Long scheduleId, LocalDate start, LocalDate end);
    boolean existsByScheduleIdAndLessonDateAndStatusNot(Long scheduleId, LocalDate date, String status);
    boolean existsByGroupIdAndLessonDateAndStartTimeAndStatusNot(Long groupId, LocalDate date, String startTime, String status);
    long countByTimeSlotId(Long timeSlotId);
}
