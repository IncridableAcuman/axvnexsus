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
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.application.MentorService;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.domain.*;
import uz.axm.nexus.scheduling.infrastructure.AcademicHolidayRepository;
import uz.axm.nexus.scheduling.infrastructure.AttendanceRecordRepository;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.scheduling.infrastructure.ScheduleRepository;
import uz.axm.nexus.scheduling.infrastructure.TimeSlotRepository;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
import uz.axm.nexus.shared.infrastructure.CurrentUserHelper;
import uz.axm.nexus.users.application.StudentDto;
import uz.axm.nexus.users.application.StudentService;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final MentorService mentorService;
    private final StudyGroupService studyGroupService;
    private final StudyGroupRepository studyGroupRepository;
    private final StudentService studentService;
    private final BranchRepository branchRepository;
    private final MentorRepository mentorRepository;
    private final CurrentUserHelper currentUserHelper;
    private final AuditService auditService;
    private final RecurringScheduleGenerator recurringScheduleGenerator;
    private final TimeSlotRepository timeSlotRepository;
    private final LessonSessionRepository lessonSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AcademicHolidayRepository academicHolidayRepository;

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
    public List<Schedule> getByBranchId(Long branchId) {
        return scheduleRepository.findByBranchId(branchId);
    }

    @Transactional(readOnly = true)
    public List<Schedule> getByStatus(String status) {
        return scheduleRepository.findByStatus(status);
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

        // 2. Resolve Shift / Time Slot and Times
        TimeSlot timeSlot = resolveTimeSlot(
                req.getTimeSlotId() != null ? req.getTimeSlotId() : req.getShiftId(),
                req.getStartTime(),
                req.getEndTime()
        );
        String startTime = (req.getStartTime() != null && !req.getStartTime().isBlank())
                ? req.getStartTime().trim()
                : (timeSlot != null ? timeSlot.getStartTime() : "15:00");
        String endTime = (req.getEndTime() != null && !req.getEndTime().isBlank())
                ? req.getEndTime().trim()
                : (timeSlot != null ? timeSlot.getEndTime() : "16:30");
        DayPatternResolver.validateTimeRange(startTime, endTime);

        // 3. Resolve Dates
        LocalDate startDate = req.getStartDate() != null ? req.getStartDate() : LocalDate.now();
        LocalDate endDate = req.getEndDate() != null ? req.getEndDate() : startDate.plusMonths(3);
        if (startDate.isAfter(endDate)) {
            throw new BusinessException("Boshlanish sanasi tugash sanasidan oldin bo'lishi kerak (" + startDate + " > " + endDate + ")");
        }

        // 4. Resolve Branch
        Branch branch = resolveBranch(req.getBranchId(), req.getBranchLocation());
        String branchLocation = (branch != null) ? branch.getName() :
                (req.getBranchLocation() != null && !req.getBranchLocation().isBlank() ? req.getBranchLocation().trim() : "IT Park Yangiariq");

        // 5. Validate Branch-level Authorization
        validateBranchAuthorization(branch, branchLocation);

        // 6. Resolve Mentor and StudyGroup
        Mentor mentor = (req.getMentorId() != null)
                ? mentorRepository.findById(req.getMentorId()).orElse(null)
                : null;
        if (mentor == null) {
            mentor = mentorService.getOrCreate(
                    req.getMentorName(),
                    req.getMentorRole(),
                    branchLocation
            );
        }
        if (branch != null && mentor.getBranch() == null) {
            mentor.setBranch(branch);
        }

        StudyGroup group = (req.getGroupId() != null)
                ? studyGroupRepository.findById(req.getGroupId()).orElse(null)
                : null;
        if (group == null) {
            group = studyGroupService.getOrCreate(
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
        }

        String room = (req.getRoom() != null && !req.getRoom().isBlank()) ? req.getRoom().trim() : "IT Lab 1";

        // 7. Comprehensive Conflict Detection (Recurring Pattern + Concrete Dates)
        checkConflicts(null, mentor, group, room, weekdays, startTime, endTime);

        RecurringScheduleGenerator.DateCalculationResult dateCalc = recurringScheduleGenerator.calculateDates(
                weekdays, startDate, endDate, branch != null ? branch.getId() : null
        );
        List<ConflictDetailDto> concreteConflicts = recurringScheduleGenerator.checkConcreteDateConflicts(
                dateCalc.getEligibleDates(), startTime, endTime, mentor, room, group, null, null
        );
        if (!concreteConflicts.isEmpty()) {
            ConflictDetailDto first = concreteConflicts.get(0);
            throw new ScheduleConflictException(
                    "Tanlangan sanalarda to'qnashuv aniqlandi: " + first.getResourceName() + " (" + first.getConflictingDate() + ")",
                    concreteConflicts
            );
        }

        // 8. Persist Schedule
        Schedule schedule = Schedule.builder()
                .mentor(mentor)
                .studyGroup(group)
                .gradeLevel(req.getGradeLevel() != null ? req.getGradeLevel() : "8-sinf")
                .subject(req.getSubject() != null ? req.getSubject() : "Web Full-Stack Development")
                .days(canonicalDays)
                .dayPattern(patternString)
                .startDate(startDate)
                .endDate(endDate)
                .status("ACTIVE")
                .timeSlot(timeSlot)
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

        // 9. Generate Calendar Lesson Sessions if startDate or generateSessions=true was requested
        boolean shouldGenerate = (req.getStartDate() != null) || Boolean.TRUE.equals(req.getGenerateSessions());
        if (shouldGenerate) {
            recurringScheduleGenerator.generateSessions(savedSchedule, startDate, endDate);
        }

        // 10. Associate Students if provided
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

        // 2. Resolve Shift / Time Slot and Times
        TimeSlot timeSlot = resolveTimeSlot(
                req.getTimeSlotId() != null ? req.getTimeSlotId() : req.getShiftId(),
                req.getStartTime(),
                req.getEndTime()
        );
        if (timeSlot == null) {
            timeSlot = schedule.getTimeSlot();
        }

        String startTime = (req.getStartTime() != null && !req.getStartTime().isBlank())
                ? req.getStartTime().trim()
                : (timeSlot != null ? timeSlot.getStartTime() : schedule.getStartTime());
        String endTime = (req.getEndTime() != null && !req.getEndTime().isBlank())
                ? req.getEndTime().trim()
                : (timeSlot != null ? timeSlot.getEndTime() : schedule.getEndTime());
        DayPatternResolver.validateTimeRange(startTime, endTime);

        // 3. Resolve Dates
        LocalDate startDate = (req.getStartDate() != null) ? req.getStartDate() : schedule.getStartDate();
        LocalDate endDate = (req.getEndDate() != null) ? req.getEndDate() : schedule.getEndDate();
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new BusinessException("Boshlanish sanasi tugash sanasidan oldin bo'lishi kerak (" + startDate + " > " + endDate + ")");
        }

        // 4. Resolve Branch
        Branch branch = resolveBranch(req.getBranchId(), req.getBranchLocation());
        if (branch == null) {
            branch = schedule.getBranch();
        }
        String branchLocation = (branch != null) ? branch.getName() :
                (req.getBranchLocation() != null && !req.getBranchLocation().isBlank() ? req.getBranchLocation().trim() : schedule.getBranchLocation());

        // 5. Validate Branch Authorization
        validateBranchAuthorization(branch, branchLocation);

        // 6. Resolve Mentor and StudyGroup
        Mentor mentor = (req.getMentorId() != null)
                ? mentorRepository.findById(req.getMentorId()).orElse(null)
                : null;
        if (mentor == null) {
            mentor = (req.getMentorName() != null && !req.getMentorName().isBlank())
                    ? mentorService.getOrCreate(req.getMentorName(), req.getMentorRole(), branchLocation)
                    : schedule.getMentor();
        }

        StudyGroup group = (req.getGroupId() != null)
                ? studyGroupRepository.findById(req.getGroupId()).orElse(null)
                : null;
        if (group == null) {
            group = (req.getGroupCode() != null && !req.getGroupCode().isBlank())
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
        }

        String room = (req.getRoom() != null && !req.getRoom().isBlank()) ? req.getRoom().trim() : schedule.getRoom();

        // 7. Comprehensive Conflict Detection (excluding current schedule)
        checkConflicts(schedule.getId(), mentor, group, room, weekdays, startTime, endTime);

        // Check concrete dates conflict for future sessions if date range extends into the future
        LocalDate checkFrom = LocalDate.now();
        LocalDate checkTo = (endDate != null) ? endDate : checkFrom.plusMonths(3);
        if (!checkFrom.isAfter(checkTo)) {
            RecurringScheduleGenerator.DateCalculationResult dateCalc = recurringScheduleGenerator.calculateDates(
                    weekdays, checkFrom, checkTo, branch != null ? branch.getId() : null
            );
            List<ConflictDetailDto> concreteConflicts = recurringScheduleGenerator.checkConcreteDateConflicts(
                    dateCalc.getEligibleDates(), startTime, endTime, mentor, room, group, schedule.getId(), null
            );
            if (!concreteConflicts.isEmpty()) {
                ConflictDetailDto first = concreteConflicts.get(0);
                throw new ScheduleConflictException(
                        "Tanlangan kelgusi sanalarda to'qnashuv aniqlandi: " + first.getResourceName() + " (" + first.getConflictingDate() + ")",
                        concreteConflicts
                );
            }
        }

        // 8. Update attributes
        schedule.setMentor(mentor);
        schedule.setStudyGroup(group);
        if (req.getGradeLevel() != null) schedule.setGradeLevel(req.getGradeLevel());
        if (req.getSubject() != null) schedule.setSubject(req.getSubject());
        schedule.setDays(canonicalDays);
        schedule.setDayPattern(patternString);
        if (startDate != null) schedule.setStartDate(startDate);
        if (endDate != null) schedule.setEndDate(endDate);
        schedule.setTimeSlot(timeSlot);
        schedule.setStartTime(startTime);
        schedule.setEndTime(endTime);
        schedule.setRoom(room);
        schedule.setBranchLocation(branchLocation);
        schedule.setBranch(branch);
        if (req.getTopic() != null) schedule.setTopic(req.getTopic());

        Schedule updated = scheduleRepository.save(schedule);

        // 9. Regenerate future sessions according to updateScope (Default: FUTURE_ONLY)
        String scope = (req.getUpdateScope() != null) ? req.getUpdateScope() : "FUTURE_ONLY";
        recurringScheduleGenerator.regenerateFutureSessions(updated, LocalDate.now(), scope);

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

        // Preserve completed historical sessions and attendance by disassociating from schedule
        List<LessonSession> sessions = lessonSessionRepository.findByScheduleId(id);
        for (LessonSession s : sessions) {
            long attCount = attendanceRecordRepository.countByLessonSessionId(s.getId());
            if ("COMPLETED".equalsIgnoreCase(s.getStatus()) || attCount > 0) {
                s.setSchedule(null);
                lessonSessionRepository.save(s);
            } else {
                lessonSessionRepository.delete(s);
            }
        }

        scheduleRepository.delete(schedule);

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("SCHEDULE_DELETED", "Schedule", String.valueOf(id), actor,
                "Dars jadvali o'chirildi: #" + id + " (" + schedule.getSubject() + " " + schedule.getDays() + ")");
    }

    @Transactional
    public Schedule archiveSchedule(Long id, String reason) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + id));

        schedule.setStatus("ARCHIVED");
        Schedule saved = scheduleRepository.save(schedule);

        // Cancel all future scheduled sessions that have not started or completed
        List<LessonSession> futureSessions = lessonSessionRepository.findByScheduleIdAndLessonDateGreaterThanEqual(id, LocalDate.now());
        for (LessonSession s : futureSessions) {
            long attCount = attendanceRecordRepository.countByLessonSessionId(s.getId());
            if ("SCHEDULED".equalsIgnoreCase(s.getStatus()) && attCount == 0) {
                s.setStatus("CANCELLED");
                s.setCancellationReason(reason != null && !reason.isBlank() ? reason.trim() : "Dars jadvali arxivlandi");
                lessonSessionRepository.save(s);
            }
        }

        String actor = currentUserHelper.isAuthenticated() ? currentUserHelper.getCurrentUsername() : "SYSTEM";
        auditService.logAction("SCHEDULE_ARCHIVED", "Schedule", String.valueOf(id), actor,
                "Dars jadvali arxivlandi: #" + id + " (" + schedule.getSubject() + ")");

        return saved;
    }

    @Transactional(readOnly = true)
    public SchedulePreviewResponse previewSchedule(SchedulePreviewRequest req) {
        DayPattern pattern;
        if (req.getDayPattern() != null && !req.getDayPattern().isBlank()) {
            try {
                pattern = DayPattern.valueOf(req.getDayPattern().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                pattern = DayPattern.CUSTOM;
            }
        } else {
            pattern = DayPattern.ODD_DAYS;
        }

        List<AcademicWeekday> weekdays;
        if (pattern == DayPattern.CUSTOM) {
            if (req.getSelectedDays() != null && !req.getSelectedDays().isEmpty()) {
                weekdays = DayPatternResolver.resolveCustomDays(req.getSelectedDays());
            } else if (req.getDays() != null && !req.getDays().isBlank()) {
                weekdays = DayPatternResolver.parseWeekdays(req.getDays());
            } else {
                weekdays = DayPatternResolver.ODD_WEEKDAYS;
            }
        } else {
            weekdays = DayPatternResolver.resolve(pattern, req.getSelectedDays());
        }

        LocalDate start = req.getStartDate() != null ? req.getStartDate() : LocalDate.now();
        LocalDate end = req.getEndDate() != null ? req.getEndDate() : start.plusMonths(3);

        String startTime = req.getStartTime() != null ? req.getStartTime().trim() : "15:00";
        String endTime = req.getEndTime() != null ? req.getEndTime().trim() : "16:30";
        if (req.getTimeSlotId() != null || req.getShiftId() != null) {
            Long sid = req.getTimeSlotId() != null ? req.getTimeSlotId() : req.getShiftId();
            TimeSlot ts = timeSlotRepository.findById(sid).orElse(null);
            if (ts != null) {
                if (req.getStartTime() == null || req.getStartTime().isBlank()) startTime = ts.getStartTime();
                if (req.getEndTime() == null || req.getEndTime().isBlank()) endTime = ts.getEndTime();
            }
        }
        DayPatternResolver.validateTimeRange(startTime, endTime);

        RecurringScheduleGenerator.DateCalculationResult calc = recurringScheduleGenerator.calculateDates(
                weekdays, start, end, req.getBranchId()
        );

        Mentor mentor = (req.getMentorId() != null)
                ? mentorRepository.findById(req.getMentorId()).orElse(null)
                : (req.getMentorName() != null ? mentorRepository.findByFullNameIgnoreCase(req.getMentorName().trim()).orElse(null) : null);

        StudyGroup group = (req.getGroupId() != null)
                ? studyGroupRepository.findById(req.getGroupId()).orElse(null)
                : (req.getGroupCode() != null ? studyGroupRepository.findByGroupCodeIgnoreCase(req.getGroupCode().trim()).orElse(null) : null);

        List<ConflictDetailDto> conflicts = recurringScheduleGenerator.checkConcreteDateConflicts(
                calc.getEligibleDates(), startTime, endTime, mentor, req.getRoom(), group, req.getExcludeScheduleId(), null
        );

        return SchedulePreviewResponse.builder()
                .totalSessions(calc.getEligibleDates().size())
                .dayPattern(pattern.name())
                .weekdays(weekdays.stream().map(AcademicWeekday::getUzbekName).collect(Collectors.toList()))
                .timeInterval(startTime + " - " + endTime)
                .startDate(start)
                .endDate(end)
                .sessionDates(calc.getEligibleDates())
                .holidaysCount(calc.getSkippedHolidays().size())
                .skippedHolidays(calc.getSkippedHolidays())
                .hasConflicts(!conflicts.isEmpty())
                .conflicts(conflicts)
                .build();
    }

    @Transactional
    public List<LessonSession> generateSessionsForSchedule(Long scheduleId, LocalDate startDate, LocalDate endDate) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + scheduleId));
        return recurringScheduleGenerator.generateSessions(schedule, startDate, endDate);
    }

    @Transactional
    public List<LessonSession> regenerateSessionsForSchedule(Long scheduleId, String updateScope) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + scheduleId));
        return recurringScheduleGenerator.regenerateFutureSessions(schedule, LocalDate.now(), updateScope);
    }

    private TimeSlot resolveTimeSlot(Long timeSlotId, String startTime, String endTime) {
        if (timeSlotId != null) {
            return timeSlotRepository.findById(timeSlotId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dars vaqti oralig'i (TimeSlot/Shift) topilmadi: #" + timeSlotId));
        }
        if (startTime != null && endTime != null && !startTime.isBlank() && !endTime.isBlank()) {
            return timeSlotRepository.findByStartTimeAndEndTime(startTime.trim(), endTime.trim()).orElse(null);
        }
        return null;
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
