package uz.axm.nexus.reports.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.analytics.application.AnalyticsAuthorizationService;
import uz.axm.nexus.reports.application.PdfReportService;
import uz.axm.nexus.users.domain.User;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports & PDF Export", description = "Modul 12: Backend PDF formatida rasmiy tahliliy hisobotlarni eksport qilish")
public class ReportController {

    private final PdfReportService pdfReportService;
    private final AnalyticsAuthorizationService authorizationService;

    @GetMapping("/student/{studentId}/pdf")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "O'quvchining shaxsiy progress hisobotini PDF formatida yuklab olish")
    public ResponseEntity<byte[]> exportIndividualStudentPdf(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        byte[] pdfBytes = pdfReportService.generateIndividualStudentReport(studentId, from, to, requester);
        String filename = PdfReportService.sanitizeFilename("student_progress_" + studentId + "_" + LocalDate.now());

        return createPdfResponse(pdfBytes, filename);
    }

    @GetMapping("/group/{groupId}/pdf")
    @PreAuthorize("hasAuthority('reports.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Guruh umumiy o'zlashtirish va natijalari hisobotini PDF formatida yuklab olish")
    public ResponseEntity<byte[]> exportGroupPerformancePdf(
            @PathVariable Long groupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        byte[] pdfBytes = pdfReportService.generateGroupPerformanceReport(groupId, from, to, requester);
        String filename = PdfReportService.sanitizeFilename("group_performance_" + groupId + "_" + LocalDate.now());

        return createPdfResponse(pdfBytes, filename);
    }

    @GetMapping("/assessment/{assessmentId}/pdf")
    @PreAuthorize("hasAuthority('reports.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Test yoki oraliq baholash natijalari hisobotini PDF formatida yuklab olish")
    public ResponseEntity<byte[]> exportAssessmentResultsPdf(
            @PathVariable Long assessmentId
    ) {
        User requester = authorizationService.resolveCurrentUser();
        byte[] pdfBytes = pdfReportService.generateAssessmentResultsReport(assessmentId, requester);
        String filename = PdfReportService.sanitizeFilename("assessment_results_" + assessmentId + "_" + LocalDate.now());

        return createPdfResponse(pdfBytes, filename);
    }

    @GetMapping("/attendance/{groupId}/pdf")
    @PreAuthorize("hasAuthority('reports.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Guruh davomat statistikasi hisobotini PDF formatida yuklab olish")
    public ResponseEntity<byte[]> exportAttendancePdf(
            @PathVariable Long groupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        byte[] pdfBytes = pdfReportService.generateAttendanceReport(groupId, from, to, requester);
        String filename = PdfReportService.sanitizeFilename("group_attendance_" + groupId + "_" + LocalDate.now());

        return createPdfResponse(pdfBytes, filename);
    }

    @GetMapping("/lesson-completion/{groupId}/pdf")
    @PreAuthorize("hasAuthority('reports.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Darslar bajarilishi va mavzular qamrovi hisobotini PDF formatida yuklab olish")
    public ResponseEntity<byte[]> exportLessonCompletionPdf(
            @PathVariable Long groupId
    ) {
        User requester = authorizationService.resolveCurrentUser();
        byte[] pdfBytes = pdfReportService.generateLessonCompletionReport(groupId, requester);
        String filename = PdfReportService.sanitizeFilename("lesson_completion_" + groupId + "_" + LocalDate.now());

        return createPdfResponse(pdfBytes, filename);
    }

    @GetMapping("/mentor/{mentorId}/pdf")
    @PreAuthorize("hasAuthority('reports.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'OBSERVER')")
    @Operation(summary = "Mentor pedagogik yuklamasi va faoliyati hisobotini PDF formatida yuklab olish")
    public ResponseEntity<byte[]> exportMentorActivityPdf(
            @PathVariable Long mentorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        byte[] pdfBytes = pdfReportService.generateMentorActivityReport(mentorId, from, to, requester);
        String filename = PdfReportService.sanitizeFilename("mentor_activity_" + mentorId + "_" + LocalDate.now());

        return createPdfResponse(pdfBytes, filename);
    }

    @GetMapping("/subjects/pdf")
    @PreAuthorize("hasAuthority('reports.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'OBSERVER')")
    @Operation(summary = "Fanlar kesimidagi ta'lim samaradorligi hisobotini PDF formatida yuklab olish")
    public ResponseEntity<byte[]> exportSubjectsPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        User requester = authorizationService.resolveCurrentUser();
        byte[] pdfBytes = pdfReportService.generateSubjectPerformanceReport(from, to, requester);
        String filename = PdfReportService.sanitizeFilename("subjects_performance_" + LocalDate.now());

        return createPdfResponse(pdfBytes, filename);
    }

    @GetMapping("/academic-period/{periodId}/pdf")
    @PreAuthorize("hasAuthority('reports.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'OBSERVER')")
    @Operation(summary = "Semestr / O'quv davri yakuniy hisobotini PDF formatida yuklab olish")
    public ResponseEntity<byte[]> exportAcademicPeriodPdf(
            @PathVariable Long periodId
    ) {
        User requester = authorizationService.resolveCurrentUser();
        byte[] pdfBytes = pdfReportService.generateAcademicPeriodSummaryReport(periodId, requester);
        String filename = PdfReportService.sanitizeFilename("academic_period_" + periodId + "_" + LocalDate.now());

        return createPdfResponse(pdfBytes, filename);
    }

    private ResponseEntity<byte[]> createPdfResponse(byte[] pdfBytes, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
