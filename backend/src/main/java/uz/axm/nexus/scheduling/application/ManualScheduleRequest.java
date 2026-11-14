package uz.axm.nexus.scheduling.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.axm.nexus.users.application.StudentDto;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualScheduleRequest {
    private String mentorName;
    private String mentorRole;
    private String branchLocation;
    private Long branchId;
    private String groupCode;
    private String gradeLevel;
    private String subject;
    private String dayPattern;
    private List<String> selectedDays;
    private String days;
    private String startTime;
    private String endTime;
    private String room;
    private String topic;
    private List<StudentDto> students;
}
