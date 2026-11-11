package uz.axm.nexus.users.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.classrooms.domain.GroupMembership;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.GroupMembershipRepository;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.identity.application.HemisIdGeneratorService;
import uz.axm.nexus.identity.application.ResetPasswordResultDto;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final HemisIdGeneratorService hemisIdGeneratorService;
    private final StudyGroupRepository studyGroupRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final AuditService auditService;

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public List<Student> getByGradeLevel(String gradeLevel) {
        return studentRepository.findByGradeLevel(gradeLevel);
    }

    public List<Student> getByMentorId(Long mentorId) {
        return studentRepository.findByMentorId(mentorId);
    }

    public List<Student> getByGroupId(Long groupId) {
        return studentRepository.findByStudyGroupId(groupId);
    }

    public Optional<Student> findById(Long id) {
        return studentRepository.findById(id);
    }

    @Transactional
    public Student saveStudent(Student student) {
        // Agar o'quvchida HEMIS ID bo'lmasa, avtomatik yaratish
        if (student.getStudentIdNumber() == null || student.getStudentIdNumber().trim().isBlank()) {
            student.setStudentIdNumber(hemisIdGeneratorService.generateStudentId());
        }
        Student saved = studentRepository.save(student);

        // Agar ushbu o'quvchi uchun User hisobi mavjud bo'lmasa, yaratish
        if (!userRepository.existsByUsernameIgnoreCase(saved.getStudentIdNumber())) {
            String tempPassword = hemisIdGeneratorService.generatePassword();
            Set<Role> roles = new HashSet<>();
            roleRepository.findByName("STUDENT")
                    .or(() -> roleRepository.findByName("ROLE_STUDENT"))
                    .ifPresent(roles::add);

            User user = User.builder()
                    .username(saved.getStudentIdNumber())
                    .password(passwordEncoder.encode(tempPassword))
                    .fullName(saved.getFullName())
                    .phone(saved.getPhone())
                    .email(saved.getStudentIdNumber() + "@student.axm-nexus.uz")
                    .role("ROLE_STUDENT")
                    .roles(roles)
                    .enabled(true)
                    .emailVerified(true)
                    .build();
            userRepository.save(user);
        }

        return saved;
    }

    /**
     * Mentor tomonidan o'z guruhiga yangi o'quvchi qo'shish va unga HEMIS ID raqami hamda tasodifiy parol berish
     */
    @Transactional
    public StudentProvisionDto provisionStudent(CreateStudentRequest request) {
        String fullName = request.getFullName().trim();
        String gradeLevel = request.getGradeLevel() != null ? request.getGradeLevel().trim() : "8-sinf";

        // 1. Resolve Study Group and Mentor
        StudyGroup studyGroup = null;
        Mentor mentor = null;
        if (request.getStudyGroupId() != null) {
            studyGroup = studyGroupRepository.findById(request.getStudyGroupId()).orElse(null);
            if (studyGroup != null) {
                mentor = studyGroup.getMentor();
            }
        }

        // 2. Generate HEMIS Student ID & Random Password
        String hemisId = hemisIdGeneratorService.generateStudentId();
        String rawPassword = hemisIdGeneratorService.generatePassword();

        // 3. Create Student Entity
        Student student = Student.builder()
                .fullName(fullName)
                .studentIdNumber(hemisId)
                .pinfl(request.getPinfl() != null && !request.getPinfl().isBlank() ? request.getPinfl().trim() : null)
                .gradeLevel(gradeLevel)
                .direction(request.getDirection() != null ? request.getDirection() : (studyGroup != null ? studyGroup.getSubject() : "Web Full-Stack"))
                .district(request.getDistrict() != null ? request.getDistrict() : "Yangiariq tumani")
                .branchLocation(request.getBranchLocation() != null ? request.getBranchLocation() : (studyGroup != null ? studyGroup.getBranchLocation() : "IT Park Yangiariq"))
                .phone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null)
                .status("Faol")
                .studyGroup(studyGroup)
                .mentor(mentor)
                .build();
        Student savedStudent = studentRepository.save(student);

        // 4. Create User auth account
        Set<Role> roles = new HashSet<>();
        roleRepository.findByName("STUDENT")
                .or(() -> roleRepository.findByName("ROLE_STUDENT"))
                .ifPresent(roles::add);

        User user = User.builder()
                .username(hemisId)
                .password(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .phone(savedStudent.getPhone())
                .email(hemisId + "@student.axm-nexus.uz")
                .role("ROLE_STUDENT")
                .roles(roles)
                .enabled(true)
                .emailVerified(true)
                .build();
        User savedUser = userRepository.save(user);

        // 4.1 Link Student to User Authentication Record
        savedStudent.setUser(savedUser);
        studentRepository.save(savedStudent);

        // 5. Create GroupMembership if group is assigned
        if (studyGroup != null) {
            groupMembershipRepository.save(GroupMembership.builder()
                    .student(savedStudent)
                    .group(studyGroup)
                    .status("ACTIVE")
                    .enrolledAt(LocalDateTime.now())
                    .build());

            int count = groupMembershipRepository.findByGroupIdAndStatus(studyGroup.getId(), "ACTIVE").size();
            studyGroup.setStudentCount(count);
            studyGroupRepository.save(studyGroup);
        }

        try {
            auditService.logAction(
                    "STUDENT_PROVISIONED",
                    "Student",
                    String.valueOf(savedStudent.getId()),
                    mentor != null ? mentor.getFullName() : "mentor",
                    "Mentor tomonidan yangi o'quvchi va HEMIS ID yaratildi: " + fullName + " (ID: " + hemisId + ")"
            );
        } catch (Exception e) {
            log.warn("Audit xatosi: {}", e.getMessage());
        }

        return StudentProvisionDto.builder()
                .id(savedStudent.getId())
                .fullName(savedStudent.getFullName())
                .studentIdNumber(hemisId)
                .temporaryPassword(rawPassword)
                .gradeLevel(savedStudent.getGradeLevel())
                .studyGroupId(studyGroup != null ? studyGroup.getId() : null)
                .groupCode(studyGroup != null ? studyGroup.getGroupCode() : null)
                .mentorName(mentor != null ? mentor.getFullName() : null)
                .branchLocation(savedStudent.getBranchLocation())
                .phone(savedStudent.getPhone())
                .pinfl(savedStudent.getPinfl())
                .direction(savedStudent.getDirection())
                .status(savedStudent.getStatus())
                .accountCreated(true)
                .createdAt(LocalDateTime.now())
                .build();
    }

    /**
     * Mentor yoki Admin tomonidan o'quvchi parolini yangi tasodifiy parolga tiklash
     */
    @Transactional
    public ResetPasswordResultDto resetStudentPassword(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new BusinessException("O'quvchi topilmadi (ID: " + studentId + ")"));

        String identifier = student.getStudentIdNumber();
        if (identifier == null || identifier.isBlank()) {
            identifier = hemisIdGeneratorService.generateStudentId();
            student.setStudentIdNumber(identifier);
            studentRepository.save(student);
        }

        User user = userRepository.findByUsernameIgnoreCase(identifier).orElse(null);
        String newPassword = hemisIdGeneratorService.generatePassword();

        if (user == null) {
            Set<Role> roles = new HashSet<>();
            roleRepository.findByName("STUDENT")
                    .or(() -> roleRepository.findByName("ROLE_STUDENT"))
                    .ifPresent(roles::add);

            user = User.builder()
                    .username(identifier)
                    .password(passwordEncoder.encode(newPassword))
                    .fullName(student.getFullName())
                    .phone(student.getPhone())
                    .email(identifier + "@student.axm-nexus.uz")
                    .role("ROLE_STUDENT")
                    .roles(roles)
                    .enabled(true)
                    .emailVerified(true)
                    .build();
            userRepository.save(user);
        } else {
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
        }

        try {
            auditService.logAction(
                    "STUDENT_PASSWORD_RESET",
                    "Student",
                    String.valueOf(student.getId()),
                    "mentor",
                    "O'quvchi paroli qayta tiklandi: " + student.getFullName() + " (ID: " + identifier + ")"
            );
        } catch (Exception e) {
            log.warn("Audit xatosi: {}", e.getMessage());
        }

        return ResetPasswordResultDto.builder()
                .targetId(student.getId())
                .identifier(identifier)
                .fullName(student.getFullName())
                .newPassword(newPassword)
                .build();
    }

    @Transactional
    public Student saveOrUpdate(String fullName, String pinfl, String studentIdNumber,
                                String district, String gradeLevel, String branchLocation,
                                String phone, StudyGroup group, Mentor mentor) {
        if (fullName == null || fullName.isBlank()) return null;
        String cleanName = fullName.trim();

        Optional<Student> existingOpt = Optional.empty();
        if (pinfl != null && !pinfl.isBlank()) {
            existingOpt = studentRepository.findByPinfl(pinfl.trim());
        }
        if (existingOpt.isEmpty() && studentIdNumber != null && !studentIdNumber.isBlank()) {
            existingOpt = studentRepository.findByStudentIdNumber(studentIdNumber.trim());
        }
        if (existingOpt.isEmpty()) {
            existingOpt = studentRepository.findByFullNameIgnoreCase(cleanName);
        }

        Student student = existingOpt.orElseGet(() -> Student.builder().fullName(cleanName).build());
        student.setFullName(cleanName);
        if (pinfl != null && !pinfl.isBlank()) student.setPinfl(pinfl.trim());
        if (studentIdNumber != null && !studentIdNumber.isBlank()) {
            student.setStudentIdNumber(studentIdNumber.trim());
        } else if (student.getStudentIdNumber() == null) {
            student.setStudentIdNumber(hemisIdGeneratorService.generateStudentId());
        }
        if (district != null) student.setDistrict(district);
        if (gradeLevel != null) student.setGradeLevel(gradeLevel);
        if (branchLocation != null) student.setBranchLocation(branchLocation);
        if (phone != null) student.setPhone(phone);
        if (group != null) student.setStudyGroup(group);
        if (mentor != null) student.setMentor(mentor);
        if (student.getStatus() == null) student.setStatus("Faol");

        Student saved = studentRepository.save(student);

        // Ensure user account exists
        if (!userRepository.existsByUsernameIgnoreCase(saved.getStudentIdNumber())) {
            String tempPassword = hemisIdGeneratorService.generatePassword();
            Set<Role> roles = new HashSet<>();
            roleRepository.findByName("STUDENT")
                    .or(() -> roleRepository.findByName("ROLE_STUDENT"))
                    .ifPresent(roles::add);

            User user = User.builder()
                    .username(saved.getStudentIdNumber())
                    .password(passwordEncoder.encode(tempPassword))
                    .fullName(saved.getFullName())
                    .phone(saved.getPhone())
                    .email(saved.getStudentIdNumber() + "@student.axm-nexus.uz")
                    .role("ROLE_STUDENT")
                    .roles(roles)
                    .enabled(true)
                    .emailVerified(true)
                    .build();
            userRepository.save(user);
        }

        return saved;
    }

    @Transactional
    public void deleteStudent(Long id) {
        studentRepository.findById(id).ifPresent(student -> {
            if (student.getStudentIdNumber() != null) {
                userRepository.findByUsername(student.getStudentIdNumber()).ifPresent(userRepository::delete);
            }
        });
        studentRepository.deleteById(id);
    }
}
