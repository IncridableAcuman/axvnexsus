package uz.axm.nexus.resources.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@Slf4j
public class StorageConfig {

    @Bean
    @Primary
    public StorageProvider storageProvider(
            @Value("${app.storage.provider:auto}") String providerType,
            @Value("${app.storage.s3.endpoint:${AWS_ENDPOINT_URL_S3:}}") String s3Endpoint,
            @Value("${app.storage.s3.access-key:${AWS_ACCESS_KEY_ID:}}") String s3AccessKey,
            @Value("${app.storage.s3.secret-key:${AWS_SECRET_ACCESS_KEY:}}") String s3SecretKey,
            @Value("${app.storage.s3.region:${AWS_REGION:us-east-2}}") String s3Region,
            @Value("${app.storage.s3.bucket:${S3_BUCKET_NAME:${AWS_S3_BUCKET:assets}}}") String s3Bucket,
            LocalStorageProvider localStorageProvider
    ) {
        boolean isExplicitNeon = "neon".equalsIgnoreCase(providerType) || "s3".equalsIgnoreCase(providerType);
        boolean hasS3Credentials = s3Endpoint != null && !s3Endpoint.isBlank()
                && s3AccessKey != null && !s3AccessKey.isBlank();

        if (isExplicitNeon || ("auto".equalsIgnoreCase(providerType) && hasS3Credentials)) {
            log.info("[StorageConfig] Neon S3 Object Storage tanlandi (provider={}, endpoint={}, bucket={})",
                    providerType, s3Endpoint, s3Bucket);
            return new NeonS3StorageProvider(
                    s3Endpoint,
                    s3Bucket,
                    s3AccessKey,
                    s3SecretKey,
                    s3Region,
                    localStorageProvider
            );
        }

        log.info("[StorageConfig] Lokal disk xotirasi tanlandi (provider={})", providerType);
        return localStorageProvider;
    }
}
