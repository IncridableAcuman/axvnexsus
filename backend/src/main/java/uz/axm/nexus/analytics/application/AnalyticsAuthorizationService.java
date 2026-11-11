package uz.axm.nexus.analytics.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsAuthorizationService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final MentorRepository mentorRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final CurrentUserHelper currentUserHelper;

    /**
     * Tizimga kirgan foydalanuvchini faqat va faqat SecurityContext orqali xavfsiz aniqlash.
     * Hech qanday soxtalashtiriluvchi HTTP headerlar (X-User-Role, X-User-Id) qabul qilinmaydi.
     */
    public User resolveCurrentUser() {
        return currentUserHelper.requireCurrentUser();
    }

    /**
     * Eski metod signaturasi bilan moslik uchun (header qiymatlari xavfsizlik maqsadida inkor etiladi)
     */
    public User resolveCurrentUser(String ignoredRole, Long ignoredUserId) {
        return resolveCurrentUser();
    }

    public void validateStudentAccess(Long targetStudentId, User requester) {
        if (requester == null) {
            throw new AuthenticationCredentialsNotFoundException("Autentifikatsiya talab etiladi.");
        }

        // Admins and Regional Coordinators have full access
        if (isAdminOrCoordinator(requester)) {
            return;
        }

        // Mentor can only view students in their assigned groups
        if (isMentor(requester)) {
            Student student = studentRepository.findById(targetStudentId)
                    .orElseThrow(() -> new IllegalArgumentException("O'quvchi topilmadi: " + targetStudentId));

            Mentor mentor = mentorRepository.findAll().stream()
                    .filter(m -> (m.getEmail() != null && m.getEmail().equalsIgnoreCase(requester.getEmail())) ||
                                 (m.getFullName() != null && m.getFullName().equalsIgnoreCase(requester.getFullName())))
                    .findFirst().orElse(null);

            if (mentor != null && student.getStudyGroup() != null && student.getStudyGroup().getMentor() != null) {
                if (student.getStudyGroup().getMentor().getId().equals(mentor.getId())) {
                    return;
                }
            }
            if (student.getMentor() != null && mentor != null && student.getMentor().getId().equals(mentor.getId())) {
                return;
            }

            throw new AccessDeniedException("Siz faqat o'zingizga biriktirilgan o'quvchilar hisobotini ko'rish huquqiga egasiz.");
        }

        // Student can ONLY view their own records
        String role = normalizeRole(requester.getRole());
        if ("STUDENT".equals(role)) {
            Student student = studentRepository.findById(targetStudentId)
                    .orElseThrow(() -> new IllegalArgumentException("O'quvchi topilmadi: " + targetStudentId));

            boolean matches = (student.getPinfl() != null && requester.getUsername().equalsIgnoreCase(student.getPinfl()))
                    || (student.getStudentIdNumber() != null && requester.getUsername().equalsIgnoreCase(student.getStudentIdNumber()))
                    || (student.getFullName() != null && student.getFullName().equalsIgnoreCase(requester.getFullName()));

            if (!matches) {
                throw new AccessDeniedException("O'quvchi faqat o'zining shaxsiy ko'rsatkichlarini ko'rishga ruxsat etilgan.");
            }
            return;
        }

        throw new AccessDeniedException("Ushbu hisobotni ko'rish uchun ruxsat mavjud emas.");
    }

    public void validateGroupAccess(Long targetGroupId, User requester) {
        if (requester == null) {
            throw new AuthenticationCredentialsNotFoundException("Autentifikatsiya talab etiladi.");
        }

        if (isAdminOrCoordinator(requester)) {
            return;
        }

        if (isMentor(requester)) {
            StudyGroup group = studyGroupRepository.findById(targetGroupId)
                    .orElseThrow(() -> new IllegalArgumentException("Guruh topilmadi: " + targetGroupId));

            Mentor mentor = mentorRepository.findAll().stream()
                    .filter(m -> (m.getEmail() != null && m.getEmail().equalsIgnoreCase(requester.getEmail())) ||
                                 (m.getFullName() != null && m.getFullName().equalsIgnoreCase(requester.getFullName())))
                    .findFirst().orElse(null);

            if (mentor != null && group.getMentor() != null && group.getMentor().getId().equals(mentor.getId())) {
                return;
            }

            throw new AccessDeniedException("Siz faqat o'zingiz mas'ul bo'lgan guruh hisobotlarini ko'rishingiz mumkin.");
        }

        String role = normalizeRole(requester.getRole());
        if ("STUDENT".equals(role)) {
            throw new AccessDeniedException("O'quvchilar to'liq guruh reytingi va hisobotlarini yuklab olish huquqiga ega emas.");
        }

        throw new AccessDeniedException("Ushbu guruh hisobotini ko'rish uchun ruxsat mavjud emas.");
    }

    public boolean isAdminOrCoordinator(User requester) {
        if (requester == null) return false;
        if (isAdminOrCoordinatorRole(requester.getRole())) return true;
        if (requester.getRoles() != null) {
            return requester.getRoles().stream()
                    .anyMatch(r -> isAdminOrCoordinatorRole(r.getName()));
        }
        return false;
    }

    private boolean isAdminOrCoordinatorRole(String role) {
        String clean = normalizeRole(role);
        return "SUPER_ADMIN".equals(clean) || "ADMIN".equals(clean) || "PROGRAM_ADMIN".equals(clean)
                || "REGIONAL_COORDINATOR".equals(clean) || "COORDINATOR".equals(clean) || "CONTENT_MANAGER".equals(clean);
    }

    public boolean isMentor(User requester) {
        if (requester == null) return false;
        String role = normalizeRole(requester.getRole());
        if ("MENTOR".equals(role) || "ENGLISH_MENTOR".equals(role)) return true;
        if (requester.getRoles() != null) {
            return requester.getRoles().stream()
                    .anyMatch(r -> {
                        String clean = normalizeRole(r.getName());
                        return "MENTOR".equals(clean) || "ENGLISH_MENTOR".equals(clean);
                    });
        }
        return false;
    }

    private String normalizeRole(String role) {
        if (role == null) return "STUDENT";
        String clean = role.toUpperCase().trim();
        if (clean.startsWith("ROLE_")) {
            clean = clean.substring(5);
        }
        return clean;
    }
}
