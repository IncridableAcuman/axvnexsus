package uz.axm.nexus.resources.infrastructure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Neon S3-compatible Object Storage Provider.
 * Connects directly to Neon Files / Neon S3 endpoints using AWS SigV4.
 * Falls back to LocalStorageProvider if configured or in case of temporary offline state.
 */
@Slf4j
public class NeonS3StorageProvider implements StorageProvider {

    private final String endpoint;
    private final String bucket;
    private final String accessKey;
    private final String secretKey;
    private final String region;
    private final LocalStorageProvider fallbackProvider;
    private final AwsSigV4Signer signer;
    private final HttpClient httpClient;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "pptx", "ppt", "png", "jpg", "jpeg", "svg", "webp",
            "mp4", "webm", "zip", "rar", "tar", "gz", "java", "py",
            "js", "ts", "html", "css", "json", "md", "txt", "docx", "xlsx"
    );

    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "sh", "bash", "jsp", "jspx", "php",
            "phtml", "war", "ear", "jar", "dll", "so", "vbs", "scr", "com"
    );

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    public NeonS3StorageProvider(
            String endpoint,
            String bucket,
            String accessKey,
            String secretKey,
            String region,
            LocalStorageProvider fallbackProvider
    ) {
        this.endpoint = (endpoint != null && !endpoint.isBlank())
                ? (endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length() - 1) : endpoint)
                : "https://br-dark-math-beyvvxd8.storage.c-9.us-east-2.aws.neon.tech";
        this.bucket = (bucket != null && !bucket.isBlank()) ? bucket : "assets";
        this.accessKey = accessKey != null ? accessKey : "";
        this.secretKey = secretKey != null ? secretKey : "";
        this.region = (region != null && !region.isBlank()) ? region : "us-east-2";
        this.fallbackProvider = fallbackProvider;

        this.signer = new AwsSigV4Signer(this.region, "s3", this.accessKey, this.secretKey);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();

        log.info("[NeonS3Storage] Neon Object Storage faollashtirildi: endpoint={}, bucket={}, region={}",
                this.endpoint, this.bucket, this.region);
    }

    @Override
    public String store(InputStream inputStream, String originalFilename, String mimeType, long size) {
        if (size > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Fayl hajmi 50MB dan oshmasligi kerak!");
        }

        String extension = getFileExtension(originalFilename);
        if (DANGEROUS_EXTENSIONS.contains(extension)) {
            throw new SecurityException("Xavfli fayl kengaytmasi yuklash taqiqlangan: " + extension);
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Ruxsat berilmagan fayl formati: " + extension);
        }

        String safeKey = UUID.randomUUID() + "." + extension;
        String contentType = (mimeType != null && !mimeType.isBlank()) ? mimeType : "application/octet-stream";

        byte[] payload;
        try {
            payload = inputStream.readAllBytes();
        } catch (IOException e) {
            throw new RuntimeException("Fayl baytlarini o'qishda xatolik: " + e.getMessage(), e);
        }

        try {
            uploadToS3(safeKey, payload, contentType);
            log.info("[NeonS3Storage] Fayl Neon Storage ga muvaffaqiyatli saqlandi: Key={}, Original={}, Size={}",
                    safeKey, originalFilename, payload.length);
            return safeKey;
        } catch (Exception e) {
            log.error("[NeonS3Storage] Neon S3 ga yuklashda xatolik: {}. Zaxira (fallback) tekshirilmoqda...", e.getMessage());
            if (fallbackProvider != null) {
                log.warn("[NeonS3Storage] Zaxira lokal xotiraga yozilmoqda...");
                return fallbackProvider.store(new java.io.ByteArrayInputStream(payload), originalFilename, mimeType, size);
            }
            throw new RuntimeException("Neon S3 ga faylni saqlab bo'lmadi: " + e.getMessage(), e);
        }
    }

    @Override
    public Resource loadAsResource(String storageKey) {
        if (storageKey == null || storageKey.isBlank() || storageKey.contains("..") || storageKey.contains("/") || storageKey.contains("\\")) {
            throw new SecurityException("Noto'g'ri yoki xavfli storage key: " + storageKey);
        }

        try {
            byte[] data = downloadFromS3(storageKey);
            return new ByteArrayResource(data) {
                @Override
                public String getFilename() {
                    return storageKey;
                }
            };
        } catch (Exception e) {
            log.warn("[NeonS3Storage] Neon S3 dan yuklab bo'lmadi [key={}]: {}. Fallback tekshirilmoqda...", storageKey, e.getMessage());
            if (fallbackProvider != null) {
                return fallbackProvider.loadAsResource(storageKey);
            }
            throw new IllegalArgumentException("Resurs topilmadi: " + storageKey, e);
        }
    }

    @Override
    public void delete(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) return;

        try {
            deleteFromS3(storageKey);
            log.info("[NeonS3Storage] Fayl Neon S3 dan o'chirildi: {}", storageKey);
        } catch (Exception e) {
            log.warn("[NeonS3Storage] Neon S3 dan o'chirishda xatolik: {}", e.getMessage());
        }

        if (fallbackProvider != null) {
            try {
                fallbackProvider.delete(storageKey);
            } catch (Exception ignored) {
            }
        }
    }

    /**
     * Generates a signed view/download URL valid for the specified duration.
     */
    public String generatePresignedUrl(String storageKey, int expirationSeconds) {
        return signer.generatePresignedUrl(endpoint, bucket, storageKey, expirationSeconds, Instant.now());
    }

    private void uploadToS3(String key, byte[] payload, String contentType) throws Exception {
        URI baseUri = URI.create(endpoint);
        String host = baseUri.getHost();
        if (baseUri.getPort() > 0 && baseUri.getPort() != 80 && baseUri.getPort() != 443) {
            host = host + ":" + baseUri.getPort();
        }

        String canonicalUri = "/" + bucket + "/" + key;
        String fullUrl = endpoint + canonicalUri;

        Map<String, String> headers = new HashMap<>();
        headers.put("Host", host);
        headers.put("Content-Type", contentType);
        headers.put("Content-Length", String.valueOf(payload.length));

        Map<String, String> signedHeaders = signer.sign(
                "PUT",
                canonicalUri,
                Collections.emptyMap(),
                headers,
                payload,
                Instant.now()
        );

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(fullUrl))
                .PUT(HttpRequest.BodyPublishers.ofByteArray(payload))
                .timeout(Duration.ofSeconds(30));

        for (Map.Entry<String, String> entry : signedHeaders.entrySet()) {
            requestBuilder.header(entry.getKey(), entry.getValue());
        }

        HttpResponse<String> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Neon S3 HTTP " + response.statusCode() + " javob berdi: " + response.body());
        }
    }

    private byte[] downloadFromS3(String key) throws Exception {
        URI baseUri = URI.create(endpoint);
        String host = baseUri.getHost();
        if (baseUri.getPort() > 0 && baseUri.getPort() != 80 && baseUri.getPort() != 443) {
            host = host + ":" + baseUri.getPort();
        }

        String canonicalUri = "/" + bucket + "/" + key;
        String fullUrl = endpoint + canonicalUri;

        Map<String, String> headers = new HashMap<>();
        headers.put("Host", host);

        Map<String, String> signedHeaders = signer.sign(
                "GET",
                canonicalUri,
                Collections.emptyMap(),
                headers,
                new byte[0],
                Instant.now()
        );

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(fullUrl))
                .GET()
                .timeout(Duration.ofSeconds(30));

        for (Map.Entry<String, String> entry : signedHeaders.entrySet()) {
            requestBuilder.header(entry.getKey(), entry.getValue());
        }

        HttpResponse<byte[]> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() == 404) {
            throw new IllegalArgumentException("Fayl Neon S3 da topilmadi: " + key);
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Neon S3 dan yuklashda xatolik: HTTP " + response.statusCode());
        }

        return response.body();
    }

    private void deleteFromS3(String key) throws Exception {
        URI baseUri = URI.create(endpoint);
        String host = baseUri.getHost();
        if (baseUri.getPort() > 0 && baseUri.getPort() != 80 && baseUri.getPort() != 443) {
            host = host + ":" + baseUri.getPort();
        }

        String canonicalUri = "/" + bucket + "/" + key;
        String fullUrl = endpoint + canonicalUri;

        Map<String, String> headers = new HashMap<>();
        headers.put("Host", host);

        Map<String, String> signedHeaders = signer.sign(
                "DELETE",
                canonicalUri,
                Collections.emptyMap(),
                headers,
                new byte[0],
                Instant.now()
        );

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(fullUrl))
                .DELETE()
                .timeout(Duration.ofSeconds(15));

        for (Map.Entry<String, String> entry : signedHeaders.entrySet()) {
            requestBuilder.header(entry.getKey(), entry.getValue());
        }

        HttpResponse<Void> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.discarding());
        if (response.statusCode() >= 400 && response.statusCode() != 404) {
            throw new RuntimeException("Neon S3 dan o'chirishda xatolik: HTTP " + response.statusCode());
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase(Locale.ROOT);
    }
}
