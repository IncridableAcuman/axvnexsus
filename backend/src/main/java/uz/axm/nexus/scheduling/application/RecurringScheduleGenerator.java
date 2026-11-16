package uz.axm.nexus.scheduling.application;

import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.scheduling.domain.*;
import uz.axm.nexus.scheduling.infrastructure.AcademicHolidayRepository;
import uz.axm.nexus.scheduling.infrastructure.AttendanceRecordRepository;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.shared.application.BusinessException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecurringScheduleGenerator {

    private final LessonSessionRepository lessonSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AcademicHolidayRepository academicHolidayRepository;

    @Data
    @Builder
    public static class DateCalculationResult {
        private List<LocalDate> eligibleDates;
        private List<LocalDate> skippedHolidays;
    }

    /**
     * Boshlanish va tugash sanalari oralig'ida tanlangan DayPattern va kunlar bo'yicha
     * dars o'tkazilishi lozim bo'lgan aniq taqvim sanalarini hisoblab chiqadi.
     * Yakshanba va rasmiy bayram/ta'tillar inobatga olinmaydi.
     */
    public DateCalculationResult calculateDates(
            List<AcademicWeekday> weekdays,
            LocalDate startDate,
            LocalDate endDate,
            Long branchId
    ) {
        if (startDate == null) {
            throw new BusinessException("Dars jadvali boshlanish sanasi (startDate) ko'rsatilishi shart!");
        }
        if (endDate == null) {
            throw new BusinessException("Dars jadvali tugash sanasi (endDate) ko'rsatilishi shart!");
        }
        if (startDate.isAfter(endDate)) {
            throw new BusinessException("Boshlanish sanasi tugash sanasidan oldin bo'lishi kerak (" + startDate + " > " + endDate + ")");
        }
        if (weekdays == null || weekdays.isEmpty()) {
            throw new BusinessException("Kamida bitta akademik dars kuni ko'rsatilishi shart!");
        }

        Set<DayOfWeek> targetDays = weekdays.stream()
                .map(AcademicWeekday::getDayOfWeek)
                .collect(Collectors.toSet());

        // Target range dagi bayramlar
        List<AcademicHoliday> holidays = (branchId != null)
                ? academicHolidayRepository.findHolidaysForBranchInRange(startDate, endDate, branchId)
                : academicHolidayRepository.findByHolidayDateBetween(startDate, endDate);

        Set<LocalDate> holidayDates = holidays.stream()
                .map(AcademicHoliday::getHolidayDate)
                .collect(Collectors.toSet());

        List<LocalDate> eligible = new ArrayList<>();
        List<LocalDate> skippedHolidays = new ArrayList<>();

        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            // Sunday is strictly forbidden in 6-day academic calendar
            if (d.getDayOfWeek() == DayOfWeek.SUNDAY) {
                continue;
            }

            if (targetDays.contains(d.getDayOfWeek())) {
                if (holidayDates.contains(d)) {
                    skippedHolidays.add(d);
                } else {
                    eligible.add(d);
                }
            }
        }

        return DateCalculationResult.builder()
                .eligibleDates(eligible)
                .skippedHolidays(skippedHolidays)
                .build();
    }

    /**
     * Jadval asosida aniq dars mashg'ulotlarini (LessonSession) bazada avtomatik va idempotent tarzda generatsiya qiladi.
     */
    @Transactional
    public List<LessonSession> generateSessions(Schedule schedule, LocalDate startDate, LocalDate endDate) {
        if (schedule == null || schedule.getId() == null) {
            throw new BusinessException("Dars jadvali avval saqlangan bo'lishi shart!");
        }

        LocalDate effectiveStart = (startDate != null) ? startDate : (schedule.getStartDate() != null ? schedule.getStartDate() : LocalDate.now());
        LocalDate effectiveEnd = (endDate != null) ? endDate : (schedule.getEndDate() != null ? schedule.getEndDate() : effectiveStart.plusMonths(3));

        List<AcademicWeekday> weekdays = DayPatternResolver.parseWeekdays(
                schedule.getDayPattern() != null ? schedule.getDayPattern() : schedule.getDays()
        );
        if (weekdays.isEmpty() && schedule.getDays() != null) {
            weekdays = DayPatternResolver.parseWeekdays(schedule.getDays());
        }

        Long branchId = (schedule.getBranch() != null) ? schedule.getBranch().getId() : null;
        DateCalculationResult calc = calculateDates(weekdays, effectiveStart, effectiveEnd, branchId);

        List<LessonSession> generated = new ArrayList<>();

        for (LocalDate date : calc.getEligibleDates()) {
            // Idempotent protection: don't create duplicate active sessions
            boolean exists = lessonSessionRepository.existsByScheduleIdAndLessonDateAndStatusNot(
                    schedule.getId(), date, "CANCELLED"
            );
            if (exists) {
                continue;
            }

            LessonSession session = LessonSession.builder()
                    .schedule(schedule)
                    .group(schedule.getStudyGroup())
                    .mentor(schedule.getMentor())
                    .room(schedule.getRoom())
                    .subject(schedule.getSubject())
                    .topic(schedule.getTopic())
                    .lessonDate(date)
                    .startTime(schedule.getStartTime())
                    .endTime(schedule.getEndTime())
                    .status("SCHEDULED")
                    .isManuallyModified(false)
                    .timeSlot(schedule.getTimeSlot())
                    .build();

            generated.add(lessonSessionRepository.save(session));
        }

        log.info("Schedule #{} uchun {} ta yangi dars mashg'uloti generatsiya qilindi (Sana oralig'i: {} - {})",
                schedule.getId(), generated.size(), effectiveStart, effectiveEnd);

        return generated;
    }

    /**
     * Jadval tahrirlanganda kelgusi darslarni (FUTURE_ONLY) xavfsiz yangilash yoki qayta hisoblash.
     * O'tgan yoki yakunlangan (COMPLETED) darslar va davomat qaydlari tegilmaydi.
     * Qo'lda o'zgartirilgan (isManuallyModified == true) mashg'ulotlar qayta yozilmaydi.
     */
    @Transactional
    public List<LessonSession> regenerateFutureSessions(Schedule schedule, LocalDate fromDate, String updateScope) {
        if (schedule == null || schedule.getId() == null) return Collections.emptyList();

        LocalDate cutoff = (fromDate != null) ? fromDate : LocalDate.now();
        LocalDate effectiveEnd = schedule.getEndDate() != null ? schedule.getEndDate() : cutoff.plusMonths(3);
        if (cutoff.isAfter(effectiveEnd)) {
            return Collections.emptyList();
        }

        List<LessonSession> existingFutureSessions = lessonSessionRepository.findByScheduleIdAndLessonDateGreaterThanEqual(
                schedule.getId(), cutoff
        );

        List<AcademicWeekday> activeWeekdays = DayPatternResolver.parseWeekdays(
                schedule.getDayPattern() != null ? schedule.getDayPattern() : schedule.getDays()
        );
        Long branchId = (schedule.getBranch() != null) ? schedule.getBranch().getId() : null;

        DateCalculationResult calc = calculateDates(activeWeekdays, cutoff, effectiveEnd, branchId);
        Set<LocalDate> eligibleDateSet = new HashSet<>(calc.getEligibleDates());

        List<LessonSession> result = new ArrayList<>();

        // 1. Existing future sessions inspection
        Map<LocalDate, LessonSession> dateToExistingSession = new HashMap<>();
        for (LessonSession s : existingFutureSessions) {
            // Never touch completed sessions or sessions with attendance
            long attendanceCount = attendanceRecordRepository.countByLessonSessionId(s.getId());
            if ("COMPLETED".equalsIgnoreCase(s.getStatus()) || attendanceCount > 0) {
                continue;
            }

            // If manually modified by admin/mentor, preserve it
            if (Boolean.TRUE.equals(s.getIsManuallyModified())) {
                continue;
            }

            if (!eligibleDateSet.contains(s.getLessonDate())) {
                // This date is no longer part of recurrence pattern (e.g. switched from ODD to EVEN days)
                s.setStatus("CANCELLED");
                s.setCancellationReason("Dars jadvali kunlari o'zgardi (jadval yangilanishi)");
                lessonSessionRepository.save(s);
            } else {
                // Still eligible, update room, mentor, time, subject
                s.setSubject(schedule.getSubject());
                s.setMentor(schedule.getMentor());
                s.setRoom(schedule.getRoom());
                s.setStartTime(schedule.getStartTime());
                s.setEndTime(schedule.getEndTime());
                s.setTimeSlot(schedule.getTimeSlot());
                dateToExistingSession.put(s.getLessonDate(), lessonSessionRepository.save(s));
                result.add(s);
            }
        }

        // 2. Add newly eligible dates
        for (LocalDate date : calc.getEligibleDates()) {
            if (!dateToExistingSession.containsKey(date)) {
                boolean exists = lessonSessionRepository.existsByScheduleIdAndLessonDateAndStatusNot(
                        schedule.getId(), date, "CANCELLED"
                );
                if (!exists) {
                    LessonSession newSession = LessonSession.builder()
                            .schedule(schedule)
                            .group(schedule.getStudyGroup())
                            .mentor(schedule.getMentor())
                            .room(schedule.getRoom())
                            .subject(schedule.getSubject())
                            .topic(schedule.getTopic())
                            .lessonDate(date)
                            .startTime(schedule.getStartTime())
                            .endTime(schedule.getEndTime())
                            .status("SCHEDULED")
                            .isManuallyModified(false)
                            .timeSlot(schedule.getTimeSlot())
                            .build();
                    result.add(lessonSessionRepository.save(newSession));
                }
            }
        }

        return result;
    }

    /**
     * Berilgan aniq taqvim sanalarida Mentor, Xona va Guruh bo'yicha darslar to'qnashuvini tekshiradi.
     */
    public List<ConflictDetailDto> checkConcreteDateConflicts(
            List<LocalDate> dates,
            String startTime,
            String endTime,
            Mentor mentor,
            String room,
            StudyGroup group,
            Long excludeScheduleId,
            Long excludeSessionId
    ) {
        List<ConflictDetailDto> conflicts = new ArrayList<>();
        if (dates == null || dates.isEmpty()) return conflicts;

        for (LocalDate date : dates) {
            // 1. Mentor conflict on concrete date
            if (mentor != null && mentor.getId() != null) {
                List<LessonSession> mentorSessions = lessonSessionRepository.findByMentorIdAndLessonDateAndStatusNot(
                        mentor.getId(), date, "CANCELLED"
                );
                for (LessonSession s : mentorSessions) {
                    if (excludeSessionId != null && s.getId().equals(excludeSessionId)) continue;
                    if (excludeScheduleId != null && s.getSchedule() != null && s.getSchedule().getId().equals(excludeScheduleId)) continue;

                    if (DayPatternResolver.isTimeOverlap(startTime, endTime, s.getStartTime(), s.getEndTime())) {
                        String grpCode = (s.getGroup() != null) ? s.getGroup().getGroupCode() : "Boshqa guruh";
                        conflicts.add(ConflictDetailDto.builder()
                                .type("MENTOR")
                                .weekday(date.getDayOfWeek().name())
                                .conflictingDate(date)
                                .resourceName(mentor.getFullName())
                                .existingGroupCode(grpCode)
                                .existingScheduleId(s.getSchedule() != null ? s.getSchedule().getId() : null)
                                .startTime(s.getStartTime())
                                .endTime(s.getEndTime())
                                .build());
                    }
                }
            }

            // 2. Room conflict on concrete date
            if (room != null && !room.isBlank()) {
                List<LessonSession> roomSessions = lessonSessionRepository.findByRoomAndLessonDateAndStatusNot(
                        room.trim(), date, "CANCELLED"
                );
                for (LessonSession s : roomSessions) {
                    if (excludeSessionId != null && s.getId().equals(excludeSessionId)) continue;
                    if (excludeScheduleId != null && s.getSchedule() != null && s.getSchedule().getId().equals(excludeScheduleId)) continue;

                    if (DayPatternResolver.isTimeOverlap(startTime, endTime, s.getStartTime(), s.getEndTime())) {
                        String grpCode = (s.getGroup() != null) ? s.getGroup().getGroupCode() : "Boshqa guruh";
                        conflicts.add(ConflictDetailDto.builder()
                                .type("CLASSROOM")
                                .weekday(date.getDayOfWeek().name())
                                .conflictingDate(date)
                                .resourceName(room.trim())
                                .existingGroupCode(grpCode)
                                .existingScheduleId(s.getSchedule() != null ? s.getSchedule().getId() : null)
                                .startTime(s.getStartTime())
                                .endTime(s.getEndTime())
                                .build());
                    }
                }
            }

            // 3. Group conflict on concrete date
            if (group != null && group.getId() != null) {
                List<LessonSession> groupSessions = lessonSessionRepository.findByGroupIdAndLessonDateAndStatusNot(
                        group.getId(), date, "CANCELLED"
                );
                for (LessonSession s : groupSessions) {
                    if (excludeSessionId != null && s.getId().equals(excludeSessionId)) continue;
                    if (excludeScheduleId != null && s.getSchedule() != null && s.getSchedule().getId().equals(excludeScheduleId)) continue;

                    if (DayPatternResolver.isTimeOverlap(startTime, endTime, s.getStartTime(), s.getEndTime())) {
                        conflicts.add(ConflictDetailDto.builder()
                                .type("GROUP")
                                .weekday(date.getDayOfWeek().name())
                                .conflictingDate(date)
                                .resourceName(group.getGroupCode())
                                .existingGroupCode(group.getGroupCode())
                                .existingScheduleId(s.getSchedule() != null ? s.getSchedule().getId() : null)
                                .startTime(s.getStartTime())
                                .endTime(s.getEndTime())
                                .build());
                    }
                }
            }
        }

        return conflicts;
    }
}
