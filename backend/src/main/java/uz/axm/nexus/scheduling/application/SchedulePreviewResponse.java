package uz.axm.nexus.scheduling.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchedulePreviewResponse {
    private int totalSessions;
    private String dayPattern;
    private List<String> weekdays;
    private String timeInterval;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<LocalDate> sessionDates;
    private int holidaysCount;
    private List<LocalDate> skippedHolidays;
    private boolean hasConflicts;
    private List<ConflictDetailDto> conflicts;
}
