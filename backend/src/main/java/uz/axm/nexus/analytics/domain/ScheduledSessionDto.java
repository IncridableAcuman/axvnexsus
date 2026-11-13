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
public class ScheduledSessionDto {
    private Long id;
    private Long groupId;
    private String groupCode;
    private String subject;
    private String topic;
    private String gradeLevel;
    private String mentorName;
    private String room;
    private String branchLocation;
    private LocalDate lessonDate;
    private String startTime; // "14:00"
    private String endTime; // "15:20"
    private String status; // "SCHEDULED", "COMPLETED", etc.
    private Integer studentCount;
}
