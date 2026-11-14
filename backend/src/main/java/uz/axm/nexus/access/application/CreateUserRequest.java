package uz.axm.nexus.access.application;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {

    @NotBlank(message = "Foydalanuvchi F.I.O kiritilishi shart")
    private String fullName;

    private String username;

    private String email;

    private String phone;

    private String password;

    @NotBlank(message = "Asosiy rol kiritilishi shart")
    private String primaryRole;

    private Set<String> roles;
}
