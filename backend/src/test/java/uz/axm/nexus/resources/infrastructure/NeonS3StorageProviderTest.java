package uz.axm.nexus.resources.infrastructure;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NeonS3StorageProviderTest {

    private LocalStorageProvider mockFallbackProvider;
    private NeonS3StorageProvider storageProvider;

    @BeforeEach
    void setUp() {
        mockFallbackProvider = Mockito.mock(LocalStorageProvider.class);
        storageProvider = new NeonS3StorageProvider(
                "https://br-dark-math-beyvvxd8.storage.c-9.us-east-2.aws.neon.tech",
                "assets",
                "AKIAIOSFODNN7EXAMPLE",
                "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
                "us-east-2",
                mockFallbackProvider
        );
    }

    @Test
    @DisplayName("50MB dan katta fayllar xatolik bilan rad etilishi kerak")
    void shouldRejectFileExceedingMaxSize() {
        InputStream is = new ByteArrayInputStream("data".getBytes());
        long tooBig = 51L * 1024 * 1024;

        assertThatThrownBy(() -> storageProvider.store(is, "large.pdf", "application/pdf", tooBig))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("50MB");
    }

    @Test
    @DisplayName("Xavfli fayl kengaytmalari (.sh, .exe, .php) xavfsizlik sababli rad etilishi kerak")
    void shouldRejectDangerousExtensions() {
        InputStream is = new ByteArrayInputStream("code".getBytes());

        assertThatThrownBy(() -> storageProvider.store(is, "hack.sh", "text/plain", 4))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Xavfli fayl");

        assertThatThrownBy(() -> storageProvider.store(is, "shell.php", "text/plain", 4))
                .isInstanceOf(SecurityException.class);
    }

    @Test
    @DisplayName("Ruxsat berilmagan fayl kengaytmasi rad etilishi kerak")
    void shouldRejectDisallowedExtension() {
        InputStream is = new ByteArrayInputStream("unknown".getBytes());

        assertThatThrownBy(() -> storageProvider.store(is, "file.xyz", "application/octet-stream", 7))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ruxsat berilmagan");
    }

    @Test
    @DisplayName("S3 ga ulanish imkoni bo'lmaganda fallback provayder chaqirilishi kerak")
    void shouldFallbackToLocalStorageOnFailure() {
        InputStream is = new ByteArrayInputStream("PDF content".getBytes());
        when(mockFallbackProvider.store(any(), anyString(), anyString(), anyLong()))
                .thenReturn("fallback-uuid.pdf");

        // When storing with invalid/unreachable network or mock, fallback will be used
        String key = storageProvider.store(is, "lecture.pdf", "application/pdf", 11);

        assertThat(key).isNotNull();
        verify(mockFallbackProvider).store(any(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Presigned URL to'g'ri shakllanishi kerak")
    void shouldGeneratePresignedUrl() {
        String url = storageProvider.generatePresignedUrl("test-uuid.pdf", 1800);
        assertThat(url).contains("https://br-dark-math-beyvvxd8.storage.c-9.us-east-2.aws.neon.tech/assets/test-uuid.pdf?");
        assertThat(url).contains("X-Amz-Signature=");
    }
}
