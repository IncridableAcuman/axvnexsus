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
public class CreateStudentRequest {

    @NotBlank(message = "O'quvchi to'liq ismi (F.I.Sh) kiritilishi shart")
    private String fullName;

    @NotBlank(message = "Sinf darajasi (8-sinf yoki 11-sinf) ko'rsatilishi shart")
    private String gradeLevel;

    private Long studyGroupId;
    private String direction;
    private String phone;
    private String pinfl;
    private String district;
    private String branchLocation;
    private Long branchId;
}
