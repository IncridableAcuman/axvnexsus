package uz.axm.nexus.scheduling.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.axm.nexus.users.application.StudentDto;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualScheduleRequest {
    private String mentorName;
    private String mentorRole;
    private Long mentorId;
    private String branchLocation;
    private Long branchId;
    private String groupCode;
    private Long groupId;
    private String gradeLevel;
    private String subject;
    private String dayPattern;
    private List<String> selectedDays;
    private String days;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long shiftId;
    private Long timeSlotId;
    private String startTime;
    private String endTime;
    private String room;
    private String topic;
    @Builder.Default
    private String updateScope = "FUTURE_ONLY"; // "FUTURE_ONLY", "ALL_UNCOMPLETED"
    private Boolean generateSessions;
    private List<StudentDto> students;
}
