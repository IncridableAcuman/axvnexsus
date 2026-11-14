package uz.axm.nexus.access.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProvisionDto {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String primaryRole;
    private List<String> roles;
    private Set<String> effectivePermissions;
    private String temporaryPassword;
    private boolean enabled;
    private LocalDateTime createdAt;
}
