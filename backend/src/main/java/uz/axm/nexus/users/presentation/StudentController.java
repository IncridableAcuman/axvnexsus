package uz.axm.nexus.users.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.axm.nexus.classrooms.application.GroupMembershipDto;
import uz.axm.nexus.identity.application.ResetPasswordResultDto;
import uz.axm.nexus.shared.application.ApiResponse;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.application.*;
import uz.axm.nexus.users.domain.Student;

import java.util.List;

@RestController
@RequestMapping({"/api/students", "/api/v1/students"})
@RequiredArgsConstructor
@Tag(name = "Students", description = "O'quvchilarni boshqarish va HEMIS hisoblarini provizion qilish API lari")
public class StudentController {

    private final StudentService studentService;
    private final ResourceOwnershipService resourceOwnershipService;
    private final CurrentUserHelper currentUserHelper;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Tizimga kirgan o'quvchining o'z shaxsiy profilini olish")
    public ResponseEntity<Student> getCurrentStudent() {
        return ResponseEntity.ok(resourceOwnershipService.requireCurrentStudent());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('users.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'OBSERVER')")
    @Operation(summary = "O'quvchilar ro'yxatini olish (sinflar, mentor, guruh, filial, status yoki qidiruv filtri bilan)")
    public ResponseEntity<List<Student>> getStudents(
            @RequestParam(required = false) String gradeLevel,
            @RequestParam(required = false) Long mentorId,
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        if (branchId != null || (status != null && !status.isBlank()) || (search != null && !search.isBlank())) {
            return ResponseEntity.ok(studentService.searchStudents(gradeLevel, mentorId, groupId, branchId, status, search));
        }
        if (gradeLevel != null && !gradeLevel.isBlank()) {
            return ResponseEntity.ok(studentService.getByGradeLevel(gradeLevel));
        }
        if (mentorId != null) {
            return ResponseEntity.ok(studentService.getByMentorId(mentorId));
        }
        if (groupId != null) {
            return ResponseEntity.ok(studentService.getByGroupId(groupId));
        }
        return ResponseEntity.ok(studentService.getAllStudents());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('users.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'REGIONAL_COORDINATOR', 'COORDINATOR', 'MENTOR', 'STUDENT')")
    @Operation(summary = "Alohida o'quvchi ma'lumotlarini (barcha bog'liqliklari bilan) olish")
    public ResponseEntity<ApiResponse<StudentDetailDto>> getStudentById(@PathVariable Long id) {
        resourceOwnershipService.verifyStudentAccess(id);
        StudentDetailDto dto = studentService.getStudentDetailById(id);
        return ResponseEntity.ok(ApiResponse.ok("O'quvchi ma'lumotlari olindi", dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('users.update') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "O'quvchi ma'lumotlarini tahrirlash (guruh, filial, status va shaxsiy ma'lumotlar)")
    public ResponseEntity<ApiResponse<StudentDetailDto>> updateStudent(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStudentRequest request
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        StudentDetailDto updated = studentService.updateStudent(id, request, actor);
        return ResponseEntity.ok(ApiResponse.ok("O'quvchi ma'lumotlari muvaffaqiyatli yangilandi", updated));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('users.update') or hasAuthority('users.disable') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "O'quvchi holatini o'zgartirish (ACTIVE, INACTIVE, ARCHIVED)")
    public ResponseEntity<ApiResponse<StudentDetailDto>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String reason
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        StudentDetailDto updated = studentService.updateStudentStatus(id, status, reason, actor);
        return ResponseEntity.ok(ApiResponse.ok("O'quvchi holati muvaffaqiyatli yangilandi", updated));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAuthority('users.disable') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN')")
    @Operation(summary = "O'quvchini xavfsiz arxivlash (tarixiy akademik ma'lumotlarni saqlab qolgan holda)")
    public ResponseEntity<ApiResponse<StudentDetailDto>> archiveStudent(
            @PathVariable Long id,
            @RequestParam(required = false) String reason
    ) {
        String actor = currentUserHelper.getCurrentUsername();
        StudentDetailDto archived = studentService.archiveStudent(id, reason, actor);
        return ResponseEntity.ok(ApiResponse.ok("O'quvchi muvaffaqiyatli arxivlandi", archived));
    }

    @GetMapping("/{id}/group-history")
    @PreAuthorize("hasAuthority('users.read') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR', 'STUDENT')")
    @Operation(summary = "O'quvchining barcha ta'lim guruhlari bo'yicha a'zolik va ko'chish tarixini olish")
    public ResponseEntity<ApiResponse<List<GroupMembershipDto>>> getStudentHistory(@PathVariable Long id) {
        resourceOwnershipService.verifyStudentAccess(id);
        List<GroupMembershipDto> history = studentService.getStudentHistory(id);
        return ResponseEntity.ok(ApiResponse.ok("O'quvchining guruh tarixi olindi", history));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('users.create') or hasAuthority('users.update') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Yangi o'quvchi qo'shish yoki tahrirlash")
    public ResponseEntity<Student> saveStudent(@RequestBody Student student) {
        return ResponseEntity.ok(studentService.saveStudent(student));
    }

    @PostMapping("/provision")
    @PreAuthorize("hasAuthority('users.create') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Mentor tomonidan o'quvchi qo'shish va unga HEMIS ID hamda tasodifiy parol berish")
    public ResponseEntity<ApiResponse<StudentProvisionDto>> provisionStudent(@Valid @RequestBody CreateStudentRequest request) {
        StudentProvisionDto dto = studentService.provisionStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("O'quvchi va uning HEMIS hisobi muvaffaqiyatli yaratildi", dto));
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('users.update') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN', 'MENTOR')")
    @Operation(summary = "Mentor yoki Admin tomonidan o'quvchi parolini yangi tasodifiy parolga tiklash")
    public ResponseEntity<ApiResponse<ResetPasswordResultDto>> resetPassword(@PathVariable Long id) {
        ResetPasswordResultDto result = studentService.resetStudentPassword(id);
        return ResponseEntity.ok(ApiResponse.ok("O'quvchi paroli muvaffaqiyatli yangilandi", result));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('users.disable') or hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Operation(summary = "O'quvchini tizimdan o'chirish (bog'liqliklar bo'lsa avtomatik xavfsiz arxivlanadi)")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.noContent().build();
    }
}
