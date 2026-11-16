package uz.axm.nexus.scheduling.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.scheduling.domain.AttendanceRecord;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByLessonSessionId(Long lessonSessionId);
    long countByLessonSessionId(Long lessonSessionId);
    Optional<AttendanceRecord> findByLessonSessionIdAndStudentId(Long lessonSessionId, Long studentId);
    List<AttendanceRecord> findByStudentId(Long studentId);

    @org.springframework.data.jpa.repository.Query("SELECT a FROM AttendanceRecord a WHERE a.student.id = :studentId AND a.lessonSession.lessonDate BETWEEN :start AND :end")
    List<AttendanceRecord> findByStudentIdAndDateRange(
            @org.springframework.data.repository.query.Param("studentId") Long studentId,
            @org.springframework.data.repository.query.Param("start") java.time.LocalDate start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDate end
    );

    @org.springframework.data.jpa.repository.Query("SELECT a FROM AttendanceRecord a WHERE a.lessonSession.group.id = :groupId AND a.lessonSession.lessonDate BETWEEN :start AND :end")
    List<AttendanceRecord> findByGroupIdAndDateRange(
            @org.springframework.data.repository.query.Param("groupId") Long groupId,
            @org.springframework.data.repository.query.Param("start") java.time.LocalDate start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDate end
    );
}
