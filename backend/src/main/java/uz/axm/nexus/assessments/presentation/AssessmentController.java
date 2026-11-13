package uz.axm.nexus.assessments.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.assessments.application.AssessmentService;
import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.assessments.domain.AssessmentQuestion;
import uz.axm.nexus.assessments.domain.StudentAnswer;
import uz.axm.nexus.assessments.domain.StudentAssessmentAttempt;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/assessments", "/api/v1/assessments"})
@RequiredArgsConstructor
@Tag(name = "Assessments & Quizzes", description = "Modul 10: Testlar, viktorinalar, avto-baholash va mustaqil mashqlar")
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final ResourceOwnershipService resourceOwnershipService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping
    @PreAuthorize("hasAuthority('assessments.read') or isAuthenticated()")
    @Operation(summary = "Barcha testlar va baholashlar ro'yxati")
    public ResponseEntity<List<Assessment>> getAllAssessments(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String gradeLevel,
            @RequestParam(required = false) Long groupId
    ) {
        return ResponseEntity.ok(assessmentService.getAllAssessments(subject, gradeLevel, groupId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('assessments.read') or isAuthenticated()")
    @Operation(summary = "Test tafsilotlarini olish")
    public ResponseEntity<Assessment> getAssessmentById(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentService.getAssessmentById(id));
    }

    @GetMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')")
    @Operation(summary = "Test savollarini javob kalitlari bilan olish (Faqat mentor/admin)")
    public ResponseEntity<List<AssessmentQuestion>> getQuestionsForAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentService.getQuestionsForAdminOrMentor(id));
    }

    @GetMapping("/{id}/take")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchi uchun test savollari (Javob kalitlari yashirilgan!)")
    public ResponseEntity<List<AssessmentQuestion>> getQuestionsForTaking(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentService.getQuestionsForStudentAttempt(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')")
    @Operation(summary = "Yangi test va savollar paketini yaratish")
    public ResponseEntity<Assessment> createAssessment(@RequestBody CreateAssessmentRequest request) {
        Assessment saved = assessmentService.createAssessment(request.assessment(), request.questions());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')")
    @Operation(summary = "Test va savollarni yangilash")
    public ResponseEntity<Assessment> updateAssessment(
            @PathVariable Long id,
            @RequestBody CreateAssessmentRequest request
    ) {
        return ResponseEntity.ok(assessmentService.updateAssessment(id, request.assessment(), request.questions()));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchi test urinishini boshlash")
    public ResponseEntity<StudentAssessmentAttempt> startAttempt(
            @PathVariable Long id,
            @RequestParam(required = false) Long studentId
    ) {
        Long targetStudentId = studentId;
        if (targetStudentId == null || currentUserHelper.isStudent()) {
            targetStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        } else {
            resourceOwnershipService.verifyStudentAccess(targetStudentId);
        }
        return ResponseEntity.ok(assessmentService.startAttempt(id, targetStudentId));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Test javoblarini topshirish va avtomatik tekshirish")
    public ResponseEntity<StudentAssessmentAttempt> submitAttempt(
            @PathVariable Long attemptId,
            @RequestBody Map<Long, String> answers
    ) {
        StudentAssessmentAttempt attempt = assessmentService.getAttemptById(attemptId);
        resourceOwnershipService.verifyStudentAccess(attempt.getStudentId());
        return ResponseEntity.ok(assessmentService.submitAttempt(attemptId, answers));
    }

    @PostMapping("/attempts/{attemptId}/grade")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR')")
    @Operation(summary = "Urinishni qo'lda tekshirish va mentor xulosasini yozish")
    public ResponseEntity<StudentAssessmentAttempt> gradeAttemptManually(
            @PathVariable Long attemptId,
            @RequestParam Long mentorId,
            @RequestBody GradeAttemptRequest request
    ) {
        return ResponseEntity.ok(assessmentService.gradeAttemptManually(
                attemptId, mentorId, request.scores(), request.feedback()
        ));
    }

    @GetMapping("/attempts/{attemptId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Urinish natijasi")
    public ResponseEntity<StudentAssessmentAttempt> getAttempt(@PathVariable Long attemptId) {
        StudentAssessmentAttempt attempt = assessmentService.getAttemptById(attemptId);
        resourceOwnershipService.verifyStudentAccess(attempt.getStudentId());
        return ResponseEntity.ok(attempt);
    }

    @GetMapping("/attempts/{attemptId}/answers")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Urinishdagi o'quvchi javoblari")
    public ResponseEntity<List<StudentAnswer>> getAttemptAnswers(@PathVariable Long attemptId) {
        StudentAssessmentAttempt attempt = assessmentService.getAttemptById(attemptId);
        resourceOwnershipService.verifyStudentAccess(attempt.getStudentId());
        return ResponseEntity.ok(assessmentService.getAttemptAnswers(attemptId));
    }

    @GetMapping("/my-attempts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining barcha test urinishlari tarixi")
    public ResponseEntity<List<StudentAssessmentAttempt>> getMyAttempts() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        return ResponseEntity.ok(assessmentService.getStudentAttempts(currentStudentId));
    }

    @GetMapping("/students/{studentId}/attempts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining barcha test urinishlari tarixi")
    public ResponseEntity<List<StudentAssessmentAttempt>> getStudentAttempts(@PathVariable Long studentId) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        return ResponseEntity.ok(assessmentService.getStudentAttempts(studentId));
    }

    public record CreateAssessmentRequest(Assessment assessment, List<AssessmentQuestion> questions) {}
    public record GradeAttemptRequest(Map<Long, Integer> scores, String feedback) {}
}
