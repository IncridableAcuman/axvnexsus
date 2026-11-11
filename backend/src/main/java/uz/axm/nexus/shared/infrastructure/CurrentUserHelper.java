package uz.axm.nexus.shared.infrastructure;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CurrentUserHelper {

    private final UserRepository userRepository;

    /**
     * Tizimga kirgan foydalanuvchi ob'ektini olish (agar autentifikatsiyadan o'tgan bo'lsa)
     */
    public Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String username = auth.getName();
            return userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(username, username);
        }
        return Optional.empty();
    }

    /**
     * Tizimga kirgan foydalanuvchini olish yoki unauthenticated xatolik tashlash (hech qanday default admin yo'q!)
     */
    public User requireCurrentUser() {
        return getCurrentUser()
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Autentifikatsiyadan o'tgan foydalanuvchi topilmadi. Tizimga kirish talab etiladi."));
    }

    /**
     * Joriy foydalanuvchining ID raqami.
     * Hech qanday 1L yoki admin fallback MAVJUD EMAS.
     */
    public Long getCurrentUserId() {
        return requireCurrentUser().getId();
    }

    /**
     * Joriy foydalanuvchining username yoki HEMIS ID si
     */
    public String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        throw new AuthenticationCredentialsNotFoundException("Autentifikatsiyadan o'tgan foydalanuvchi topilmadi.");
    }

    /**
     * Foydalanuvchi tizimga kirganligini tekshirish
     */
    public boolean isAuthenticated() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal());
    }

    /**
     * Rolni tekshirish (avval SecurityContext auth grantlaridan, so'ngra DB user ob'ektidan)
     */
    public boolean hasRole(String roleName) {
        if (roleName == null) return false;
        String clean = normalizeRole(roleName);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            for (GrantedAuthority ga : auth.getAuthorities()) {
                if (clean.equalsIgnoreCase(normalizeRole(ga.getAuthority()))) {
                    return true;
                }
            }
        }

        return getCurrentUser()
                .map(u -> {
                    if (clean.equalsIgnoreCase(normalizeRole(u.getRole()))) {
                        return true;
                    }
                    if (u.getRoles() != null) {
                        return u.getRoles().stream()
                                .anyMatch(r -> clean.equalsIgnoreCase(normalizeRole(r.getName())));
                    }
                    return false;
                })
                .orElse(false);
    }

    public boolean hasAnyRole(String... roleNames) {
        if (roleNames == null || roleNames.length == 0) return false;
        for (String r : roleNames) {
            if (hasRole(r)) return true;
        }
        return false;
    }

    /**
     * Ruxsatni tekshirish (avval SecurityContext auth grantlaridan, so'ngra DB role_permissions dan)
     */
    public boolean hasPermission(String permissionName) {
        if (permissionName == null) return false;
        if (isSuperAdmin()) return true;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            for (GrantedAuthority ga : auth.getAuthorities()) {
                if (permissionName.equalsIgnoreCase(ga.getAuthority())) {
                    return true;
                }
            }
        }

        return getCurrentUser()
                .map(u -> {
                    if (u.getRoles() != null) {
                        for (uz.axm.nexus.access.domain.Role r : u.getRoles()) {
                            if (r.getPermissions() != null) {
                                for (uz.axm.nexus.access.domain.Permission p : r.getPermissions()) {
                                    if (permissionName.equalsIgnoreCase(p.getName())) {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                    return false;
                })
                .orElse(false);
    }

    public boolean isSuperAdmin() {
        return hasAnyRole("SUPER_ADMIN", "ROLE_SUPER_ADMIN");
    }

    public boolean isAdmin() {
        return hasAnyRole("SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ADMIN", "ROLE_ADMIN", "PROGRAM_ADMIN", "ROLE_PROGRAM_ADMIN");
    }

    public boolean isMentor() {
        return hasAnyRole("MENTOR", "ROLE_MENTOR", "ENGLISH_MENTOR", "ROLE_ENGLISH_MENTOR");
    }

    public boolean isStudent() {
        return hasAnyRole("STUDENT", "ROLE_STUDENT");
    }

    private String normalizeRole(String role) {
        if (role == null) return "";
        String clean = role.trim().toUpperCase();
        if (clean.startsWith("ROLE_")) {
            return clean.substring(5);
        }
        return clean;
    }
}
