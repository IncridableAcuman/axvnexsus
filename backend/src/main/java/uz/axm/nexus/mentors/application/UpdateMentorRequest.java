package uz.axm.nexus.mentors.application;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMentorRequest {

    @NotBlank(message = "Mentor F.I.O kiritilishi shart")
    private String fullName;

    private String role;

    private String phone;

    private String email;

    private String branchLocation;

    private Long branchId;

    private String bio;

    private String status;
}
