package uz.axm.nexus.shared.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorProfileRepository;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceOwnershipService {

    private final CurrentUserHelper currentUserHelper;
    private final StudentRepository studentRepository;
    private final MentorRepository mentorRepository;
    private final MentorProfileRepository mentorProfileRepository;
    private final StudyGroupRepository studyGroupRepository;

    /**
     * Tizimga kirgan foydalanuvchiga tegishli o'quvchi (Student) profilini topish
     */
    public Optional<Student> getCurrentStudent() {
        Optional<User> userOpt = currentUserHelper.getCurrentUser();
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        User user = userOpt.get();

        // 1. Direct indexed foreign key lookup (Milestone 03 optimization)
        if (user.getId() != null) {
            Optional<Student> byUserId = studentRepository.findByUserId(user.getId());
            if (byUserId.isPresent()) return byUserId;
        }

        // 2. HEMIS student ID yoki PINFL orqali qidirish
        if (user.getUsername() != null) {
            Optional<Student> byIdNum = studentRepository.findByStudentIdNumber(user.getUsername());
            if (byIdNum.isPresent()) {
                linkStudentUserIfMissing(byIdNum.get(), user);
                return byIdNum;
            }

            Optional<Student> byPinfl = studentRepository.findByPinfl(user.getUsername());
            if (byPinfl.isPresent()) {
                linkStudentUserIfMissing(byPinfl.get(), user);
                return byPinfl;
            }
        }

        // 3. FIO orqali qidirish
        if (user.getFullName() != null) {
            Optional<Student> byName = studentRepository.findByFullNameIgnoreCase(user.getFullName());
            if (byName.isPresent()) {
                linkStudentUserIfMissing(byName.get(), user);
                return byName;
            }
        }

        // 4. Telefon raqam orqali
        if (user.getPhone() != null) {
            Optional<Student> byPhone = studentRepository.findAll().stream()
                    .filter(s -> user.getPhone().equals(s.getPhone()))
                    .findFirst();
            if (byPhone.isPresent()) {
                linkStudentUserIfMissing(byPhone.get(), user);
                return byPhone;
            }
        }

        return Optional.empty();
    }

    private void linkStudentUserIfMissing(Student student, User user) {
        if (student.getUser() == null && user.getId() != null) {
            try {
                student.setUser(user);
                studentRepository.save(student);
            } catch (Exception e) {
                log.debug("O'quvchi profiliga user bog'lashda istisno: {}", e.getMessage());
            }
        }
    }

    /**
     * Tizimga kirgan foydalanuvchiga tegishli o'quvchi profilini olish yoki 404/xatolik tashlash
     */
    public Student requireCurrentStudent() {
        return getCurrentStudent()
                .orElseThrow(() -> new ResourceNotFoundException("Tizimga kirgan foydalanuvchiga biriktirilgan o'quvchi profili topilmadi"));
    }

    /**
     * Tizimga kirgan foydalanuvchiga tegishli mentor (Mentor) profilini topish
     */
    public Optional<Mentor> getCurrentMentor() {
        Optional<User> userOpt = currentUserHelper.getCurrentUser();
        if (userOpt.isEmpty()) {
            return Optional.empty();
        }
        User user = userOpt.get();

        // 1. Direct indexed foreign key lookup (Milestone 03 optimization)
        if (user.getId() != null) {
            Optional<Mentor> byUserId = mentorRepository.findByUserId(user.getId());
            if (byUserId.isPresent()) return byUserId;
        }

        // 2. MentorProfile orqali
        if (user.getId() != null) {
            var profileOpt = mentorProfileRepository.findByUserId(user.getId());
            if (profileOpt.isPresent() && profileOpt.get().getMentor() != null) {
                return Optional.of(profileOpt.get().getMentor());
            }
        }

        // 2. Email orqali
        if (user.getEmail() != null) {
            Optional<Mentor> byEmail = mentorRepository.findAll().stream()
                    .filter(m -> user.getEmail().equalsIgnoreCase(m.getEmail()))
                    .findFirst();
            if (byEmail.isPresent()) return byEmail;
        }

        // 3. FIO orqali
        if (user.getFullName() != null) {
            return mentorRepository.findAll().stream()
                    .filter(m -> user.getFullName().equalsIgnoreCase(m.getFullName()))
                    .findFirst();
        }

        return Optional.empty();
    }

    /**
     * O'quvchi resurslariga (baholar, davomat, test urinishlari) kirish huquqini tekshirish.
     * Ruxsatsiz bo'lsa AccessDeniedException tashlaydi.
     */
    public void verifyStudentAccess(Long targetStudentId) {
        if (targetStudentId == null) {
            throw new IllegalArgumentException("O'quvchi ID raqami kiritilmagan");
        }

        // Administratorlar to'liq huquqqa ega
        if (currentUserHelper.isAdmin() || currentUserHelper.hasRole("REGIONAL_COORDINATOR") || currentUserHelper.hasRole("COORDINATOR")) {
            return;
        }

        // Mentor faqat o'z guruhidagi yoki biriktirilgan o'quvchilarga kira oladi
        if (currentUserHelper.isMentor()) {
            Optional<Mentor> mentorOpt = getCurrentMentor();
            if (mentorOpt.isPresent()) {
                Mentor mentor = mentorOpt.get();
                Student student = studentRepository.findById(targetStudentId)
                        .orElseThrow(() -> new ResourceNotFoundException("O'quvchi topilmadi: " + targetStudentId));

                if (student.getMentor() != null && student.getMentor().getId().equals(mentor.getId())) {
                    return;
                }
                if (student.getStudyGroup() != null && student.getStudyGroup().getMentor() != null
                        && student.getStudyGroup().getMentor().getId().equals(mentor.getId())) {
                    return;
                }
            }
            throw new AccessDeniedException("Siz faqat o'zingizga biriktirilgan o'quvchilar ma'lumotlarini ko'rish huquqiga egasiz.");
        }

        // O'quvchi FAQAT o'z ma'lumotlarini ko'rishi mumkin
        if (currentUserHelper.isStudent()) {
            Optional<Student> studentOpt = getCurrentStudent();
            if (studentOpt.isPresent() && studentOpt.get().getId().equals(targetStudentId)) {
                return;
            }
            throw new AccessDeniedException("O'quvchi faqat o'zining shaxsiy ma'lumotlariga kirish huquqiga ega.");
        }

        throw new AccessDeniedException("Ushbu resursga kirish uchun yetarli huquq mavjud emas.");
    }

    /**
     * Guruh resurslariga (davomat, hisobotlar, a'zolar) kirish huquqini tekshirish.
     */
    public void verifyGroupAccess(Long targetGroupId) {
        if (targetGroupId == null) {
            throw new IllegalArgumentException("Guruh ID raqami kiritilmagan");
        }

        if (currentUserHelper.isAdmin() || currentUserHelper.hasRole("REGIONAL_COORDINATOR") || currentUserHelper.hasRole("COORDINATOR")) {
            return;
        }

        StudyGroup group = studyGroupRepository.findById(targetGroupId)
                .orElseThrow(() -> new ResourceNotFoundException("Guruh topilmadi: " + targetGroupId));

        if (currentUserHelper.isMentor()) {
            Optional<Mentor> mentorOpt = getCurrentMentor();
            if (mentorOpt.isPresent() && group.getMentor() != null && group.getMentor().getId().equals(mentorOpt.get().getId())) {
                return;
            }
            throw new AccessDeniedException("Siz faqat o'zingizga biriktirilgan guruhlar ma'lumotlarini ko'rish yoki boshqarish huquqiga egasiz.");
        }

        if (currentUserHelper.isStudent()) {
            Optional<Student> studentOpt = getCurrentStudent();
            if (studentOpt.isPresent() && studentOpt.get().getStudyGroup() != null
                    && studentOpt.get().getStudyGroup().getId().equals(targetGroupId)) {
                return;
            }
            throw new AccessDeniedException("O'quvchi faqat o'zi a'zo bo'lgan guruh ma'lumotlariga kirish huquqiga ega.");
        }

        throw new AccessDeniedException("Guruh ma'lumotlariga kirish uchun yetarli huquq mavjud emas.");
    }

    /**
     * Berilgan targetStudentId joriy foydalanuvchining o'zimi yoki yo'qligini tekshirish
     */
    public boolean isStudentOwner(Long targetStudentId) {
        if (targetStudentId == null) return false;
        return getCurrentStudent().map(s -> s.getId().equals(targetStudentId)).orElse(false);
    }

    /**
     * Filial resurslariga kirish huquqini tekshirish.
     */
    public void verifyBranchAccess(Long targetBranchId) {
        if (targetBranchId == null) {
            throw new IllegalArgumentException("Filial ID raqami kiritilmagan");
        }

        if (currentUserHelper.isAdmin() || currentUserHelper.hasRole("PROGRAM_ADMIN")
                || currentUserHelper.hasRole("REGIONAL_COORDINATOR") || currentUserHelper.hasRole("COORDINATOR")
                || currentUserHelper.hasRole("OBSERVER")) {
            return;
        }

        if (currentUserHelper.isMentor()) {
            Optional<Mentor> mentorOpt = getCurrentMentor();
            if (mentorOpt.isPresent() && mentorOpt.get().getBranch() != null
                    && mentorOpt.get().getBranch().getId().equals(targetBranchId)) {
                return;
            }
            return;
        }

        if (currentUserHelper.isStudent()) {
            Optional<Student> studentOpt = getCurrentStudent();
            if (studentOpt.isPresent() && studentOpt.get().getBranch() != null
                    && studentOpt.get().getBranch().getId().equals(targetBranchId)) {
                return;
            }
            return;
        }

        throw new AccessDeniedException("Filial ma'lumotlariga kirish uchun yetarli huquq mavjud emas.");
    }
}
