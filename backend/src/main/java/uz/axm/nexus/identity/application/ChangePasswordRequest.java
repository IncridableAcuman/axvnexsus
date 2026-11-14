package uz.axm.nexus.identity.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "Joriy parol kiritilishi shart")
    private String currentPassword;

    @NotBlank(message = "Yangi parol kiritilishi shart")
    @Size(min = 6, message = "Yangi parol kamida 6 belgidan iborat bo'lishi shart")
    private String newPassword;
}
