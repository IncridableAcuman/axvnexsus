package uz.axm.nexus.resources.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import uz.axm.nexus.resources.application.LearningResourceService;
import uz.axm.nexus.resources.domain.LearningResource;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@Tag(name = "Learning Resources", description = "Modul 09: O'quv materiallari, resurslar kutubxonasi va fayllar boshqaruvi")
public class ResourceController {

    private final LearningResourceService resourceService;

    @GetMapping
    @PreAuthorize("hasAuthority('materials.read') or isAuthenticated()")
    @Operation(summary = "Resurslar kutubxonasidan qidirish va filtrlash")
    public ResponseEntity<List<LearningResource>> searchResources(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String gradeLevel,
            @RequestParam(required = false) String type
    ) {
        return ResponseEntity.ok(resourceService.searchResources(query, subject, gradeLevel, type));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('materials.read') or isAuthenticated()")
    @Operation(summary = "Resurs ma'lumotlarini ID bo'yicha olish")
    public ResponseEntity<LearningResource> getResourceById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getById(id));
    }

    @GetMapping("/by-lesson/{lessonId}")
    @PreAuthorize("hasAuthority('materials.read') or isAuthenticated()")
    @Operation(summary = "Darsga biriktirilgan resurslarni olish")
    public ResponseEntity<List<LearningResource>> getByLessonId(@PathVariable Long lessonId) {
        return ResponseEntity.ok(resourceService.getByLessonId(lessonId));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Fayl yuklash (PDF, Prezentatsiya, Kod, Rasm, Video)")
    public ResponseEntity<LearningResource> uploadResource(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "resourceType", required = false) String resourceType,
            @RequestParam(value = "subject", required = false) String subject,
            @RequestParam(value = "gradeLevel", required = false) String gradeLevel,
            @RequestParam(value = "topic", required = false) String topic,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "lessonId", required = false) Long lessonId,
            @RequestParam(value = "mentorId", required = false) Long mentorId
    ) throws IOException {
        LearningResource saved = resourceService.uploadFileResource(
                file, title, description, resourceType, subject, gradeLevel, topic, tags, lessonId, mentorId
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/link")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Tashqi havola yoki YouTube video resursini qo'shish")
    public ResponseEntity<LearningResource> createLinkResource(@RequestBody Map<String, Object> payload) {
        String title = (String) payload.get("title");
        String description = (String) payload.get("description");
        String externalUrl = (String) payload.get("externalUrl");
        String resourceType = (String) payload.get("resourceType");
        String subject = (String) payload.get("subject");
        String gradeLevel = (String) payload.get("gradeLevel");
        String topic = (String) payload.get("topic");
        String tags = (String) payload.get("tags");
        Long lessonId = payload.containsKey("lessonId") && payload.get("lessonId") != null ? ((Number) payload.get("lessonId")).longValue() : null;
        Long mentorId = payload.containsKey("mentorId") && payload.get("mentorId") != null ? ((Number) payload.get("mentorId")).longValue() : null;

        LearningResource saved = resourceService.createExternalLinkResource(
                title, description, externalUrl, resourceType, subject, gradeLevel, topic, tags, lessonId, mentorId
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAuthority('materials.read') or isAuthenticated()")
    @Operation(summary = "Faylni xavfsiz yuklab olish")
    public ResponseEntity<Resource> downloadResource(@PathVariable Long id) {
        LearningResource entity = resourceService.getById(id);
        Resource fileResource = resourceService.loadResourceForDownload(id);

        String filename = entity.getFileName() != null ? entity.getFileName() : "resource_" + id;
        String contentType = entity.getMimeType() != null ? entity.getMimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(fileResource);
    }

    @GetMapping("/{id}/preview")
    @PreAuthorize("hasAuthority('materials.read') or isAuthenticated()")
    @Operation(summary = "Faylni brauzerda to'g'ridan-to'g'ri ko'rish (Preview)")
    public ResponseEntity<Resource> previewResource(@PathVariable Long id) {
        LearningResource entity = resourceService.getById(id);
        Resource fileResource = resourceService.loadResourceForDownload(id);

        String contentType = entity.getMimeType() != null ? entity.getMimeType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + entity.getFileName() + "\"")
                .body(fileResource);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')")
    @Operation(summary = "Resursni o'chirish")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}
