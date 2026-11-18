package uz.axm.nexus.shared.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class NeonDatabaseEnvironmentPostProcessorTest {

    @Test
    @DisplayName("Neon URL connection string to'g'ri JDBC parametrlariga aylantirilishi kerak")
    void shouldParseNeonDatabaseUrlCorrectly() {
        String neonUrl = "postgresql://neondb_owner:npg_jsnEFky5RY2a@ep-hidden-pine-benajq9a-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

        Map<String, Object> props = NeonDatabaseEnvironmentPostProcessor.parseDatabaseUrl(neonUrl);

        assertThat(props).isNotEmpty();
        assertThat(props.get("spring.datasource.username")).isEqualTo("neondb_owner");
        assertThat(props.get("spring.datasource.password")).isEqualTo("npg_jsnEFky5RY2a");

        String jdbcUrl = (String) props.get("spring.datasource.url");
        assertThat(jdbcUrl).startsWith("jdbc:postgresql://ep-hidden-pine-benajq9a-pooler.c-9.us-east-2.aws.neon.tech:5432/neondb?");
        assertThat(jdbcUrl).contains("sslmode=require");
        assertThat(jdbcUrl).contains("prepareThreshold=0");
    }

    @Test
    @DisplayName("StandardEnvironment orqali NEON_URL o'qilganda property source qo'shilishi kerak")
    void shouldPostProcessEnvironmentWithNeonUrl() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("testEnv", Map.of(
                "NEON_URL", "postgresql://admin:secret123@ep-test.neon.tech:5432/mydb"
        )));

        NeonDatabaseEnvironmentPostProcessor processor = new NeonDatabaseEnvironmentPostProcessor();
        processor.postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("admin");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("secret123");
        assertThat(environment.getProperty("spring.datasource.url"))
                .startsWith("jdbc:postgresql://ep-test.neon.tech:5432/mydb?");
    }

    @Test
    @DisplayName("Bo'sh yoki noto'g'ri URL kelganda xatolik chiqarmasdan bo'sh qaytarishi kerak")
    void shouldHandleEmptyOrInvalidUrlGracefully() {
        Map<String, Object> props = NeonDatabaseEnvironmentPostProcessor.parseDatabaseUrl("");
        assertThat(props).isEmpty();

        props = NeonDatabaseEnvironmentPostProcessor.parseDatabaseUrl(null);
        assertThat(props).isEmpty();

        props = NeonDatabaseEnvironmentPostProcessor.parseDatabaseUrl("not-a-db-url");
        assertThat(props).isEmpty();
    }
}
