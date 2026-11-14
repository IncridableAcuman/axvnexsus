package uz.axm.nexus.scheduling.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.branches.infrastructure.BranchRepository;
import uz.axm.nexus.classrooms.application.StudyGroupService;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.mentors.application.MentorService;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.domain.AcademicWeekday;
import uz.axm.nexus.scheduling.domain.DayPattern;
import uz.axm.nexus.scheduling.domain.DayPatternResolver;
import uz.axm.nexus.scheduling.domain.Schedule;
import uz.axm.nexus.scheduling.infrastructure.ScheduleRepository;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.application.StudentDto;
import uz.axm.nexus.users.application.StudentService;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final MentorService mentorService;
    private final StudyGroupService studyGroupService;
    private final StudentService studentService;
    private final BranchRepository branchRepository;
    private final MentorRepository mentorRepository;
    private final CurrentUserHelper currentUserHelper;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<Schedule> getAllSchedules() {
        return scheduleRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Schedule> getByGradeLevel(String gradeLevel) {
        return scheduleRepository.findByGradeLevel(gradeLevel);
    }

    @Transactional(readOnly = true)
    public List<Schedule> getByMentorId(Long mentorId) {
        return scheduleRepository.findByMentorId(mentorId);
    }

    @Transactional(readOnly = true)
    public Optional<Schedule> findById(Long id) {
        return scheduleRepository.findById(id);
    }

    @Transactional
    public Schedule createManualSchedule(ManualScheduleRequest req) {
        // 1. Resolve DayPattern and Weekdays
        DayPattern pattern = resolvePattern(req);
        List<AcademicWeekday> weekdays = resolveWeekdays(pattern, req);

        String canonicalDays = DayPatternResolver.formatCanonicalDays(weekdays);
        String patternString = pattern.name();

        // 2. Validate Time Range
        String startTime = (req.getStartTime() != null && !req.getStartTime().isBlank()) ? req.getStartTime().trim() : "15:00";
        String endTime = (req.getEndTime() != null && !req.getEndTime().isBlank()) ? req.getEndTime().trim() : "16:30";
        DayPatternResolver.validateTimeRange(startTime, endTime);

        // 3. Resolve Branch
        Branch branch = resolveBranch(req.getBranchId(), req.getBranchLocation());
        String branchLocation = (branch != null) ? branch.getName() :
                (req.getBranchLocation() != null && !req.getBranchLocation().isBlank() ? req.getBranchLocation().trim() : "IT Park Yangiariq");

        // 4. Validate Branch-level Authorization
        validateBranchAuthorization(branch, branchLocation);

        // 5. Resolve Mentor and StudyGroup
        Mentor mentor = mentorService.getOrCreate(
                req.getMentorName(),
                req.getMentorRole(),
                branchLocation
        );
        if (branch != null && mentor.getBranch() == null) {
            mentor.setBranch(branch);
        }

        StudyGroup group = studyGroupService.getOrCreate(
                req.getGroupCode(),
                req.getGradeLevel(),
                req.getSubject(),
                mentor,
                branchLocation,
                canonicalDays,
                startTime + "-" + endTime,
                req.getRoom() != null ? req.getRoom().trim() : "IT Lab 1",
                patternString,
                branch
        );

        String room = (req.getRoom() != null && !req.getRoom().isBlank()) ? req.getRoom().trim() : "IT Lab 1";

        // 6. Comprehensive Conflict Detection (Mentor, Room, Group, Weekdays, Time)
        checkConflicts(null, mentor, group, room, weekdays, startTime, endTime);

        // 7. Persist Schedule
        Schedule schedule = Schedule.builder()
                .mentor(mentor)
                .studyGroup(group)
                .gradeLevel(req.getGradeLevel() != null ? req.getGradeLevel() : "8-sinf")
                .subject(req.getSubject() != null ? req.getSubject() : "Web Full-Stack Development")
                .days(canonicalDays)
                .dayPattern(patternString)
                .startTime(startTime)
                .endTime(endTime)
                .room(room)
                .branchLocation(branchLocation)
                .branch(branch)
                .academicYear("2026-2027")
                .topic(req.getTopic())
                .durationMinutes(80)
                .build();

        Schedule savedSchedule = scheduleRepository.save(schedule);

        // 8. Associate Students if provided
        if (req.getStudents() != null && !req.getStudents().isEmpty()) {
            for (StudentDto s : req.getStudents()) {
                if (s.getFullName() != null && !s.getFullName().isBlank()) {
                    studentService.saveOrUpdate(
                            s.getFullName(),
                            s.getPinfl(),
                            s.getStudentIdNumber(),
                            s.getDistrict(),
                            req.getGradeLevel(),
                            branchLocation,
                            s.getPhone(),
                            group,
                            mentor
                    );
                }
            }
            int total = studentService.getByGroupId(group.getId()).size();
            studyGroupService.updateStudentCount(group.getId(), total);
        }

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("SCHEDULE_CREATED", "Schedule", String.valueOf(savedSchedule.getId()), actor,
                "Dars jadvali yaratildi: " + savedSchedule.getSubject() + " (" + canonicalDays + " " + startTime + "-" + endTime + ")");

        return savedSchedule;
    }

    @Transactional
    public Schedule updateSchedule(Long id, ManualScheduleRequest req) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + id));

        // 1. Resolve DayPattern and Weekdays
        DayPattern pattern = resolvePattern(req);
        List<AcademicWeekday> weekdays = resolveWeekdays(pattern, req);

        String canonicalDays = DayPatternResolver.formatCanonicalDays(weekdays);
        String patternString = pattern.name();

        // 2. Validate Time Range
        String startTime = (req.getStartTime() != null && !req.getStartTime().isBlank()) ? req.getStartTime().trim() : schedule.getStartTime();
        String endTime = (req.getEndTime() != null && !req.getEndTime().isBlank()) ? req.getEndTime().trim() : schedule.getEndTime();
        DayPatternResolver.validateTimeRange(startTime, endTime);

        // 3. Resolve Branch
        Branch branch = resolveBranch(req.getBranchId(), req.getBranchLocation());
        if (branch == null) {
            branch = schedule.getBranch();
        }
        String branchLocation = (branch != null) ? branch.getName() :
                (req.getBranchLocation() != null && !req.getBranchLocation().isBlank() ? req.getBranchLocation().trim() : schedule.getBranchLocation());

        // 4. Validate Branch Authorization
        validateBranchAuthorization(branch, branchLocation);

        // 5. Resolve Mentor and StudyGroup
        Mentor mentor = (req.getMentorName() != null && !req.getMentorName().isBlank())
                ? mentorService.getOrCreate(req.getMentorName(), req.getMentorRole(), branchLocation)
                : schedule.getMentor();

        StudyGroup group = (req.getGroupCode() != null && !req.getGroupCode().isBlank())
                ? studyGroupService.getOrCreate(
                        req.getGroupCode(),
                        req.getGradeLevel(),
                        req.getSubject(),
                        mentor,
                        branchLocation,
                        canonicalDays,
                        startTime + "-" + endTime,
                        req.getRoom() != null ? req.getRoom().trim() : schedule.getRoom(),
                        patternString,
                        branch
                )
                : schedule.getStudyGroup();

        String room = (req.getRoom() != null && !req.getRoom().isBlank()) ? req.getRoom().trim() : schedule.getRoom();

        // 6. Comprehensive Conflict Detection (excluding current schedule)
        checkConflicts(schedule.getId(), mentor, group, room, weekdays, startTime, endTime);

        // 7. Update attributes
        schedule.setMentor(mentor);
        schedule.setStudyGroup(group);
        if (req.getGradeLevel() != null) schedule.setGradeLevel(req.getGradeLevel());
        if (req.getSubject() != null) schedule.setSubject(req.getSubject());
        schedule.setDays(canonicalDays);
        schedule.setDayPattern(patternString);
        schedule.setStartTime(startTime);
        schedule.setEndTime(endTime);
        schedule.setRoom(room);
        schedule.setBranchLocation(branchLocation);
        schedule.setBranch(branch);
        if (req.getTopic() != null) schedule.setTopic(req.getTopic());

        Schedule updated = scheduleRepository.save(schedule);

        // Also update study group days and time
        if (group != null) {
            group.setScheduleDays(canonicalDays);
            group.setDayPattern(patternString);
            group.setScheduleTime(startTime + "-" + endTime);
            if (room != null) group.setRoom(room);
            studyGroupService.getOrCreate(group.getGroupCode(), group.getGradeLevel(), group.getSubject(),
                    mentor, branchLocation, canonicalDays, startTime + "-" + endTime, room, patternString, branch);
        }

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("SCHEDULE_UPDATED", "Schedule", String.valueOf(updated.getId()), actor,
                "Dars jadvali yangilandi: " + updated.getSubject() + " (" + canonicalDays + " " + startTime + "-" + endTime + ")");

        return updated;
    }

    @Transactional
    public void deleteSchedule(Long id) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + id));

        scheduleRepository.delete(schedule);

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("SCHEDULE_DELETED", "Schedule", String.valueOf(id), actor,
                "Dars jadvali o'chirildi: #" + id + " (" + schedule.getSubject() + " " + schedule.getDays() + ")");
    }

    private DayPattern resolvePattern(ManualScheduleRequest req) {
        if (req.getDayPattern() != null && !req.getDayPattern().isBlank()) {
            try {
                return DayPattern.valueOf(req.getDayPattern().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BusinessException("Noto'g'ri dars kunlari turi: '" + req.getDayPattern() + "'. Ruxsat etilgan: ODD_DAYS, EVEN_DAYS, ALL_SIX_DAYS, CUSTOM");
            }
        }
        if (req.getSelectedDays() != null && !req.getSelectedDays().isEmpty()) {
            return DayPattern.CUSTOM;
        }
        if (req.getDays() != null && !req.getDays().isBlank()) {
            List<AcademicWeekday> parsed = DayPatternResolver.parseWeekdays(req.getDays());
            if (!parsed.isEmpty()) {
                return DayPatternResolver.inferPattern(parsed);
            }
        }
        return DayPattern.ODD_DAYS;
    }

    private List<AcademicWeekday> resolveWeekdays(DayPattern pattern, ManualScheduleRequest req) {
        if (pattern == DayPattern.CUSTOM) {
            if (req.getSelectedDays() != null && !req.getSelectedDays().isEmpty()) {
                return DayPatternResolver.resolveCustomDays(req.getSelectedDays());
            } else if (req.getDays() != null && !req.getDays().isBlank()) {
                List<AcademicWeekday> parsed = DayPatternResolver.parseWeekdays(req.getDays());
                if (parsed.isEmpty()) {
                    throw new BusinessException("Maxsus kunlar tanlanganda kamida bitta dars kuni tanlanishi shart!");
                }
                return parsed;
            } else {
                throw new BusinessException("Maxsus kunlar tanlanganda kamida bitta dars kuni tanlanishi shart!");
            }
        }
        return DayPatternResolver.resolve(pattern, req.getSelectedDays());
    }

    private Branch resolveBranch(Long branchId, String branchLocation) {
        if (branchId != null) {
            return branchRepository.findById(branchId)
                    .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: #" + branchId));
        }
        if (branchLocation != null && !branchLocation.isBlank()) {
            String loc = branchLocation.trim();
            return branchRepository.findByNameIgnoreCase(loc)
                    .or(() -> branchRepository.findFirstByNameContainingIgnoreCase(loc))
                    .or(() -> branchRepository.findByCodeIgnoreCase(loc))
                    .orElse(null);
        }
        return null;
    }

    private void validateBranchAuthorization(Branch targetBranch, String targetBranchLocation) {
        if (!currentUserHelper.isAuthenticated()) return;
        if (currentUserHelper.isSuperAdmin() || currentUserHelper.isAdmin()) return;

        currentUserHelper.getCurrentUser().ifPresent(user -> {
            mentorRepository.findByUserId(user.getId()).ifPresent(mentor -> {
                if (mentor.getBranch() != null && targetBranch != null) {
                    if (!mentor.getBranch().getId().equals(targetBranch.getId())) {
                        throw new BusinessException("Sizda boshqa filial (" + targetBranch.getName() + ") uchun dars jadvali yaratish huquqi yo'q!");
                    }
                } else if (mentor.getBranchLocation() != null && targetBranchLocation != null) {
                    if (!mentor.getBranchLocation().trim().equalsIgnoreCase(targetBranchLocation.trim())) {
                        throw new BusinessException("Sizda boshqa filial (" + targetBranchLocation + ") uchun dars jadvali yaratish huquqi yo'q!");
                    }
                }
            });
        });
    }

    private void checkConflicts(Long excludeScheduleId, Mentor mentor, StudyGroup group, String room,
                                List<AcademicWeekday> weekdays, String startTime, String endTime) {
        List<Schedule> allSchedules = scheduleRepository.findAll();

        for (Schedule s : allSchedules) {
            if (excludeScheduleId != null && s.getId().equals(excludeScheduleId)) {
                continue;
            }

            // Existing schedule weekdays
            List<AcademicWeekday> existingDays = DayPatternResolver.parseWeekdays(s.getDays());
            if (!DayPatternResolver.hasWeekdayOverlap(weekdays, existingDays)) {
                // No overlapping weekday (e.g. ODD_DAYS vs EVEN_DAYS) -> no conflict!
                continue;
            }

            // Find overlapping weekday
            AcademicWeekday overlappingDay = weekdays.stream()
                    .filter(existingDays::contains)
                    .findFirst()
                    .orElse(null);

            if (overlappingDay == null) continue;

            // Check time overlap
            if (!DayPatternResolver.isTimeOverlap(startTime, endTime, s.getStartTime(), s.getEndTime())) {
                continue;
            }

            // 1. Mentor conflict
            if (mentor != null && s.getMentor() != null) {
                boolean sameMentor = (mentor.getId() != null && mentor.getId().equals(s.getMentor().getId())) ||
                        (mentor.getFullName() != null && mentor.getFullName().trim().equalsIgnoreCase(s.getMentor().getFullName().trim()));
                if (sameMentor) {
                    String grpCode = (s.getStudyGroup() != null) ? s.getStudyGroup().getGroupCode() : "Boshqa guruh";
                    String msg = "Mentor (" + mentor.getFullName() + ") uchun " +
                            overlappingDay.getUzbekName() + " kuni darslar vaqtida to'qnashuv (Conflict) mavjud! " +
                            "Mentor ushbu vaqtda boshqa darsga ega (" + grpCode + ": " + s.getStartTime() + " - " + s.getEndTime() + ")";
                    ConflictDetailDto detail = ConflictDetailDto.builder()
                            .type("MENTOR")
                            .weekday(overlappingDay.name())
                            .resourceName(mentor.getFullName())
                            .existingGroupCode(grpCode)
                            .startTime(s.getStartTime())
                            .endTime(s.getEndTime())
                            .build();
                    throw new ScheduleConflictException(msg, List.of(detail));
                }
            }

            // 2. Room conflict
            if (room != null && !room.isBlank() && s.getRoom() != null && !s.getRoom().isBlank()) {
                if (room.trim().equalsIgnoreCase(s.getRoom().trim())) {
                    String grpCode = (s.getStudyGroup() != null) ? s.getStudyGroup().getGroupCode() : "boshqa dars";
                    String msg = "Xona (" + room.trim() + ") " +
                            overlappingDay.getUzbekName() + " kuni band! Unda " + grpCode + " darsi mavjud (" +
                            s.getStartTime() + " - " + s.getEndTime() + ")";
                    ConflictDetailDto detail = ConflictDetailDto.builder()
                            .type("CLASSROOM")
                            .weekday(overlappingDay.name())
                            .resourceName(room.trim())
                            .existingGroupCode(grpCode)
                            .startTime(s.getStartTime())
                            .endTime(s.getEndTime())
                            .build();
                    throw new ScheduleConflictException(msg, List.of(detail));
                }
            }

            // 3. Group conflict
            if (group != null && s.getStudyGroup() != null) {
                boolean sameGroup = (group.getId() != null && group.getId().equals(s.getStudyGroup().getId())) ||
                        (group.getGroupCode() != null && group.getGroupCode().trim().equalsIgnoreCase(s.getStudyGroup().getGroupCode().trim()));
                if (sameGroup) {
                    String msg = "Guruh (" + group.getGroupCode() + ") uchun " +
                            overlappingDay.getUzbekName() + " kuni ushbu vaqtda boshqa dars mavjud (" +
                            s.getStartTime() + " - " + s.getEndTime() + ")";
                    ConflictDetailDto detail = ConflictDetailDto.builder()
                            .type("GROUP")
                            .weekday(overlappingDay.name())
                            .resourceName(group.getGroupCode())
                            .existingGroupCode(group.getGroupCode())
                            .startTime(s.getStartTime())
                            .endTime(s.getEndTime())
                            .build();
                    throw new ScheduleConflictException(msg, List.of(detail));
                }
            }
        }
    }
}
