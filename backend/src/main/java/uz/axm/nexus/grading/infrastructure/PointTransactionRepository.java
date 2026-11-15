package uz.axm.nexus.grading.infrastructure;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import uz.axm.nexus.grading.domain.PointTransaction;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {

    List<PointTransaction> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    Page<PointTransaction> findByStudentIdOrderByCreatedAtDesc(Long studentId, Pageable pageable);

    Page<PointTransaction> findByStudentIdAndPointSourceOrderByCreatedAtDesc(Long studentId, String pointSource, Pageable pageable);

    Optional<PointTransaction> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PointTransaction p WHERE p.studentId = :studentId")
    int getTotalPointsByStudent(@Param("studentId") Long studentId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PointTransaction p WHERE p.studentId = :studentId AND p.createdAt >= :startDate AND p.createdAt <= :endDate")
    int getPointsByStudentAndPeriod(
            @Param("studentId") Long studentId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT p.pointSource, COALESCE(SUM(p.amount), 0), COUNT(p.id) FROM PointTransaction p WHERE p.studentId = :studentId GROUP BY p.pointSource")
    List<Object[]> getPointsSummaryBySource(@Param("studentId") Long studentId);

    @Query("SELECT COUNT(p.id) FROM PointTransaction p WHERE p.studentId = :studentId AND p.pointSource = :source")
    long countByStudentIdAndPointSource(@Param("studentId") Long studentId, @Param("source") String source);

    @Query("SELECT p.studentId, SUM(p.amount) as total, MAX(p.amount) as maxSingle, MIN(p.createdAt) as earliest " +
           "FROM PointTransaction p " +
           "GROUP BY p.studentId " +
           "ORDER BY total DESC, maxSingle DESC, earliest ASC, p.studentId ASC")
    List<Object[]> getLeaderboardDataAllTime();

    @Query("SELECT p.studentId, SUM(p.amount) as total, MAX(p.amount) as maxSingle, MIN(p.createdAt) as earliest " +
           "FROM PointTransaction p " +
           "WHERE p.createdAt >= :since " +
           "GROUP BY p.studentId " +
           "ORDER BY total DESC, maxSingle DESC, earliest ASC, p.studentId ASC")
    List<Object[]> getLeaderboardDataSince(@Param("since") LocalDateTime since);

    @Query("SELECT p.studentId, SUM(p.amount) as total, MAX(p.amount) as maxSingle, MIN(p.createdAt) as earliest " +
           "FROM PointTransaction p " +
           "WHERE p.createdAt >= :start AND p.createdAt <= :end " +
           "GROUP BY p.studentId " +
           "ORDER BY total DESC, maxSingle DESC, earliest ASC, p.studentId ASC")
    List<Object[]> getLeaderboardDataBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    default List<Object[]> getLeaderboardData(LocalDateTime since) {
        return since == null ? getLeaderboardDataAllTime() : getLeaderboardDataSince(since);
    }
}
