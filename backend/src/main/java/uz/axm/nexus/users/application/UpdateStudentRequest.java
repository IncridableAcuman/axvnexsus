package uz.axm.nexus.users.application;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStudentRequest {

    @NotBlank(message = "O'quvchi F.I.O kiritilishi shart")
    private String fullName;

    private String phone;

    private String pinfl;

    private String gradeLevel;

    private String district;

    private String direction;

    private Long branchId;

    private String branchLocation;

    private Long studyGroupId;

    private Long mentorId;

    private String status;
}
