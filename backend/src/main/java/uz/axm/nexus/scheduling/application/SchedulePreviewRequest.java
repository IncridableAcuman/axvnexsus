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
public class SchedulePreviewRequest {
    private String dayPattern;
    private List<String> selectedDays;
    private String days;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long shiftId;
    private Long timeSlotId;
    private String startTime;
    private String endTime;
    private Long mentorId;
    private String mentorName;
    private String room;
    private Long groupId;
    private String groupCode;
    private Long branchId;
    private Long excludeScheduleId;
}
