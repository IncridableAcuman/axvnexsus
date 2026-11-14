package uz.axm.nexus.mentors.application;

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
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.identity.application.HemisIdGeneratorService;
import uz.axm.nexus.identity.application.ResetPasswordResultDto;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.domain.MentorProfile;
import uz.axm.nexus.mentors.infrastructure.MentorProfileRepository;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.infrastructure.ScheduleRepository;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
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
public class MentorService {

    private final MentorRepository mentorRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final HemisIdGeneratorService hemisIdGeneratorService;
    private final MentorProfileRepository mentorProfileRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final StudentRepository studentRepository;
    private final BranchRepository branchRepository;
    private final ScheduleRepository scheduleRepository;
    private final AuditService auditService;

    public List<Mentor> getAllMentors() {
        return mentorRepository.findAll();
    }

    public Optional<Mentor> findById(Long id) {
        return mentorRepository.findById(id);
    }

    public Optional<Mentor> findByName(String name) {
        if (name == null || name.isBlank()) return Optional.empty();
        return mentorRepository.findByFullNameIgnoreCase(name.trim())
                .or(() -> mentorRepository.findFirstByFullNameContainingIgnoreCase(name.trim()));
    }

    @Transactional
    public Mentor getOrCreate(String fullName, String role, String branchLocation) {
        if (fullName == null || fullName.isBlank()) {
            fullName = "Noma'lum Mentor";
        }
        String finalName = fullName.trim();
        return findByName(finalName).orElseGet(() -> {
            Mentor mentor = Mentor.builder()
                    .fullName(finalName)
                    .role(role != null && !role.isBlank() ? role : "IT mentor")
                    .branchLocation(branchLocation != null && !branchLocation.isBlank() ? branchLocation : "IT Park Yangiariq")
                    .build();
            return mentorRepository.save(mentor);
        });
    }

    @Transactional
    public Mentor save(Mentor mentor) {
        return mentorRepository.save(mentor);
    }

