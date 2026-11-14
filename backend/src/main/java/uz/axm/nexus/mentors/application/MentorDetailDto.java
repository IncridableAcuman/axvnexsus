package uz.axm.nexus.mentors.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorDetailDto {
    private Long id;
    private String fullName;
    private String role;
    private String phone;
    private String email;
    private String branchLocation;
    private Long branchId;
    private String branchName;
    private String bio;
    private String status;
    private String username;
    private boolean accountEnabled;
    private Integer activeGroupsCount;
    private Integer activeStudentsCount;
    private Integer weeklyHours;
    private List<AssignedGroupDto> assignedGroups;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignedGroupDto {
        private Long id;
        private String groupCode;
        private String subject;
        private String gradeLevel;
        private Integer studentCount;
        private String scheduleDays;
        private String scheduleTime;
        private String status;
    }
}
