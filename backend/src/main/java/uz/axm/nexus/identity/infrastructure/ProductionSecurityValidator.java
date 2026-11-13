package uz.axm.nexus.identity.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * ProductionSecurityValidator
 *
 * Validates baseline production security requirements on application startup when the "prod" profile is active.
 * Guarantees zero-tolerance for weak secrets, insecure CORS wildcards, and excessive Actuator exposures.
 */
@Component
@Slf4j
public class ProductionSecurityValidator implements CommandLineRunner {

    private final Environment environment;

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @Value("${app.cors.allowed-origins:*}")
    private String corsAllowedOrigins;

    @Value("${management.endpoints.web.exposure.include:health,info}")
    private String actuatorExposure;

    @Value("${app.security.superadmin-bootstrap.enabled:false}")
    private boolean bootstrapEnabled;

    public ProductionSecurityValidator(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(String... args) {
        validateProductionSecurity();
    }

    public boolean validateProductionSecurity() {
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (!isProd) {
            log.info("[PRODUCTION_SECURITY] Non-production profile active. Skipping strict cloud security validation.");
            return true;
        }

        log.info("[PRODUCTION_SECURITY] Validating production security configuration against cloud security baseline...");

        // 1. JWT Secret strength and placeholder check
        if (jwtSecret == null || jwtSecret.trim().length() < 32) {
            throw new IllegalStateException("CRITICAL PRODUCTION SECURITY ERROR: JWT Secret must be at least 32 characters (256-bit) in production.");
        }
        if (jwtSecret.contains("super_secret_jwt_key") || jwtSecret.contains("generate_a_random")) {
            throw new IllegalStateException("CRITICAL PRODUCTION SECURITY ERROR: Default or placeholder JWT secret cannot be used in production.");
        }

        // 2. CORS Allowed Origins check (disallow wildcard '*' in production)
        if ("*".equals(corsAllowedOrigins.trim())) {
            throw new IllegalStateException("CRITICAL PRODUCTION SECURITY ERROR: Wildcard CORS allowed-origins '*' is strictly prohibited in production with credentials.");
        }

        // 3. Actuator endpoint exposure check
        List<String> exposedEndpoints = Arrays.stream(actuatorExposure.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .toList();

        if (exposedEndpoints.contains("*") || exposedEndpoints.contains("env") ||
                exposedEndpoints.contains("beans") || exposedEndpoints.contains("heapdump") ||
                exposedEndpoints.contains("configprops")) {
            throw new IllegalStateException("CRITICAL PRODUCTION SECURITY ERROR: Insecure Actuator endpoint exposure detected in production: " + actuatorExposure);
        }

        // 4. SuperAdmin Bootstrap status advisory
        if (bootstrapEnabled) {
            log.warn("[PRODUCTION_SECURITY_WARNING] SUPER_ADMIN_BOOTSTRAP_ENABLED is set to TRUE in production. Disable it immediately after provisioning.");
        }

        log.info("[PRODUCTION_SECURITY] Production security validation PASSED successfully. All checks verified.");
        return true;
    }
}