    /**
     * Admin tomonidan yangi mentor va uning HEMIS tartibidagi hisobini (ID + random parol) yaratish
     */
    @Transactional
    public MentorProvisionDto provisionMentor(CreateMentorRequest request) {
        String fullName = request.getFullName().trim();
        String role = request.getRole() != null && !request.getRole().isBlank() ? request.getRole().trim() : "IT mentor";
        String branchLocation = request.getBranchLocation() != null && !request.getBranchLocation().isBlank()
                ? request.getBranchLocation().trim() : "IT Park Yangiariq";
        String phone = request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null;
        String email = request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail().trim().toLowerCase() : null;

        // 1. Generate HEMIS Mentor ID & Random Password
        String hemisId = hemisIdGeneratorService.generateMentorId();
        String rawPassword = hemisIdGeneratorService.generatePassword();

        // 2. Create Mentor entity
        Mentor mentor = Mentor.builder()
                .fullName(fullName)
                .role(role)
                .branchLocation(branchLocation)
                .phone(phone)
                .email(email)
                .bio(request.getBio())
                .build();
        Mentor savedMentor = mentorRepository.save(mentor);

        // 3. Attach Roles and create User auth record
        Set<Role> roles = new HashSet<>();
        roleRepository.findByName("MENTOR")
                .or(() -> roleRepository.findByName("ROLE_MENTOR"))
                .ifPresent(roles::add);

        String userEmail = email != null ? email : (hemisId + "@mentor.axm-nexus.uz");

        User user = User.builder()
                .username(hemisId)
                .password(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .phone(phone)
                .email(userEmail)
                .role("ROLE_MENTOR")
                .roles(roles)
                .enabled(true)
                .emailVerified(true)
                .build();
        User savedUser = userRepository.save(user);

        // 3.1 Link Mentor entity to User Authentication Record
        savedMentor.setUser(savedUser);
        mentorRepository.save(savedMentor);

        // 4. Create initial MentorProfile
        if (mentorProfileRepository.findByMentorId(savedMentor.getId()).isEmpty()) {
            mentorProfileRepository.save(MentorProfile.builder()
                    .mentor(savedMentor)
                    .user(savedUser)
                    .displayName(fullName)
                    .headline(role + " | " + branchLocation)
                    .bio(request.getBio() != null ? request.getBio() : "Al-Xorazmiy Vorislari ta'lim loyihasi mentori")
                    .phone(phone)
                    .email(userEmail)
                    .branchLocation(branchLocation)
                    .isContactPublic(true)
                    .publicationStatus("PUBLISHED")
                    .build());
        }

        try {
            auditService.logAction(
                    "MENTOR_PROVISIONED",
                    "Mentor",
                    String.valueOf(savedMentor.getId()),
                    "admin",
                    "Admin tomonidan yangi mentor va HEMIS hisobi yaratildi: " + fullName + " (ID: " + hemisId + ")"
            );
        } catch (Exception e) {
            log.warn("Audit xatosi: {}", e.getMessage());
        }

        return MentorProvisionDto.builder()
                .id(savedMentor.getId())
                .fullName(savedMentor.getFullName())
                .role(savedMentor.getRole())
                .phone(savedMentor.getPhone())
                .email(savedMentor.getEmail())
                .branchLocation(savedMentor.getBranchLocation())
                .bio(savedMentor.getBio())
                .hemisId(hemisId)
                .temporaryPassword(rawPassword)
                .accountCreated(true)
                .createdAt(LocalDateTime.now())
                .build();
    }

    /**
     * Admin tomonidan mentor hisobiga yangi tasodifiy parol generatsiya qilib berish
     */
    @Transactional
    public ResetPasswordResultDto resetMentorPassword(Long mentorId) {
        Mentor mentor = mentorRepository.findById(mentorId)
                .orElseThrow(() -> new BusinessException("Mentor topilmadi (ID: " + mentorId + ")"));

        // Find user by mentor email, phone or search in users
        User user = null;
        if (mentor.getEmail() != null) {
            user = userRepository.findByEmailIgnoreCase(mentor.getEmail()).orElse(null);
        }
        if (user == null) {
            // Find user where fullName matches and role is mentor
            List<User> users = userRepository.findAll().stream()
                    .filter(u -> u.getFullName().equalsIgnoreCase(mentor.getFullName()) ||
                            (u.getPhone() != null && u.getPhone().equals(mentor.getPhone())))
                    .toList();
            if (!users.isEmpty()) {
                user = users.get(0);
            }
        }

        String newPassword = hemisIdGeneratorService.generatePassword();
        String identifier;

        if (user == null) {
            // User did not exist yet -> create one with new HEMIS ID
            identifier = hemisIdGeneratorService.generateMentorId();
            Set<Role> roles = new HashSet<>();
            roleRepository.findByName("MENTOR")
                    .or(() -> roleRepository.findByName("ROLE_MENTOR"))
                    .ifPresent(roles::add);

            user = User.builder()
                    .username(identifier)
                    .password(passwordEncoder.encode(newPassword))
                    .fullName(mentor.getFullName())
                    .phone(mentor.getPhone())
                    .email(mentor.getEmail() != null ? mentor.getEmail() : (identifier + "@mentor.axm-nexus.uz"))
                    .role("ROLE_MENTOR")
                    .roles(roles)
                    .enabled(true)
                    .emailVerified(true)
                    .build();
            userRepository.save(user);
        } else {
            identifier = user.getUsername();
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
        }

        try {
            auditService.logAction(
                    "MENTOR_PASSWORD_RESET",
                    "Mentor",
                    String.valueOf(mentor.getId()),
                    "admin",
                    "Mentor paroli qayta tiklandi: " + mentor.getFullName() + " (ID: " + identifier + ")"
            );
        } catch (Exception e) {
            log.warn("Audit xatosi: {}", e.getMessage());
        }

        return ResetPasswordResultDto.builder()
                .targetId(mentor.getId())
                .identifier(identifier)
                .fullName(mentor.getFullName())
                .newPassword(newPassword)
                .build();
    }

    public List<Mentor> searchMentors(String search, Long branchId, String status) {
        List<Mentor> mentors = mentorRepository.findAll();

        if (branchId != null) {
            mentors = mentors.stream()
                    .filter(m -> m.getBranch() != null && branchId.equals(m.getBranch().getId()))
                    .toList();
        }
        if (status != null && !status.isBlank() && !status.equalsIgnoreCase("all")) {
            mentors = mentors.stream()
                    .filter(m -> m.getStatus() != null && m.getStatus().equalsIgnoreCase(status))
                    .toList();
        }
        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            mentors = mentors.stream()
                    .filter(m -> (m.getFullName() != null && m.getFullName().toLowerCase().contains(q)) ||
                                 (m.getRole() != null && m.getRole().toLowerCase().contains(q)) ||
                                 (m.getEmail() != null && m.getEmail().toLowerCase().contains(q)) ||
                                 (m.getPhone() != null && m.getPhone().contains(q)))
                    .toList();
        }

        return mentors;
    }

