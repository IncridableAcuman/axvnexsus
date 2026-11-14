package uz.axm.nexus.access.application;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.PageResponse;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.UserRepository;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RbacService rbacService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<UserDto> searchUsers(String query, String role, Boolean enabled, int page, int size, String sortBy, String sortDir) {
        List<User> allUsers = userRepository.findAll();

        // 1. Filter by query
        if (query != null && !query.trim().isBlank()) {
            String q = query.trim().toLowerCase();
            allUsers = allUsers.stream()
                    .filter(u -> (u.getFullName() != null && u.getFullName().toLowerCase().contains(q)) ||
                                 (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)) ||
                                 (u.getUsername() != null && u.getUsername().toLowerCase().contains(q)) ||
                                 (u.getPhone() != null && u.getPhone().contains(q)))
                    .collect(Collectors.toList());
        }

        // 2. Filter by role
        if (role != null && !role.trim().isBlank() && !role.equalsIgnoreCase("ALL")) {
            String target = rbacService.normalizeRoleName(role);
            allUsers = allUsers.stream()
                    .filter(u -> {
                        if (rbacService.normalizeRoleName(u.getRole()).equalsIgnoreCase(target)) return true;
                        return u.getRoles() != null && u.getRoles().stream()
                                .anyMatch(r -> rbacService.normalizeRoleName(r.getName()).equalsIgnoreCase(target));
                    })
                    .collect(Collectors.toList());
        }

        // 3. Filter by enabled status
        if (enabled != null) {
            allUsers = allUsers.stream()
                    .filter(u -> u.isEnabled() == enabled)
                    .collect(Collectors.toList());
        }

        // 4. Sort
        Comparator<User> comparator = Comparator.comparing(User::getId);
        if ("fullName".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(u -> u.getFullName() != null ? u.getFullName() : "");
        } else if ("email".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(u -> u.getEmail() != null ? u.getEmail() : "");
        } else if ("createdAt".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(u -> u.getCreatedAt() != null ? u.getCreatedAt() : java.time.LocalDateTime.MIN);
        }

        if ("desc".equalsIgnoreCase(sortDir)) {
            comparator = comparator.reversed();
        }
        allUsers.sort(comparator);

        // 5. Pagination
        int totalElements = allUsers.size();
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);

        List<UserDto> dtos = allUsers.subList(fromIndex, toIndex).stream()
                .map(rbacService::toUserDto)
                .collect(Collectors.toList());

        int totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 1;

        return PageResponse.<UserDto>builder()
                .content(dtos)
                .page(page)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .last(page >= totalPages - 1)
                .build();

    }

    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Foydalanuvchi topilmadi: #" + id));
        return rbacService.toUserDto(user);
    }

    @Transactional
    public UserProvisionDto createUser(CreateUserRequest request, String actorUsername) {
        String fullName = request.getFullName().trim();
        String primaryRole = rbacService.normalizeRoleName(request.getPrimaryRole());

        // Privilege escalation check: only SUPER_ADMIN can create another SUPER_ADMIN or ADMIN
        if (primaryRole.equals("SUPER_ADMIN") || primaryRole.equals("ADMIN")) {
            if (actorUsername != null && !actorUsername.equalsIgnoreCase("admin") && !actorUsername.equalsIgnoreCase("system")) {
                User actor = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(actorUsername, actorUsername).orElse(null);
                if (actor != null && !rbacService.isSuperAdmin(actor)) {
                    throw new BusinessException("Ruxsatsiz imtiyozlarni oshirish taqiqlanadi: Faqat Super Administrator administrator hisoblarini yarata oladi");
                }
            }
        }

        // Resolve username
        String username = request.getUsername();
        if (username == null || username.trim().isBlank()) {
            if (request.getEmail() != null && !request.getEmail().trim().isBlank()) {
                username = request.getEmail().trim().toLowerCase();
            } else {
                username = "staff_" + (System.currentTimeMillis() % 1000000);
            }
        } else {
            username = username.trim();
        }

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new BusinessException("Ushbu username (" + username + ") tizimda allaqachon mavjud");
        }

        if (request.getEmail() != null && !request.getEmail().trim().isBlank()) {
            String email = request.getEmail().trim().toLowerCase();
            if (userRepository.existsByEmailIgnoreCase(email)) {
                throw new BusinessException("Ushbu email (" + email + ") tizimda allaqachon mavjud");
            }
        }

        String rawPassword = request.getPassword();
        if (rawPassword == null || rawPassword.isBlank()) {
            rawPassword = "Staff@" + (100000 + (int)(Math.random() * 900000));
        }

        Set<String> roleNames = new HashSet<>();
        roleNames.add(primaryRole);
        if (request.getRoles() != null) {
            for (String r : request.getRoles()) {
                roleNames.add(rbacService.normalizeRoleName(r));
            }
        }

        Set<Role> roles = new HashSet<>();
        for (String rName : roleNames) {
            Role role = roleRepository.findByName(rName)
                    .orElseGet(() -> roleRepository.findByName("ROLE_" + rName)
                            .orElseThrow(() -> new BusinessException("Rol topilmadi: " + rName)));
            roles.add(role);
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .email(request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail().trim().toLowerCase() : null)
                .phone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null)
                .role("ROLE_" + primaryRole)
                .roles(roles)
                .enabled(true)
                .emailVerified(true)
                .build();

        User saved = userRepository.save(user);

        auditService.logAction(
                "USER_PROVISIONED",
                "User",
                String.valueOf(saved.getId()),
                actorUsername != null ? actorUsername : "ADMIN",
                "Yangi xodim hisobi yaratildi: " + fullName + " (" + username + ", rol: " + primaryRole + ")"
        );

        UserDto userDto = rbacService.toUserDto(saved);
        return UserProvisionDto.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .fullName(saved.getFullName())
                .email(saved.getEmail())
                .phone(saved.getPhone())
                .primaryRole(saved.getRole())
                .roles(userDto.getRoles())
                .effectivePermissions(userDto.getEffectivePermissions())
                .temporaryPassword(rawPassword)
                .enabled(saved.isEnabled())
                .createdAt(saved.getCreatedAt())
                .build();
    }
}
