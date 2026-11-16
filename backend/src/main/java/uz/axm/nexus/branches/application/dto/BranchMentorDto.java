package uz.axm.nexus.branches.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchMentorDto {
    private Long id;
    private String fullName;
    private String role;
    private String email;
    private String phone;
    private String specialization;
    private int assignedGroupCount;
    private List<String> assignedGroups;
    private int weeklyWorkloadHours;
    private String status;
}
