package uz.axm.nexus.resources.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AwsSigV4SignerTest {

    private final AwsSigV4Signer signer = new AwsSigV4Signer(
            "us-east-2",
            "s3",
            "nak_live_a830d72ca13646aaae231f0a1c17d35e",
            "nsk_live_1f92bc1985936e64ba5131a79c12fa1e07ef821f54f8ab9f7d1c1cc1825e7bfc"
    );

    @Test
    @DisplayName("S3 PUT so'rovi uchun Authorization sarlavhasi to'g'ri shakllantirilishi kerak")
    void shouldGenerateValidPutAuthorizationHeader() {
        byte[] payload = "Hello World!".getBytes(StandardCharsets.UTF_8);
        Instant fixedTime = Instant.parse("2026-11-18T12:00:00Z");

        Map<String, String> headers = new HashMap<>();
        headers.put("Host", "br-dark-math-beyvvxd8.storage.c-9.us-east-2.aws.neon.tech");
        headers.put("Content-Type", "text/plain");

        Map<String, String> signedHeaders = signer.sign(
                "PUT",
                "/assets/uploads/file.txt",
                Collections.emptyMap(),
                headers,
                payload,
                fixedTime
        );

        assertThat(signedHeaders).containsKey("Authorization");
        assertThat(signedHeaders).containsKey("x-amz-date");
        assertThat(signedHeaders).containsKey("x-amz-content-sha256");

        String auth = signedHeaders.get("Authorization");
        assertThat(auth).startsWith("AWS4-HMAC-SHA256 Credential=nak_live_a830d72ca13646aaae231f0a1c17d35e/20261118/us-east-2/s3/aws4_request");
        assertThat(auth).contains("SignedHeaders=");
        assertThat(auth).contains("Signature=");
        assertThat(signedHeaders.get("x-amz-date")).isEqualTo("20261118T120000Z");
    }

    @Test
    @DisplayName("S3 GET uchun Presigned URL muvaffaqiyatli generatsiya qilinishi kerak")
    void shouldGeneratePresignedGetUrl() {
        Instant fixedTime = Instant.parse("2026-11-18T12:00:00Z");
        String presignedUrl = signer.generatePresignedUrl(
                "https://br-dark-math-beyvvxd8.storage.c-9.us-east-2.aws.neon.tech",
                "assets",
                "uploads/file.txt",
                3600,
                fixedTime
        );

        assertThat(presignedUrl).isNotNull();
        assertThat(presignedUrl).startsWith("https://br-dark-math-beyvvxd8.storage.c-9.us-east-2.aws.neon.tech/assets/uploads/file.txt?");
        assertThat(presignedUrl).contains("X-Amz-Algorithm=AWS4-HMAC-SHA256");
        assertThat(presignedUrl).contains("X-Amz-Credential=nak_live_a830d72ca13646aaae231f0a1c17d35e");
        assertThat(presignedUrl).contains("X-Amz-Date=20261118T120000Z");
        assertThat(presignedUrl).contains("X-Amz-Expires=3600");
        assertThat(presignedUrl).contains("X-Amz-Signature=");
    }

    @Test
    @DisplayName("SHA-256 va HMAC-SHA256 hisoblash to'g'ri ishlashi kerak")
    void shouldCalculateSha256AndHmacCorrectly() {
        byte[] empty = new byte[0];
        String emptyHash = AwsSigV4Signer.sha256Hex(empty);
        assertThat(emptyHash).isEqualTo(AwsSigV4Signer.EMPTY_PAYLOAD_SHA256);

        byte[] key = "secret".getBytes(StandardCharsets.UTF_8);
        byte[] data = "data".getBytes(StandardCharsets.UTF_8);
        byte[] hmac = AwsSigV4Signer.hmacSha256(key, data);
        assertThat(hmac).isNotEmpty();
    }
}
