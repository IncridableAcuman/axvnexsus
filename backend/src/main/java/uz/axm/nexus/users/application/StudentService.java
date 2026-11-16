package uz.axm.nexus.users.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.branches.infrastructure.BranchRepository;
import uz.axm.nexus.classrooms.application.GroupMembershipDto;
import uz.axm.nexus.classrooms.domain.GroupMembership;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.GroupMembershipRepository;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.identity.application.HemisIdGeneratorService;
import uz.axm.nexus.identity.application.ResetPasswordResultDto;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
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
    private final BranchRepository branchRepository;
    private final MentorRepository mentorRepository;
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

        Branch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId()).orElse(null);
        } else if (studyGroup != null && studyGroup.getBranch() != null) {
            branch = studyGroup.getBranch();
        }

        // 3. Create Student Entity
        Student student = Student.builder()
                .fullName(fullName)
                .studentIdNumber(hemisId)
                .pinfl(request.getPinfl() != null && !request.getPinfl().isBlank() ? request.getPinfl().trim() : null)
                .gradeLevel(gradeLevel)
                .direction(request.getDirection() != null ? request.getDirection() : (studyGroup != null ? studyGroup.getSubject() : "Web Full-Stack"))
                .district(request.getDistrict() != null ? request.getDistrict() : "Yangiariq tumani")
                .branchLocation(request.getBranchLocation() != null ? request.getBranchLocation() : (studyGroup != null ? studyGroup.getBranchLocation() : "IT Park Yangiariq"))
                .branch(branch)
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
        if (group != null && group.getBranch() != null && student.getBranch() == null) {
            student.setBranch(group.getBranch());
        }
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

    public List<Student> searchStudents(String gradeLevel, Long mentorId, Long groupId, Long branchId, String status, String search) {
        List<Student> students = studentRepository.findAll();

        if (gradeLevel != null && !gradeLevel.isBlank() && !gradeLevel.equalsIgnoreCase("all")) {
            students = students.stream()
                    .filter(s -> gradeLevel.equalsIgnoreCase(s.getGradeLevel()))
                    .toList();
        }
        if (mentorId != null) {
            students = students.stream()
                    .filter(s -> s.getMentor() != null && mentorId.equals(s.getMentor().getId()))
                    .toList();
        }
        if (groupId != null) {
            students = students.stream()
                    .filter(s -> s.getStudyGroup() != null && groupId.equals(s.getStudyGroup().getId()))
                    .toList();
        }
        if (branchId != null) {
            students = students.stream()
                    .filter(s -> (s.getBranch() != null && branchId.equals(s.getBranch().getId())))
                    .toList();
        }
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("all")) {
            students = students.stream()
                    .filter(s -> s.getStatus() != null && (
                            s.getStatus().equalsIgnoreCase(status) ||
                            (status.equalsIgnoreCase("ACTIVE") && s.getStatus().equalsIgnoreCase("Faol")) ||
                            (status.equalsIgnoreCase("INACTIVE") && s.getStatus().equalsIgnoreCase("Nofaol")) ||
                            (status.equalsIgnoreCase("ARCHIVED") && s.getStatus().equalsIgnoreCase("Arxivlangan"))
                    ))
                    .toList();
        }
        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            students = students.stream()
                    .filter(s -> (s.getFullName() != null && s.getFullName().toLowerCase().contains(q)) ||
                                 (s.getStudentIdNumber() != null && s.getStudentIdNumber().toLowerCase().contains(q)) ||
                                 (s.getPinfl() != null && s.getPinfl().contains(q)) ||
                                 (s.getPhone() != null && s.getPhone().contains(q)))
                    .toList();
        }

        return students;
    }

    public StudentDetailDto getStudentDetailById(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("O'quvchi topilmadi: #" + id));
        return toDetailDto(student);
    }

    @Transactional
    public StudentDetailDto updateStudent(Long id, UpdateStudentRequest request, String actor) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("O'quvchi topilmadi: #" + id));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            student.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            student.setPhone(request.getPhone().trim());
        }
        if (request.getPinfl() != null) {
            student.setPinfl(request.getPinfl().trim());
        }
        if (request.getGradeLevel() != null && !request.getGradeLevel().isBlank()) {
            student.setGradeLevel(request.getGradeLevel().trim());
        }
        if (request.getDistrict() != null) {
            student.setDistrict(request.getDistrict().trim());
        }
        if (request.getDirection() != null) {
            student.setDirection(request.getDirection().trim());
        }

        // Branch update
        if (request.getBranchId() != null) {
            Branch branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: #" + request.getBranchId()));
            student.setBranch(branch);
            student.setBranchLocation(branch.getName());
        } else if (request.getBranchLocation() != null && !request.getBranchLocation().isBlank()) {
            student.setBranchLocation(request.getBranchLocation().trim());
        }

        // Mentor update
        if (request.getMentorId() != null) {
            Mentor mentor = mentorRepository.findById(request.getMentorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mentor topilmadi: #" + request.getMentorId()));
            student.setMentor(mentor);
        }

        // StudyGroup update / transfer handling
        if (request.getStudyGroupId() != null) {
            StudyGroup newGroup = studyGroupRepository.findById(request.getStudyGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Guruh topilmadi: #" + request.getStudyGroupId()));

            StudyGroup currentGroup = student.getStudyGroup();
            if (currentGroup == null || !currentGroup.getId().equals(newGroup.getId())) {
                groupMembershipRepository.findByStudentIdAndStatus(student.getId(), "ACTIVE").ifPresent(m -> {
                    m.setStatus("TRANSFERRED");
                    m.setLeftAt(LocalDateTime.now());
                    m.setTransferReason("O'quvchi profilini tahrirlash orqali ko'chirildi");
                    groupMembershipRepository.save(m);
                });

                groupMembershipRepository.save(GroupMembership.builder()
                        .student(student)
                        .group(newGroup)
                        .status("ACTIVE")
                        .enrolledAt(LocalDateTime.now())
                        .previousGroup(currentGroup)
                        .transferReason("Profil tahrirlash orqali guruh yangilandi")
                        .build());

                student.setStudyGroup(newGroup);
                if (newGroup.getMentor() != null && request.getMentorId() == null) {
                    student.setMentor(newGroup.getMentor());
                }
                if (newGroup.getBranch() != null && request.getBranchId() == null) {
                    student.setBranch(newGroup.getBranch());
                    student.setBranchLocation(newGroup.getBranch().getName());
                }
            }
        }

        // Status update
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            applyStatus(student, request.getStatus());
        }

        Student saved = studentRepository.save(student);

        // Sync linked user
        User user = saved.getUser();
        if (user == null && saved.getStudentIdNumber() != null) {
            user = userRepository.findByUsernameIgnoreCase(saved.getStudentIdNumber()).orElse(null);
        }
        if (user != null) {
            user.setFullName(saved.getFullName());
            if (saved.getPhone() != null) user.setPhone(saved.getPhone());
            userRepository.save(user);
        }

        auditService.logAction(
                "STUDENT_UPDATED",
                "Student",
                String.valueOf(saved.getId()),
                actor != null ? actor : "admin",
                "O'quvchi ma'lumotlari yangilandi: " + saved.getFullName()
        );

        return toDetailDto(saved);
    }

    @Transactional
    public StudentDetailDto updateStudentStatus(Long id, String status, String reason, String actor) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("O'quvchi topilmadi: #" + id));

        applyStatus(student, status);
        Student saved = studentRepository.save(student);

        auditService.logAction(
                "STUDENT_STATUS_UPDATED",
                "Student",
                String.valueOf(saved.getId()),
                actor != null ? actor : "admin",
                "O'quvchi holati yangilandi (" + status + ")" + (reason != null ? ". Sabab: " + reason : "")
        );

        return toDetailDto(saved);
    }

    @Transactional
    public StudentDetailDto archiveStudent(Long id, String reason, String actor) {
        return updateStudentStatus(id, "ARCHIVED", reason != null ? reason : "Arxivlandi", actor);
    }

    private void applyStatus(Student student, String rawStatus) {
        String upper = rawStatus.trim().toUpperCase();
        if (upper.equals("ARCHIVED") || upper.equals("ARXIVLANGAN")) {
            student.setStatus("ARCHIVED");
            updateLinkedUserEnabled(student, false);
            groupMembershipRepository.findByStudentIdAndStatus(student.getId(), "ACTIVE").ifPresent(m -> {
                m.setStatus("ARCHIVED");
                m.setLeftAt(LocalDateTime.now());
                m.setTransferReason("O'quvchi arxivlandi");
                groupMembershipRepository.save(m);
            });
        } else if (upper.equals("INACTIVE") || upper.equals("NOFAOL")) {
            student.setStatus("INACTIVE");
            updateLinkedUserEnabled(student, false);
        } else {
            student.setStatus("ACTIVE");
            updateLinkedUserEnabled(student, true);
        }
    }

    private void updateLinkedUserEnabled(Student student, boolean enabled) {
        User user = student.getUser();
        if (user == null && student.getStudentIdNumber() != null) {
            user = userRepository.findByUsernameIgnoreCase(student.getStudentIdNumber()).orElse(null);
        }
        if (user != null) {
            user.setEnabled(enabled);
            userRepository.save(user);
        }
    }

    @Transactional(readOnly = true)
    public List<GroupMembershipDto> getStudentHistory(Long studentId) {
        return groupMembershipRepository.findByStudentIdOrderByEnrolledAtDesc(studentId).stream()
                .map(this::toMembershipDto)
                .toList();
    }

    public StudentDetailDto toDetailDto(Student student) {
        if (student == null) return null;

        User user = student.getUser();
        if (user == null && student.getStudentIdNumber() != null) {
            user = userRepository.findByUsernameIgnoreCase(student.getStudentIdNumber()).orElse(null);
        }

        Long branchId = student.getBranch() != null ? student.getBranch().getId() : null;
        String branchName = student.getBranch() != null ? student.getBranch().getName() : student.getBranchLocation();

        Long groupId = student.getStudyGroup() != null ? student.getStudyGroup().getId() : null;
        String groupCode = student.getStudyGroup() != null ? student.getStudyGroup().getGroupCode() : null;

        Long mentorId = student.getMentor() != null ? student.getMentor().getId() : null;
        String mentorName = student.getMentor() != null ? student.getMentor().getFullName() : null;

        return StudentDetailDto.builder()
                .id(student.getId())
                .fullName(student.getFullName())
                .studentIdNumber(student.getStudentIdNumber())
                .username(user != null ? user.getUsername() : student.getStudentIdNumber())
                .pinfl(student.getPinfl())
                .phone(student.getPhone())
                .gradeLevel(student.getGradeLevel())
                .direction(student.getDirection())
                .district(student.getDistrict())
                .branchLocation(student.getBranchLocation())
                .branchId(branchId)
                .branchName(branchName)
                .studyGroupId(groupId)
                .groupCode(groupCode)
                .mentorId(mentorId)
                .mentorName(mentorName)
                .status(student.getStatus())
                .accountEnabled(user != null && user.isEnabled())
                .createdAt(student.getCreatedAt())
                .updatedAt(student.getUpdatedAt())
                .build();
    }

    public GroupMembershipDto toMembershipDto(GroupMembership gm) {
        return GroupMembershipDto.builder()
                .id(gm.getId())
                .studentId(gm.getStudent() != null ? gm.getStudent().getId() : null)
                .studentName(gm.getStudent() != null ? gm.getStudent().getFullName() : null)
                .studentGrade(gm.getStudent() != null ? gm.getStudent().getGradeLevel() : null)
                .groupId(gm.getGroup() != null ? gm.getGroup().getId() : null)
                .groupCode(gm.getGroup() != null ? gm.getGroup().getGroupCode() : null)
                .status(gm.getStatus())
                .enrolledAt(gm.getEnrolledAt())
                .leftAt(gm.getLeftAt())
                .transferReason(gm.getTransferReason())
                .previousGroupId(gm.getPreviousGroup() != null ? gm.getPreviousGroup().getId() : null)
                .previousGroupCode(gm.getPreviousGroup() != null ? gm.getPreviousGroup().getGroupCode() : null)
                .build();
    }

    @Transactional
    public void deleteStudent(Long id) {
        studentRepository.findById(id).ifPresent(student -> {
            long membershipsCount = groupMembershipRepository.findByStudentId(id).size();
            if (membershipsCount > 0) {
                student.setStatus("ARCHIVED");
                updateLinkedUserEnabled(student, false);
                studentRepository.save(student);
                auditService.logAction("STUDENT_ARCHIVED", "Student", String.valueOf(id), "admin",
                        "O'quvchi o'chirish so'rovi xavfsiz arxivlashga o'tkazildi: " + student.getFullName());
                return;
            }

            if (student.getStudentIdNumber() != null) {
                userRepository.findByUsername(student.getStudentIdNumber()).ifPresent(userRepository::delete);
            }
            studentRepository.deleteById(id);
        });
    }
}