    public MentorDetailDto getMentorDetailById(Long id) {
        Mentor mentor = mentorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor topilmadi: #" + id));
        return toDetailDto(mentor);
    }

    @Transactional
    public MentorDetailDto updateMentor(Long id, UpdateMentorRequest request, String actor) {
        Mentor mentor = mentorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor topilmadi: #" + id));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            mentor.setFullName(request.getFullName().trim());
        }
        if (request.getRole() != null && !request.getRole().isBlank()) {
            mentor.setRole(request.getRole().trim());
        }
        if (request.getPhone() != null) {
            mentor.setPhone(request.getPhone().trim());
        }
        if (request.getEmail() != null) {
            mentor.setEmail(request.getEmail().trim().toLowerCase());
        }
        if (request.getBio() != null) {
            mentor.setBio(request.getBio());
        }

        if (request.getBranchId() != null) {
            Branch branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: #" + request.getBranchId()));
            mentor.setBranch(branch);
            mentor.setBranchLocation(branch.getName());
        } else if (request.getBranchLocation() != null && !request.getBranchLocation().isBlank()) {
            mentor.setBranchLocation(request.getBranchLocation().trim());
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            applyStatus(mentor, request.getStatus());
        }

        Mentor saved = mentorRepository.save(mentor);

        // Sync linked user
        User user = saved.getUser();
        if (user != null) {
            user.setFullName(saved.getFullName());
            if (saved.getPhone() != null) user.setPhone(saved.getPhone());
            if (saved.getEmail() != null) user.setEmail(saved.getEmail());
            userRepository.save(user);
        }

        // Sync profile if present
        mentorProfileRepository.findByMentorId(saved.getId()).ifPresent(p -> {
            p.setDisplayName(saved.getFullName());
            p.setHeadline(saved.getRole() + " | " + saved.getBranchLocation());
            if (saved.getBio() != null) p.setBio(saved.getBio());
            if (saved.getPhone() != null) p.setPhone(saved.getPhone());
            if (saved.getEmail() != null) p.setEmail(saved.getEmail());
            p.setBranchLocation(saved.getBranchLocation());
            mentorProfileRepository.save(p);
        });

        auditService.logAction(
                "MENTOR_UPDATED",
                "Mentor",
                String.valueOf(saved.getId()),
                actor != null ? actor : "admin",
                "Mentor ma'lumotlari yangilandi: " + saved.getFullName()
        );

