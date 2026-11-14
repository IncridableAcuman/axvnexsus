package uz.axm.nexus.users.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDetailDto {
    private Long id;
    private String fullName;
    private String studentIdNumber;
    private String username;
    private String pinfl;
    private String phone;
    private String gradeLevel;
    private String direction;
    private String district;
    private String branchLocation;
    private Long branchId;
    private String branchName;
    private Long studyGroupId;
    private String groupCode;
    private Long mentorId;
    private String mentorName;
    private String status;
    private boolean accountEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
