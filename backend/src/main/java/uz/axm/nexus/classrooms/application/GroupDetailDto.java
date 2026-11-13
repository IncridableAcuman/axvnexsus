package uz.axm.nexus.classrooms.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.axm.nexus.education.application.AcademicPeriodDto;
import uz.axm.nexus.mentors.domain.Mentor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupDetailDto {
    private Long id;
    private String groupCode;
    private String gradeLevel;
    private String subject;
    private String branchLocation;
    private Long branchId;
    private String branchName;
    private String scheduleDays;
    private String scheduleTime;
    private String room;
    private Mentor mentor;
    private AcademicPeriodDto academicPeriod;
    private String status;
    private Integer maxCapacity;
    private Integer studentCount;
    private List<GroupMembershipDto> activeMembers;
}