        return toDetailDto(saved);
    }

    @Transactional
    public MentorDetailDto updateMentorStatus(Long id, String status, String reason, String actor) {
        Mentor mentor = mentorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mentor topilmadi: #" + id));

        applyStatus(mentor, status);
        Mentor saved = mentorRepository.save(mentor);

        auditService.logAction(
                "MENTOR_STATUS_UPDATED",
                "Mentor",
                String.valueOf(saved.getId()),
                actor != null ? actor : "admin",
                "Mentor holati yangilandi (" + status + ")" + (reason != null ? ". Sabab: " + reason : "")
        );

        return toDetailDto(saved);
    }

    @Transactional
    public MentorDetailDto archiveMentor(Long id, String reason, String actor) {
        return updateMentorStatus(id, "ARCHIVED", reason != null ? reason : "Arxivlandi", actor);
    }

    private void applyStatus(Mentor mentor, String rawStatus) {
        String upper = rawStatus.trim().toUpperCase();
        if (upper.equals("ARCHIVED") || upper.equals("ARXIVLANGAN")) {
            mentor.setStatus("ARCHIVED");
            updateLinkedUserEnabled(mentor, false);
        } else if (upper.equals("INACTIVE") || upper.equals("NOFAOL")) {
            mentor.setStatus("INACTIVE");
            updateLinkedUserEnabled(mentor, false);
        } else {
            mentor.setStatus("ACTIVE");
            updateLinkedUserEnabled(mentor, true);
        }
    }

    private void updateLinkedUserEnabled(Mentor mentor, boolean enabled) {
        User user = mentor.getUser();
        if (user == null && mentor.getEmail() != null) {
            user = userRepository.findByEmailIgnoreCase(mentor.getEmail()).orElse(null);
        }
        if (user != null) {
            user.setEnabled(enabled);
            userRepository.save(user);
        }
    }

    public MentorDetailDto toDetailDto(Mentor mentor) {
        if (mentor == null) return null;

        User user = mentor.getUser();
        if (user == null && mentor.getEmail() != null) {
            user = userRepository.findByEmailIgnoreCase(mentor.getEmail()).orElse(null);
        }

        Long branchId = mentor.getBranch() != null ? mentor.getBranch().getId() : null;
        String branchName = mentor.getBranch() != null ? mentor.getBranch().getName() : mentor.getBranchLocation();

        List<StudyGroup> groups = studyGroupRepository.findByMentorId(mentor.getId());
        List<MentorDetailDto.AssignedGroupDto> groupDtos = groups.stream()
                .map(g -> MentorDetailDto.AssignedGroupDto.builder()
                        .id(g.getId())
                        .groupCode(g.getGroupCode())
                        .subject(g.getSubject())
                        .gradeLevel(g.getGradeLevel())
                        .studentCount(g.getStudentCount())
                        .scheduleDays(g.getScheduleDays())
                        .scheduleTime(g.getScheduleTime())
                        .status(g.getStatus())
                        .build())
                .toList();

        long activeGroups = groups.stream().filter(g -> "ACTIVE".equalsIgnoreCase(g.getStatus())).count();
        long activeStudents = studentRepository.findByMentorId(mentor.getId()).stream()
                .filter(s -> !"ARCHIVED".equalsIgnoreCase(s.getStatus()))
                .count();

        // Calculate approximate weekly hours (each active recurring schedule slot is ~1.5h)
        int weeklyHours = (int) (activeGroups * 4.5); // typically 3 sessions/week * 1.5h = 4.5h per cohort

        return MentorDetailDto.builder()
                .id(mentor.getId())
                .fullName(mentor.getFullName())
                .role(mentor.getRole())
                .phone(mentor.getPhone())
                .email(mentor.getEmail())
                .branchLocation(mentor.getBranchLocation())
                .branchId(branchId)
                .branchName(branchName)
                .bio(mentor.getBio())
                .status(mentor.getStatus() != null ? mentor.getStatus() : "ACTIVE")
                .username(user != null ? user.getUsername() : null)
                .accountEnabled(user != null && user.isEnabled())
                .activeGroupsCount((int) activeGroups)
                .activeStudentsCount((int) activeStudents)
                .weeklyHours(weeklyHours)
                .assignedGroups(groupDtos)
                .createdAt(mentor.getCreatedAt())
                .updatedAt(mentor.getUpdatedAt())
                .build();
    }
}
