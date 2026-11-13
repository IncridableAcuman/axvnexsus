package uz.axm.nexus.identity.infrastructure;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.audit.domain.AuditLog;
import uz.axm.nexus.audit.infrastructure.AuditLogRepository;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * SuperAdminBootstrapService
 *
 * Provides safe, audited, non-reentrant initialization of the initial SUPER_ADMIN account.
 * Follows zero-trust cloud principles:
 * - Disabled by default (SUPER_ADMIN_BOOTSTRAP_ENABLED=false)
 * - Refuses execution if an active SUPER_ADMIN already exists (cannot overwrite)
 * - Enforces password complexity (min 12 chars, upper, lower, digit, symbol)
 * - Never logs credentials or passwords
 * - Persists audit trail of initialization or rejected attempts
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SuperAdminBootstrapService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogRepository auditLogRepository;

    @Value("${app.security.superadmin-bootstrap.enabled:false}")
    private boolean bootstrapEnabled;

    @Value("${app.security.superadmin-bootstrap.username:admin}")
    private String bootstrapUsername;

    @Value("${app.security.superadmin-bootstrap.password:}")
    private String bootstrapPassword;

    @Value("${app.security.superadmin-bootstrap.email:admin@axm-nexus.uz}")
    private String bootstrapEmail;

    @Value("${app.security.superadmin-bootstrap.full-name:Tizim Super Administratori}")
    private String bootstrapFullName;

    private static final Pattern PASSWORD_COMPLEXITY_PATTERN =
            Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{12,}$");

    @Transactional
    public boolean bootstrapInitialSuperAdmin() {
        if (!bootstrapEnabled) {
            log.info("[SECURITY] SuperAdmin bootstrap is DISABLED (SUPER_ADMIN_BOOTSTRAP_ENABLED=false).");
            return false;
        }

        // 1. Refuse if an active SUPER_ADMIN already exists in the system
        boolean superAdminExists = userRepository.findAll().stream()
                .anyMatch(u -> u.isEnabled() && ("ROLE_SUPER_ADMIN".equalsIgnoreCase(u.getRole()) ||
                        "SUPER_ADMIN".equalsIgnoreCase(u.getRole()) ||
                        (u.getRoles() != null && u.getRoles().stream()
                                .anyMatch(r -> "SUPER_ADMIN".equalsIgnoreCase(r.getName())))));

        if (superAdminExists) {
            log.warn("[SECURITY] Active SUPER_ADMIN account already exists in database. Refusing repeated bootstrap or silent overwrite.");
            auditLogRepository.save(AuditLog.builder()
                    .action("SUPERADMIN_BOOTSTRAP_REJECTED")
                    .entityName("User")
                    .performedBy("SYSTEM_BOOTSTRAP")
                    .outcome("DENIED")
                    .details("Active SUPER_ADMIN already exists. Re-bootstrap request denied.")
                    .build());
            return false;
        }

        // 2. Validate parameters
        if (bootstrapUsername == null || bootstrapUsername.trim().isBlank()) {
            throw new IllegalStateException("SuperAdmin bootstrap failed: Username cannot be blank.");
        }

        if (bootstrapPassword == null || !PASSWORD_COMPLEXITY_PATTERN.matcher(bootstrapPassword).matches()) {
            auditLogRepository.save(AuditLog.builder()
                    .action("SUPERADMIN_BOOTSTRAP_FAILED")
                    .entityName("User")
                    .performedBy("SYSTEM_BOOTSTRAP")
                    .outcome("FAILURE")
                    .details("Bootstrap password rejected: Does not meet complexity rules (minimum 12 chars, upper, lower, digit, symbol).")
                    .build());
            throw new IllegalStateException("SuperAdmin bootstrap failed: Password does not meet required complexity standards (minimum 12 chars, upper, lower, digit, symbol). Never log passwords.");
        }

        // 3. Resolve SUPER_ADMIN role
        Role superAdminRole = roleRepository.findByName("SUPER_ADMIN").orElse(null);
        Set<Role> roles = new HashSet<>();
        if (superAdminRole != null) {
            roles.add(superAdminRole);
        }

        // 4. Create and persist user (credentials are NEVER logged)
        User superAdmin = User.builder()
                .username(bootstrapUsername.trim())
                .password(passwordEncoder.encode(bootstrapPassword))
                .fullName(bootstrapFullName.trim())
                .email(bootstrapEmail.trim())
                .phone("+998 90 000 00 00")
                .role("ROLE_SUPER_ADMIN")
                .roles(roles)
                .enabled(true)
                .emailVerified(true)
                .build();

        userRepository.save(superAdmin);

        // 5. Persist audit trail
        auditLogRepository.save(AuditLog.builder()
                .action("SUPERADMIN_BOOTSTRAP_SUCCESS")
                .entityName("User")
                .entityId(superAdmin.getId() != null ? superAdmin.getId().toString() : bootstrapUsername)
                .performedBy("SYSTEM_BOOTSTRAP")
                .outcome("SUCCESS")
                .details("Initial SuperAdmin account provisioned securely via bootstrap service.")
                .build());

        log.info("[SECURITY] Initial SUPER_ADMIN account provisioned successfully. Set SUPER_ADMIN_BOOTSTRAP_ENABLED=false immediately.");
        return true;
    }

    public boolean isBootstrapEnabled() {
        return bootstrapEnabled;
    }
}
