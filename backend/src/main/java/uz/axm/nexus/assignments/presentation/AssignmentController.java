package uz.axm.nexus.assignments.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.assignments.application.AssignmentService;
import uz.axm.nexus.assignments.domain.Assignment;
import uz.axm.nexus.assignments.domain.AssignmentSubmission;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/assignments", "/api/v1/assignments"})
@RequiredArgsConstructor
@Tag(name = "Assignments & Homework", description = "Modul 10: Uy vazifalari va mustaqil amaliy topshiriqlar")
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final ResourceOwnershipService resourceOwnershipService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Guruh yoki fan bo'yicha topshiriqlar ro'yxati")
    public ResponseEntity<List<Assignment>> getAllAssignments(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) String subject
    ) {
        return ResponseEntity.ok(assignmentService.getAllAssignments(groupId, subject));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Topshiriq tafsilotlari")
    public ResponseEntity<Assignment> getAssignmentById(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.getAssignmentById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Yangi uy vazifasi yoki topshiriq e'lon qilish")
    public ResponseEntity<Assignment> createAssignment(@RequestBody Assignment assignment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.createAssignment(assignment));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchi tomonidan topshiriq javobini (kod, fayl, matn) yuborish")
    public ResponseEntity<AssignmentSubmission> submitAssignment(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        Long targetStudentId;
        if (currentUserHelper.isStudent()) {
            targetStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        } else if (payload.containsKey("studentId") && payload.get("studentId") != null) {
            targetStudentId = ((Number) payload.get("studentId")).longValue();
            resourceOwnershipService.verifyStudentAccess(targetStudentId);
        } else {
            targetStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        }

        String text = (String) payload.get("submissionText");
        String fileUrl = (String) payload.get("fileUrl");
        return ResponseEntity.ok(assignmentService.submitAssignment(id, targetStudentId, text, fileUrl));
    }

    @GetMapping("/my-submissions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Joriy o'quvchining barcha topshirgan ishlari")
    public ResponseEntity<List<AssignmentSubmission>> getMySubmissions() {
        Long currentStudentId = resourceOwnershipService.requireCurrentStudent().getId();
        return ResponseEntity.ok(assignmentService.getSubmissionsByStudent(currentStudentId));
    }

    @PostMapping("/submissions/{submissionId}/grade")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MENTOR', 'ENGLISH_MENTOR')")
    @Operation(summary = "Topshiriqni baholash va mentor izohini kiritish")
    public ResponseEntity<AssignmentSubmission> gradeSubmission(
            @PathVariable Long submissionId,
            @RequestBody Map<String, Object> payload
    ) {
        Long mentorId = ((Number) payload.get("mentorId")).longValue();
        Integer score = ((Number) payload.get("score")).intValue();
        String feedback = (String) payload.get("feedback");
        return ResponseEntity.ok(assignmentService.gradeSubmission(submissionId, mentorId, score, feedback));
    }

    @GetMapping("/{id}/submissions")
    @PreAuthorize("hasAuthority('assessments.grade') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Topshiriq bo'yicha barcha yuborilgan ishlar")
    public ResponseEntity<List<AssignmentSubmission>> getSubmissionsByAssignment(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.getSubmissionsByAssignment(id));
    }

    @GetMapping("/students/{studentId}/submissions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining barcha topshirgan ishlari")
    public ResponseEntity<List<AssignmentSubmission>> getSubmissionsByStudent(@PathVariable Long studentId) {
        resourceOwnershipService.verifyStudentAccess(studentId);
        return ResponseEntity.ok(assignmentService.getSubmissionsByStudent(studentId));
    }
}
