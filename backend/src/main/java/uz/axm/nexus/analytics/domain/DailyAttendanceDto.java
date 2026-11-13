package uz.axm.nexus.analytics.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyAttendanceDto {
    private String day; // "Dushanba", "Seshanba", etc.
    private LocalDate date;
    private Double rate; // 98.0
    private Integer presentCount;
    private Integer lateCount;
    private Integer excusedCount;
    private Integer absentCount;
    private Integer totalCount;
}
