package uz.axm.nexus.resources.infrastructure;

import lombok.extern.slf4j.Slf4j;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Standard AWS Signature Version 4 (SigV4) Signer implementation in pure Java 21.
 * Compliant with AWS S3 and S3-compatible storage engines (Neon Files / Neon Storage).
 */
@Slf4j
public class AwsSigV4Signer {

    private static final DateTimeFormatter ISO_FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);

    private static final String ALGORITHM = "AWS4-HMAC-SHA256";
    private static final String HMAC_SHA256 = "HmacSHA256";
    public static final String EMPTY_PAYLOAD_SHA256 =
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    private final String region;
    private final String service;
    private final String accessKey;
    private final String secretKey;

    public AwsSigV4Signer(String region, String service, String accessKey, String secretKey) {
        this.region = (region != null && !region.isBlank()) ? region : "us-east-2";
        this.service = (service != null && !service.isBlank()) ? service : "s3";
        this.accessKey = accessKey != null ? accessKey : "";
        this.secretKey = secretKey != null ? secretKey : "";
    }

    /**
     * Signs headers for S3 REST API call.
     */
    public Map<String, String> sign(
            String httpMethod,
            String canonicalUri,
            Map<String, String> queryParams,
            Map<String, String> headers,
            byte[] payload,
            Instant requestTime
    ) {
        String amzDate = ISO_FORMATTER.format(requestTime);
        String dateStamp = DATE_FORMATTER.format(requestTime);
        String payloadHash = (payload == null || payload.length == 0)
                ? EMPTY_PAYLOAD_SHA256
                : sha256Hex(payload);

        Map<String, String> updatedHeaders = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        if (headers != null) {
            updatedHeaders.putAll(headers);
        }
        updatedHeaders.put("x-amz-date", amzDate);
        updatedHeaders.put("x-amz-content-sha256", payloadHash);

        // Build canonical headers and signed headers list
        Map<String, String> canonicalHeaderMap = new TreeMap<>();
        for (Map.Entry<String, String> entry : updatedHeaders.entrySet()) {
            canonicalHeaderMap.put(entry.getKey().toLowerCase(Locale.ROOT), entry.getValue().trim());
        }

        StringBuilder canonicalHeaders = new StringBuilder();
        StringBuilder signedHeaders = new StringBuilder();
        for (Map.Entry<String, String> entry : canonicalHeaderMap.entrySet()) {
            canonicalHeaders.append(entry.getKey()).append(":").append(entry.getValue()).append("\n");
            if (!signedHeaders.isEmpty()) {
                signedHeaders.append(";");
            }
            signedHeaders.append(entry.getKey());
        }

        String canonicalQueryString = buildCanonicalQueryString(queryParams);

        String canonicalRequest = httpMethod.toUpperCase(Locale.ROOT) + "\n"
                + canonicalUri + "\n"
                + canonicalQueryString + "\n"
                + canonicalHeaders + "\n"
                + signedHeaders + "\n"
                + payloadHash;

        String credentialScope = dateStamp + "/" + region + "/" + service + "/aws4_request";
        String stringToSign = ALGORITHM + "\n"
                + amzDate + "\n"
                + credentialScope + "\n"
                + sha256Hex(canonicalRequest.getBytes(StandardCharsets.UTF_8));

        byte[] signingKey = deriveSigningKey(secretKey, dateStamp, region, service);
        String signature = HexFormat.of().formatHex(hmacSha256(signingKey, stringToSign.getBytes(StandardCharsets.UTF_8)));

        String authorization = ALGORITHM
                + " Credential=" + accessKey + "/" + credentialScope
                + ", SignedHeaders=" + signedHeaders
                + ", Signature=" + signature;

        updatedHeaders.put("Authorization", authorization);
        return updatedHeaders;
    }

    /**
     * Generates an AWS SigV4 Presigned GET URL.
     */
    public String generatePresignedUrl(
            String endpointUrl,
            String bucket,
            String key,
            int expirationSeconds,
            Instant requestTime
    ) {
        try {
            URI baseUri = URI.create(endpointUrl);
            String host = baseUri.getHost();
            if (baseUri.getPort() > 0 && baseUri.getPort() != 80 && baseUri.getPort() != 443) {
                host = host + ":" + baseUri.getPort();
            }

            String amzDate = ISO_FORMATTER.format(requestTime);
            String dateStamp = DATE_FORMATTER.format(requestTime);
            String credentialScope = dateStamp + "/" + region + "/" + service + "/aws4_request";

            String cleanKey = key.startsWith("/") ? key.substring(1) : key;
            String canonicalUri = "/" + bucket + "/" + cleanKey;

            Map<String, String> queryParams = new TreeMap<>();
            queryParams.put("X-Amz-Algorithm", ALGORITHM);
            queryParams.put("X-Amz-Credential", accessKey + "/" + credentialScope);
            queryParams.put("X-Amz-Date", amzDate);
            queryParams.put("X-Amz-Expires", String.valueOf(expirationSeconds));
            queryParams.put("X-Amz-SignedHeaders", "host");

            String canonicalQueryString = buildCanonicalQueryString(queryParams);

            String canonicalHeaders = "host:" + host.trim() + "\n";
            String signedHeaders = "host";

            String canonicalRequest = "GET\n"
                    + canonicalUri + "\n"
                    + canonicalQueryString + "\n"
                    + canonicalHeaders + "\n"
                    + signedHeaders + "\n"
                    + "UNSIGNED-PAYLOAD";

            String stringToSign = ALGORITHM + "\n"
                    + amzDate + "\n"
                    + credentialScope + "\n"
                    + sha256Hex(canonicalRequest.getBytes(StandardCharsets.UTF_8));

            byte[] signingKey = deriveSigningKey(secretKey, dateStamp, region, service);
            String signature = HexFormat.of().formatHex(hmacSha256(signingKey, stringToSign.getBytes(StandardCharsets.UTF_8)));

            String cleanEndpoint = endpointUrl.endsWith("/") ? endpointUrl.substring(0, endpointUrl.length() - 1) : endpointUrl;
            return cleanEndpoint + canonicalUri + "?" + canonicalQueryString + "&X-Amz-Signature=" + signature;

        } catch (Exception e) {
            log.error("[AwsSigV4] Presigned URL yaratishda xatolik: {}", e.getMessage());
            throw new RuntimeException("Presigned URL yaratib bo'lmadi: " + e.getMessage(), e);
        }
    }

    public static String buildCanonicalQueryString(Map<String, String> queryParams) {
        if (queryParams == null || queryParams.isEmpty()) {
            return "";
        }
        Map<String, String> sorted = new TreeMap<>(queryParams);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : sorted.entrySet()) {
            if (!sb.isEmpty()) {
                sb.append("&");
            }
            sb.append(urlEncode(entry.getKey()))
                    .append("=")
                    .append(urlEncode(entry.getValue()));
        }
        return sb.toString();
    }

    public static String urlEncode(String value) {
        if (value == null) return "";
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20")
                .replace("*", "%2A")
                .replace("%7E", "~");
    }

    public static byte[] deriveSigningKey(String key, String dateStamp, String region, String service) {
        byte[] kSecret = ("AWS4" + key).getBytes(StandardCharsets.UTF_8);
        byte[] kDate = hmacSha256(kSecret, dateStamp.getBytes(StandardCharsets.UTF_8));
        byte[] kRegion = hmacSha256(kDate, region.getBytes(StandardCharsets.UTF_8));
        byte[] kService = hmacSha256(kRegion, service.getBytes(StandardCharsets.UTF_8));
        return hmacSha256(kService, "aws4_request".getBytes(StandardCharsets.UTF_8));
    }

    public static byte[] hmacSha256(byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(key, HMAC_SHA256));
            return mac.doFinal(data);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 hisoblashda xatolik: " + e.getMessage(), e);
        }
    }

    public static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 hisoblashda xatolik: " + e.getMessage(), e);
        }
    }
}
