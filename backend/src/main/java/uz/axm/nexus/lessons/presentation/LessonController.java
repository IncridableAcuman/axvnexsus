package uz.axm.nexus.lessons.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.lessons.application.LessonService;
import uz.axm.nexus.lessons.domain.Lesson;
import uz.axm.nexus.lessons.domain.LessonRevision;
import uz.axm.nexus.lessons.domain.StudentLessonProgress;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lesson-plans")
@RequiredArgsConstructor
@Tag(name = "Lesson Planning & Delivery", description = "Modul 08: Darslarni rejalashtirish, o'tkazish va nazorat qilish")
public class LessonController {

    private final LessonService lessonService;

    @GetMapping
    @PreAuthorize("hasAuthority('lessons.read') or isAuthenticated()")
    @Operation(summary = "Barcha darslar ro'yxatini olish")
    public ResponseEntity<List<Lesson>> getAllLessons(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) Long mentorId
    ) {
        if (groupId != null) {
            return ResponseEntity.ok(lessonService.getLessonsByGroup(groupId));
        }
        if (mentorId != null) {
            return ResponseEntity.ok(lessonService.getLessonsByMentor(mentorId));
        }
        return ResponseEntity.ok(lessonService.getAllLessons());
    }

    @GetMapping("/templates")
    @PreAuthorize("hasAuthority('lessons.read') or isAuthenticated()")
    @Operation(summary = "Qayta ishlatiladigan dars andozalarini olish")
    public ResponseEntity<List<Lesson>> getTemplates() {
        return ResponseEntity.ok(lessonService.getTemplates());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('lessons.read') or isAuthenticated()")
    @Operation(summary = "Dars tafsilotlarini ID orqali olish")
    public ResponseEntity<Lesson> getLessonById(@PathVariable Long id) {
        return ResponseEntity.ok(lessonService.getLessonById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Yangi dars rejasi yaratish (Qoralama)")
    public ResponseEntity<Lesson> createLesson(@RequestBody Lesson lesson) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lessonService.createLesson(lesson));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Dars rejasini tahrirlash")
    public ResponseEntity<Lesson> updateLesson(
            @PathVariable Long id,
            @RequestBody Lesson lesson,
            @RequestParam(required = false) String changedBy,
            @RequestParam(required = false) String summary
    ) {
        return ResponseEntity.ok(lessonService.updateLesson(id, lesson, changedBy, summary));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Dars statusini o'zgartirish (DRAFT -> REVIEW -> PUBLISHED -> COMPLETED)")
    public ResponseEntity<Lesson> transitionStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String targetStatus = payload.get("status");
        String reason = payload.get("reason");
        return ResponseEntity.ok(lessonService.transitionStatus(id, targetStatus, reason));
    }

    @PatchMapping("/{id}/presentation")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Dars ma'ruza taqdimoti (slaydlar) matnini yangilash")
    public ResponseEntity<Lesson> updatePresentation(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String slides = payload.get("presentationSlides");
        return ResponseEntity.ok(lessonService.updatePresentationSlides(id, slides));
    }

    @PostMapping("/{id}/clone")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Dars rejasini boshqa guruh yoki yangi mavzuga nusxalash")
    public ResponseEntity<Lesson> cloneLesson(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        Long targetGroupId = payload != null && payload.containsKey("groupId") ? ((Number) payload.get("groupId")).longValue() : null;
        Long targetMentorId = payload != null && payload.containsKey("mentorId") ? ((Number) payload.get("mentorId")).longValue() : null;
        String newTitle = payload != null ? (String) payload.get("title") : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(lessonService.cloneLesson(id, targetGroupId, targetMentorId, newTitle));
    }

    @GetMapping("/{id}/revisions")
    @PreAuthorize("hasAuthority('lessons.read') or isAuthenticated()")
    @Operation(summary = "Darsning tahrirlashlar tarixi (Reviziyalar)")
    public ResponseEntity<List<LessonRevision>> getRevisions(@PathVariable Long id) {
        return ResponseEntity.ok(lessonService.getLessonRevisions(id));
    }

    @GetMapping("/{id}/progress")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Dars bo'yicha o'quvchilar natijalari va o'zlashtirishi")
    public ResponseEntity<List<StudentLessonProgress>> getProgress(@PathVariable Long id) {
        return ResponseEntity.ok(lessonService.getLessonProgress(id));
    }

    @PostMapping("/{id}/progress")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "O'quvchining darsdagi amaliy natijasini qayd qilish")
    public ResponseEntity<StudentLessonProgress> recordProgress(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        Long studentId = ((Number) payload.get("studentId")).longValue();
        String status = (String) payload.get("status");
        Integer score = payload.containsKey("score") ? ((Number) payload.get("score")).intValue() : null;
        String feedback = (String) payload.get("feedback");
        return ResponseEntity.ok(lessonService.recordStudentProgress(id, studentId, status, score, feedback));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Darsni o'chirish (faqat DRAFT yoki CANCELLED holatida)")
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
        lessonService.deleteLesson(id);
        return ResponseEntity.noContent().build();
    }
}
