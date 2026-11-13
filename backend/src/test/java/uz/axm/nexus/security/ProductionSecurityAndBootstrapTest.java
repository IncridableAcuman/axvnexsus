package uz.axm.nexus.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.audit.infrastructure.AuditLogRepository;
import uz.axm.nexus.identity.infrastructure.ProductionSecurityValidator;
import uz.axm.nexus.identity.infrastructure.SuperAdminBootstrapService;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.UserRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ProductionSecurityAndBootstrapTest {

    @Autowired
    private SuperAdminBootstrapService bootstrapService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    @DisplayName("SuperAdminBootstrapService: returns false when disabled")
    void shouldDoNothingWhenBootstrapIsDisabled() {
        ReflectionTestUtils.setField(bootstrapService, "bootstrapEnabled", false);
        boolean result = bootstrapService.bootstrapInitialSuperAdmin();
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("SuperAdminBootstrapService: rejects weak bootstrap passwords")
    void shouldRejectWeakPassword() {
        ReflectionTestUtils.setField(bootstrapService, "bootstrapEnabled", true);
        ReflectionTestUtils.setField(bootstrapService, "bootstrapUsername", "temp_admin");
        ReflectionTestUtils.setField(bootstrapService, "bootstrapPassword", "weak");

        assertThatThrownBy(() -> bootstrapService.bootstrapInitialSuperAdmin())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("complexity");
    }

    @Test
    @DisplayName("SuperAdminBootstrapService: refuses to overwrite when active SUPER_ADMIN exists")
    void shouldRefuseIfSuperAdminAlreadyExists() {
        // Ensure a superadmin exists
        if (userRepository.findByUsername("admin").isEmpty()) {
            userRepository.save(User.builder()
                    .username("admin")
                    .password("encoded_pass")
                    .email("admin@test.uz")
                    .role("ROLE_SUPER_ADMIN")
                    .enabled(true)
                    .build());
        }

        ReflectionTestUtils.setField(bootstrapService, "bootstrapEnabled", true);
        ReflectionTestUtils.setField(bootstrapService, "bootstrapUsername", "new_admin");
        ReflectionTestUtils.setField(bootstrapService, "bootstrapPassword", "SuperSecureP@ssw0rd!2026");

        boolean created = bootstrapService.bootstrapInitialSuperAdmin();
        assertThat(created).isFalse();

        boolean auditLogged = auditLogRepository.findAll().stream()
                .anyMatch(a -> "SUPERADMIN_BOOTSTRAP_REJECTED".equals(a.getAction()));
        assertThat(auditLogged).isTrue();
    }

    @Test
    @DisplayName("ProductionSecurityValidator: passes in non-prod environment")
    void shouldPassInNonProd() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("test");
        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "axm_nexus_test_secret_jwt_key_that_is_at_least_256_bits_long_1234567890");
        ReflectionTestUtils.setField(validator, "corsAllowedOrigins", "*");

        boolean result = validator.validateProductionSecurity();
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("ProductionSecurityValidator: detects weak JWT secret in prod profile")
    void shouldFailWhenJwtSecretIsDefaultInProd() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "axm_nexus_super_secret_jwt_key_that_is_at_least_256_bits_long_for_security_reasons_12345");
        ReflectionTestUtils.setField(validator, "corsAllowedOrigins", "https://yangiariq-aqua.onrender.com");
        ReflectionTestUtils.setField(validator, "actuatorExposure", "health,info");

        assertThatThrownBy(validator::validateProductionSecurity)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Default or placeholder JWT secret");
    }

    @Test
    @DisplayName("ProductionSecurityValidator: detects wildcard CORS in prod profile")
    void shouldFailWhenWildcardCorsInProd() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "c3VwZXItc2VjdXJlLXByb2R1Y3Rpb24tand0LXNpZ25pbmcta2V5LTIwMjYtYWZ0ZXItaGFyZGVuaW5nIQ==");
        ReflectionTestUtils.setField(validator, "corsAllowedOrigins", "*");
        ReflectionTestUtils.setField(validator, "actuatorExposure", "health,info");

        assertThatThrownBy(validator::validateProductionSecurity)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Wildcard CORS");
    }

    @Test
    @DisplayName("ProductionSecurityValidator: succeeds with compliant production configuration")
    void shouldPassWithCompliantProdConfig() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "c3VwZXItc2VjdXJlLXByb2R1Y3Rpb24tand0LXNpZ25pbmcta2V5LTIwMjYtYWZ0ZXItaGFyZGVuaW5nIQ==");
        ReflectionTestUtils.setField(validator, "corsAllowedOrigins", "https://yangiariq-aqua.onrender.com");
        ReflectionTestUtils.setField(validator, "actuatorExposure", "health,info");

        boolean result = validator.validateProductionSecurity();
        assertThat(result).isTrue();
    }
}
