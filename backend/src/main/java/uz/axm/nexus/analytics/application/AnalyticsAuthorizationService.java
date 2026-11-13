package uz.axm.nexus.analytics.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsAuthorizationService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final MentorRepository mentorRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final CurrentUserHelper currentUserHelper;
    private final ResourceOwnershipService resourceOwnershipService;

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
        resourceOwnershipService.verifyStudentAccess(targetStudentId);
    }

    public void validateGroupAccess(Long targetGroupId, User requester) {
        if (requester == null) {
            throw new AuthenticationCredentialsNotFoundException("Autentifikatsiya talab etiladi.");
        }
        resourceOwnershipService.verifyGroupAccess(targetGroupId);
    }

    public void validateMentorAccess(Long targetMentorId, User requester) {
        if (requester == null) {
            throw new AuthenticationCredentialsNotFoundException("Autentifikatsiya talab etiladi.");
        }
        if (isAdminOrCoordinator(requester)) {
            return;
        }
        if (isMentor(requester)) {
            Optional<Mentor> mentorOpt = resourceOwnershipService.getCurrentMentor();
            if (mentorOpt.isPresent() && mentorOpt.get().getId().equals(targetMentorId)) {
                return;
            }
            throw new AccessDeniedException("Siz faqat o'zingizning mentorlik faoliyatingiz hisobotini ko'rishingiz mumkin.");
        }
        throw new AccessDeniedException("Ushbu hisobotni ko'rish uchun ruxsat mavjud emas.");
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
