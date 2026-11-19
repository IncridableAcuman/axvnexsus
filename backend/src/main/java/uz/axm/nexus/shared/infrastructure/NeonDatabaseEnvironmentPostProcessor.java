package uz.axm.nexus.shared.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Automatically configures Spring DataSource properties when NEON_URL, DATABASE_URL,
 * or standard postgresql:// connection strings are supplied in the environment.
 * Ensures compatibility with Neon Serverless Postgres (SSL, PgBouncer pooler prepareThreshold=0).
 */
@Slf4j
@SuppressWarnings("removal")
public class NeonDatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String PROPERTY_SOURCE_NAME = "neonDatabaseEnvironmentProperties";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String dbUrl = environment.getProperty("NEON_URL");
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = environment.getProperty("DATABASE_URL");
        }
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        }

        if (dbUrl == null || dbUrl.isBlank()) {
            return;
        }

        Map<String, Object> resolvedProps = parseDatabaseUrl(dbUrl);

        String neonUser = environment.getProperty("NEON_USER");
        if (neonUser != null && !neonUser.isBlank()) {
            resolvedProps.put("spring.datasource.username", neonUser.trim());
        }
        String neonPass = environment.getProperty("NEON_PASS");
        if (neonPass == null || neonPass.isBlank()) {
            neonPass = environment.getProperty("NEON_PASSWORD");
        }
        if (neonPass != null && !neonPass.isBlank()) {
            resolvedProps.put("spring.datasource.password", neonPass.trim());
        }

        if (!resolvedProps.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, resolvedProps));
        }
    }

    public static Map<String, Object> parseDatabaseUrl(String rawUrl) {
        Map<String, Object> props = new HashMap<>();
        if (rawUrl == null || rawUrl.isBlank()) {
            return props;
        }

        String cleaned = rawUrl.trim();

        // Handle postgres://, postgresql://, or jdbc:postgresql://
        boolean isJdbc = cleaned.startsWith("jdbc:");
        String withoutJdbc = isJdbc ? cleaned.substring(5) : cleaned;

        if (!withoutJdbc.startsWith("postgres://") && !withoutJdbc.startsWith("postgresql://")) {
            return props;
        }

        try {
            // Normalize scheme to standard for URI parsing
            String uriString = withoutJdbc;
            if (uriString.startsWith("postgres://")) {
                uriString = "postgresql://" + uriString.substring("postgres://".length());
            }

            URI uri = URI.create(uriString);

            String userInfo = uri.getUserInfo();
            String username = null;
            String password = null;
            if (userInfo != null && !userInfo.isBlank()) {
                String[] parts = userInfo.split(":", 2);
                username = parts[0];
                if (parts.length > 1) {
                    password = parts[1];
                }
            }

            String host = uri.getHost();
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath();
            if (path == null || path.isBlank() || path.equals("/")) {
                path = "/neondb";
            }
            String databaseName = path.startsWith("/") ? path.substring(1) : path;

            String query = uri.getQuery();
            Map<String, String> queryParams = new HashMap<>();
            if (query != null && !query.isBlank()) {
                for (String param : query.split("&")) {
                    String[] pair = param.split("=", 2);
                    if (pair.length == 2) {
                        queryParams.put(pair[0], pair[1]);
                    } else if (pair.length == 1) {
                        queryParams.put(pair[0], "");
                    }
                }
            }

            // Neon requires sslmode=require and prepareThreshold=0 for connection pooler
            queryParams.putIfAbsent("sslmode", "require");
            queryParams.putIfAbsent("prepareThreshold", "0");

            StringBuilder queryBuilder = new StringBuilder();
            for (Map.Entry<String, String> entry : queryParams.entrySet()) {
                if (!queryBuilder.isEmpty()) {
                    queryBuilder.append("&");
                }
                queryBuilder.append(entry.getKey()).append("=").append(entry.getValue());
            }

            String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s?%s",
                    host, port, databaseName, queryBuilder);

            props.put("spring.datasource.url", jdbcUrl);
            props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");

            if (username != null && !username.isBlank()) {
                props.put("spring.datasource.username", username);
            }
            if (password != null && !password.isBlank()) {
                props.put("spring.datasource.password", password);
            }

            log.info("[NeonDatabase] Neon/PostgreSQL JDBC URL avtomatik sozlandi: host={}, port={}, db={}, sslmode=require",
                    host, port, databaseName);

        } catch (Exception e) {
            log.warn("[NeonDatabase] Database URL ni tahlil qilishda xatolik yuz berdi: {}", e.getMessage());
        }

        return props;
    }
}
