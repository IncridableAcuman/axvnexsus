package uz.axm.nexus.scheduling.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.audit.application.AuditService;
import uz.axm.nexus.classrooms.domain.GroupMembership;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.GroupMembershipRepository;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.domain.AcademicWeekday;
import uz.axm.nexus.scheduling.domain.AttendanceRecord;
import uz.axm.nexus.scheduling.domain.DayPatternResolver;
import uz.axm.nexus.scheduling.domain.LessonSession;
import uz.axm.nexus.scheduling.domain.Schedule;
import uz.axm.nexus.scheduling.infrastructure.AttendanceRecordRepository;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.scheduling.infrastructure.ScheduleRepository;
import uz.axm.nexus.shared.application.BusinessException;
import uz.axm.nexus.shared.application.ResourceNotFoundException;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.infrastructure.StudentRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceScheduleService {

    private final LessonSessionRepository lessonSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final MentorRepository mentorRepository;
    private final StudentRepository studentRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final AuditService auditService;
    private final ScheduleRepository scheduleRepository;

    private static final Set<String> VALID_ATTENDANCE_STATUSES = Set.of("PRESENT", "ABSENT", "LATE", "EXCUSED");

    @Transactional(readOnly = true)
    public List<LessonSessionDto> getSessions(LocalDate startDate, LocalDate endDate, Long mentorId, Long groupId) {
        if (startDate == null) startDate = LocalDate.now().minusWeeks(2);
        if (endDate == null) endDate = LocalDate.now().plusWeeks(2);

        List<LessonSession> sessions;
        if (groupId != null) {
            sessions = lessonSessionRepository.findByGroupIdAndLessonDateBetween(groupId, startDate, endDate);
        } else if (mentorId != null) {
            sessions = lessonSessionRepository.findByMentorIdAndLessonDateBetween(mentorId, startDate, endDate);
        } else {
            sessions = lessonSessionRepository.findByLessonDateBetween(startDate, endDate);
        }

        List<LessonSessionDto> result = sessions.stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        // Virtual calendar projection for recurring schedules
        projectRecurringSchedules(result, startDate, endDate, mentorId, groupId);

        result.sort(Comparator.comparing(LessonSessionDto::getLessonDate)
                .thenComparing(dto -> dto.getStartTime() != null ? dto.getStartTime() : "00:00"));

        return result;
    }

    @Transactional(readOnly = true)
    public List<LessonSessionDto> getTodaySessions(Long mentorId) {
        LocalDate today = LocalDate.now();
        List<LessonSession> sessions = (mentorId != null)
                ? lessonSessionRepository.findByMentorIdAndLessonDate(mentorId, today)
                : lessonSessionRepository.findByLessonDate(today);

        List<LessonSessionDto> result = sessions.stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        projectRecurringSchedules(result, today, today, mentorId, null);

        result.sort(Comparator.comparing(dto -> dto.getStartTime() != null ? dto.getStartTime() : "00:00"));

        return result;
    }

    @Transactional(readOnly = true)
    public LessonSessionDto getSessionById(Long id) {
        if (id != null && id < 0) {
            long scheduleId = (-id) / 1000000L;
            long epochDay = (-id) % 1000000L;
            LocalDate date = LocalDate.ofEpochDay(epochDay);
            Schedule schedule = scheduleRepository.findById(scheduleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + scheduleId));
            return toProjectedDto(schedule, id, date);
        }
        LessonSession session = lessonSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars mashg'uloti topilmadi: #" + id));
        return toDto(session);
    }

    @Transactional
    public LessonSessionDto createSession(CreateLessonSessionRequest request, String actor) {
        validateTimes(request.getStartTime(), request.getEndTime());

        StudyGroup group = studyGroupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Guruh topilmadi: #" + request.getGroupId()));

        Mentor mentor = mentorRepository.findById(request.getMentorId())
                .orElseThrow(() -> new ResourceNotFoundException("Mentor topilmadi: #" + request.getMentorId()));

        // Conflict check for Mentor
        checkMentorConflict(mentor.getId(), request.getLessonDate(), request.getStartTime(), request.getEndTime(), null);

        // Conflict check for Room
        if (request.getRoom() != null && !request.getRoom().isBlank()) {
            checkRoomConflict(request.getRoom().trim(), request.getLessonDate(), request.getStartTime(), request.getEndTime(), null);
        }

        LessonSession session = LessonSession.builder()
                .group(group)
                .mentor(mentor)
                .room(request.getRoom() != null ? request.getRoom().trim() : group.getRoom())
                .subject(request.getSubject())
                .topic(request.getTopic())
                .lessonDate(request.getLessonDate())
                .startTime(request.getStartTime().trim())
                .endTime(request.getEndTime().trim())
                .status("SCHEDULED")
                .notes(request.getNotes())
                .build();

        LessonSession saved = lessonSessionRepository.save(session);
        auditService.logAction("LESSON_SCHEDULED", "LessonSession", String.valueOf(saved.getId()), actor,
                "Dars belgilandi: " + saved.getSubject() + " (" + saved.getLessonDate() + " " + saved.getStartTime() + ")");

        return toDto(saved);
    }

    @Transactional
    public LessonSessionDto rescheduleSession(Long id, RescheduleLessonRequest request, String actor) {
        validateTimes(request.getNewStartTime(), request.getNewEndTime());

        LessonSession session;
        if (id != null && id < 0) {
            long scheduleId = (-id) / 1000000L;
            long epochDay = (-id) % 1000000L;
            LocalDate origDate = LocalDate.ofEpochDay(epochDay);
            Schedule schedule = scheduleRepository.findById(scheduleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + scheduleId));
            LessonSession newSession = LessonSession.builder()
                    .schedule(schedule)
                    .group(schedule.getStudyGroup())
                    .mentor(schedule.getMentor())
                    .room(schedule.getRoom())
                    .subject(schedule.getSubject())
                    .topic(schedule.getTopic())
                    .lessonDate(origDate)
                    .startTime(schedule.getStartTime())
                    .endTime(schedule.getEndTime())
                    .status("SCHEDULED")
                    .build();
            session = lessonSessionRepository.save(newSession);
        } else {
            session = lessonSessionRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Dars mashg'uloti topilmadi: #" + id));
        }

        Mentor mentor = session.getMentor();
        if (request.getNewMentorId() != null) {
            mentor = mentorRepository.findById(request.getNewMentorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Mentor topilmadi: #" + request.getNewMentorId()));
            session.setMentor(mentor);
        }

        String room = request.getNewRoom() != null && !request.getNewRoom().isBlank()
                ? request.getNewRoom().trim()
                : session.getRoom();

        // Check conflicts excluding self
        checkMentorConflict(mentor.getId(), request.getNewDate(), request.getNewStartTime(), request.getNewEndTime(), session.getId());
        if (room != null && !room.isBlank()) {
            checkRoomConflict(room, request.getNewDate(), request.getNewStartTime(), request.getNewEndTime(), session.getId());
        }

        session.setLessonDate(request.getNewDate());
        session.setStartTime(request.getNewStartTime().trim());
        session.setEndTime(request.getNewEndTime().trim());
        session.setRoom(room);
        session.setStatus("RESCHEDULED");
        session.setIsManuallyModified(true);
        if (request.getReason() != null) {
            session.setNotes((session.getNotes() != null ? session.getNotes() + " | " : "") + "Ko'chirildi: " + request.getReason());
        }

        LessonSession saved = lessonSessionRepository.save(session);
        auditService.logAction("LESSON_RESCHEDULED", "LessonSession", String.valueOf(saved.getId()), actor,
                "Dars yangi vaqtga ko'chirildi: " + saved.getLessonDate() + " " + saved.getStartTime() + " - " + saved.getEndTime());

        return toDto(saved);
    }

    @Transactional
    public LessonSessionDto cancelSession(Long id, CancelLessonRequest request, String actor) {
        LessonSession session;
        if (id != null && id < 0) {
            long scheduleId = (-id) / 1000000L;
            long epochDay = (-id) % 1000000L;
            LocalDate origDate = LocalDate.ofEpochDay(epochDay);
            Schedule schedule = scheduleRepository.findById(scheduleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + scheduleId));
            LessonSession newSession = LessonSession.builder()
                    .schedule(schedule)
                    .group(schedule.getStudyGroup())
                    .mentor(schedule.getMentor())
                    .room(schedule.getRoom())
                    .subject(schedule.getSubject())
                    .topic(schedule.getTopic())
                    .lessonDate(origDate)
                    .startTime(schedule.getStartTime())
                    .endTime(schedule.getEndTime())
                    .status("SCHEDULED")
                    .build();
            session = lessonSessionRepository.save(newSession);
        } else {
            session = lessonSessionRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Dars mashg'uloti topilmadi: #" + id));
        }

        session.setStatus("CANCELLED");
        session.setCancellationReason(request.getReason());
        session.setIsManuallyModified(true);

        LessonSession saved = lessonSessionRepository.save(session);
        auditService.logAction("LESSON_CANCELLED", "LessonSession", String.valueOf(saved.getId()), actor,
                "Dars bekor qilindi. Sabab: " + request.getReason());

        return toDto(saved);
    }

    @Transactional
    public LessonSessionDto restoreSession(Long id, String actor) {
        LessonSession session = lessonSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dars mashg'uloti topilmadi: #" + id));

        if (!"CANCELLED".equalsIgnoreCase(session.getStatus())) {
            throw new BusinessException("Faqat bekor qilingan darslarni qayta tiklash mumkin!");
        }

        // Check conflicts before restoring
        checkMentorConflict(session.getMentor().getId(), session.getLessonDate(), session.getStartTime(), session.getEndTime(), session.getId());
        if (session.getRoom() != null && !session.getRoom().isBlank()) {
            checkRoomConflict(session.getRoom(), session.getLessonDate(), session.getStartTime(), session.getEndTime(), session.getId());
        }

        session.setStatus("SCHEDULED");
        session.setCancellationReason(null);
        LessonSession saved = lessonSessionRepository.save(session);

        auditService.logAction("LESSON_RESTORED", "LessonSession", String.valueOf(saved.getId()), actor,
                "Bekor qilingan dars qayta tiklandi: " + saved.getSubject() + " (" + saved.getLessonDate() + ")");

        return toDto(saved);
    }

    @Transactional
    public LessonSessionDto submitAttendance(Long sessionId, SubmitAttendanceRequest request, String actor) {
        final Long requestedSessionId = sessionId;
        LessonSession session;
        if (requestedSessionId != null && requestedSessionId < 0) {
            long scheduleId = (-requestedSessionId) / 1000000L;
            long epochDay = (-requestedSessionId) % 1000000L;
            LocalDate origDate = LocalDate.ofEpochDay(epochDay);
            Schedule schedule = scheduleRepository.findById(scheduleId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dars jadvali topilmadi: #" + scheduleId));
            LessonSession newSession = LessonSession.builder()
                    .schedule(schedule)
                    .group(schedule.getStudyGroup())
                    .mentor(schedule.getMentor())
                    .room(schedule.getRoom())
                    .subject(schedule.getSubject())
                    .topic(schedule.getTopic())
                    .lessonDate(origDate)
                    .startTime(schedule.getStartTime())
                    .endTime(schedule.getEndTime())
                    .status("SCHEDULED")
                    .build();
            session = lessonSessionRepository.save(newSession);
        } else {
            session = lessonSessionRepository.findById(requestedSessionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dars mashg'uloti topilmadi: #" + requestedSessionId));
        }

        final Long resolvedSessionId = session.getId();

        if ("CANCELLED".equalsIgnoreCase(session.getStatus())) {
            throw new BusinessException("Bekor qilingan dars uchun davomat kiritib bo'lmaydi!");
        }

        int presentCount = 0;
        int absentCount = 0;

        for (AttendanceItemDto item : request.getRecords()) {
            String status = item.getStatus().trim().toUpperCase();
            if (!VALID_ATTENDANCE_STATUSES.contains(status)) {
                throw new BusinessException("Noto'g'ri davomat holati: " + item.getStatus() + ". Ruxsat etilgan: PRESENT, ABSENT, LATE, EXCUSED");
            }

            Student student = studentRepository.findById(item.getStudentId())
                    .orElseThrow(() -> new ResourceNotFoundException("O'quvchi topilmadi: #" + item.getStudentId()));

            AttendanceRecord record = attendanceRecordRepository.findByLessonSessionIdAndStudentId(resolvedSessionId, item.getStudentId())
                    .orElseGet(() -> AttendanceRecord.builder()
                            .lessonSession(session)
                            .student(student)
                            .recordedBy(actor)
                            .recordedAt(LocalDateTime.now())
                            .build());

            if (record.getId() != null) {
                record.setUpdatedBy(actor);
            }
            record.setStatus(status);
            record.setNotes(item.getNotes());

            attendanceRecordRepository.save(record);

            if ("PRESENT".equals(status)) presentCount++;
            else if ("ABSENT".equals(status)) absentCount++;
        }

        if ("SCHEDULED".equalsIgnoreCase(session.getStatus()) || "RESCHEDULED".equalsIgnoreCase(session.getStatus())) {
            session.setStatus("COMPLETED");
            lessonSessionRepository.save(session);
        }

        auditService.logAction("ATTENDANCE_RECORDED", "LessonSession", String.valueOf(resolvedSessionId), actor,
                "Davomat qayd etildi (Qatnashdi: " + presentCount + ", Qatnashmadi: " + absentCount + ")");

        return toDto(session);
    }

    private void checkMentorConflict(Long mentorId, LocalDate date, String start, String end, Long excludeSessionId) {
        List<LessonSession> existing = lessonSessionRepository.findByMentorIdAndLessonDateAndStatusNot(mentorId, date, "CANCELLED");
        for (LessonSession s : existing) {
            if (excludeSessionId != null && s.getId().equals(excludeSessionId)) continue;
            if (isTimeOverlap(start, end, s.getStartTime(), s.getEndTime())) {
                String grpCode = (s.getGroup() != null) ? s.getGroup().getGroupCode() : "Boshqa guruh";
                String msg = "Mentor uchun darslar vaqtida to'qnashuv (Conflict) mavjud! Mentor ushbu vaqtda boshqa darsga ega (" + grpCode + ": " + s.getStartTime() + " - " + s.getEndTime() + ")";
                ConflictDetailDto detail = ConflictDetailDto.builder()
                        .type("MENTOR")
                        .weekday(date.getDayOfWeek().name())
                        .resourceName(s.getMentor() != null ? s.getMentor().getFullName() : "Mentor")
                        .existingGroupCode(grpCode)
                        .startTime(s.getStartTime())
                        .endTime(s.getEndTime())
                        .build();
                throw new ScheduleConflictException(msg, List.of(detail));
            }
        }
    }

    private void checkRoomConflict(String room, LocalDate date, String start, String end, Long excludeSessionId) {
        List<LessonSession> existing = lessonSessionRepository.findByRoomAndLessonDateAndStatusNot(room, date, "CANCELLED");
        for (LessonSession s : existing) {
            if (excludeSessionId != null && s.getId().equals(excludeSessionId)) continue;
            if (isTimeOverlap(start, end, s.getStartTime(), s.getEndTime())) {
                String grpCode = (s.getGroup() != null) ? s.getGroup().getGroupCode() : "boshqa dars";
                String msg = "Xona (" + room + ") ushbu vaqtda band! Unda " + grpCode + " darsi mavjud (" + s.getStartTime() + " - " + s.getEndTime() + ")";
                ConflictDetailDto detail = ConflictDetailDto.builder()
                        .type("CLASSROOM")
                        .weekday(date.getDayOfWeek().name())
                        .resourceName(room)
                        .existingGroupCode(grpCode)
                        .startTime(s.getStartTime())
                        .endTime(s.getEndTime())
                        .build();
                throw new ScheduleConflictException(msg, List.of(detail));
            }
        }
    }

    private void projectRecurringSchedules(List<LessonSessionDto> result, LocalDate startDate, LocalDate endDate, Long mentorId, Long groupId) {
        Set<String> existingKeys = new HashSet<>();
        for (LessonSessionDto s : result) {
            if (s.getGroupId() != null && s.getLessonDate() != null) {
                existingKeys.add(s.getGroupId() + "_" + s.getLessonDate());
            }
        }

        List<Schedule> schedules = scheduleRepository.findAll();
        for (Schedule s : schedules) {
            if (s.getStudyGroup() == null) continue;
            if (groupId != null && !groupId.equals(s.getStudyGroup().getId())) continue;
            if (mentorId != null && (s.getMentor() == null || !mentorId.equals(s.getMentor().getId()))) continue;

            List<AcademicWeekday> activeWeekdays = DayPatternResolver.parseWeekdays(
                    s.getDayPattern() != null ? s.getDayPattern() : s.getDays()
            );
            if (activeWeekdays.isEmpty() && s.getDays() != null) {
                activeWeekdays = DayPatternResolver.parseWeekdays(s.getDays());
            }
            if (activeWeekdays.isEmpty()) continue;

            Set<DayOfWeek> targetDays = activeWeekdays.stream()
                    .map(AcademicWeekday::getDayOfWeek)
                    .collect(Collectors.toSet());

            for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
                if (targetDays.contains(d.getDayOfWeek())) {
                    String key = s.getStudyGroup().getId() + "_" + d;
                    if (!existingKeys.contains(key)) {
                        long epochDay = d.toEpochDay();
                        long virtualId = -(s.getId() * 1000000L + Math.abs(epochDay));
                        result.add(toProjectedDto(s, virtualId, d));
                        existingKeys.add(key);
                    }
                }
            }
        }
    }

    private LessonSessionDto toProjectedDto(Schedule s, Long virtualId, LocalDate date) {
        int studentCount = (s.getStudyGroup() != null && s.getStudyGroup().getStudentCount() != null)
                ? s.getStudyGroup().getStudentCount()
                : 0;

        List<AttendanceItemDto> itemDtos = new ArrayList<>();
        if (s.getStudyGroup() != null) {
            List<GroupMembership> members = groupMembershipRepository.findByGroupIdAndStatus(s.getStudyGroup().getId(), "ACTIVE");
            for (GroupMembership gm : members) {
                if (gm.getStudent() != null) {
                    itemDtos.add(AttendanceItemDto.builder()
                            .studentId(gm.getStudent().getId())
                            .studentName(gm.getStudent().getFullName())
                            .status("PRESENT")
                            .build());
                }
            }
        }
        if (studentCount == 0) {
            studentCount = itemDtos.size();
        }

        return LessonSessionDto.builder()
                .id(virtualId)
                .scheduleId(s.getId())
                .groupId(s.getStudyGroup() != null ? s.getStudyGroup().getId() : null)
                .groupCode(s.getStudyGroup() != null ? s.getStudyGroup().getGroupCode() : null)
                .gradeLevel(s.getGradeLevel())
                .mentorId(s.getMentor() != null ? s.getMentor().getId() : null)
                .mentorName(s.getMentor() != null ? s.getMentor().getFullName() : null)
                .room(s.getRoom())
                .subject(s.getSubject())
                .topic(s.getTopic())
                .lessonDate(date)
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .status("SCHEDULED")
                .attendanceRecorded(false)
                .presentCount(0)
                .absentCount(0)
                .lateCount(0)
                .excusedCount(0)
                .totalStudents(studentCount)
                .attendanceRecords(itemDtos)
                .build();
    }

    private boolean isTimeOverlap(String start1, String end1, String start2, String end2) {
        LocalTime s1 = LocalTime.parse(start1);
        LocalTime e1 = LocalTime.parse(end1);
        LocalTime s2 = LocalTime.parse(start2);
        LocalTime e2 = LocalTime.parse(end2);
        return s1.isBefore(e2) && e1.isAfter(s2);
    }

    private void validateTimes(String startTime, String endTime) {
        try {
            LocalTime s = LocalTime.parse(startTime.trim());
            LocalTime e = LocalTime.parse(endTime.trim());
            if (!s.isBefore(e)) {
                throw new BusinessException("Dars tugash vaqti boshlanish vaqtidan kechroq bo'lishi kerak (" + startTime + " >= " + endTime + ")");
            }
        } catch (Exception ex) {
            if (ex instanceof BusinessException) throw ex;
            throw new BusinessException("Vaqt formati noto'g'ri (HH:mm bo'lishi kerak, masalan: 15:00)");
        }
    }

    public LessonSessionDto toDto(LessonSession s) {
        List<AttendanceRecord> records = attendanceRecordRepository.findByLessonSessionId(s.getId());

        int present = 0, absent = 0, late = 0, excused = 0;
        List<AttendanceItemDto> itemDtos = new ArrayList<>();

        for (AttendanceRecord r : records) {
            switch (r.getStatus()) {
                case "PRESENT" -> present++;
                case "ABSENT" -> absent++;
                case "LATE" -> late++;
                case "EXCUSED" -> excused++;
            }
            itemDtos.add(AttendanceItemDto.builder()
                    .studentId(r.getStudent() != null ? r.getStudent().getId() : null)
                    .studentName(r.getStudent() != null ? r.getStudent().getFullName() : null)
                    .status(r.getStatus())
                    .notes(r.getNotes())
                    .build());
        }

        // If attendance not recorded yet, populate student roster from active group members
        if (itemDtos.isEmpty() && s.getGroup() != null) {
            List<GroupMembership> members = groupMembershipRepository.findByGroupIdAndStatus(s.getGroup().getId(), "ACTIVE");
            for (GroupMembership gm : members) {
                itemDtos.add(AttendanceItemDto.builder()
                        .studentId(gm.getStudent().getId())
                        .studentName(gm.getStudent().getFullName())
                        .status("PRESENT") // default when sheet opens
                        .build());
            }
        }

        int total = s.getGroup() != null && s.getGroup().getStudentCount() != null ? s.getGroup().getStudentCount() : itemDtos.size();

        return LessonSessionDto.builder()
                .id(s.getId())
                .scheduleId(s.getSchedule() != null ? s.getSchedule().getId() : null)
                .groupId(s.getGroup() != null ? s.getGroup().getId() : null)
                .groupCode(s.getGroup() != null ? s.getGroup().getGroupCode() : null)
                .gradeLevel(s.getGroup() != null ? s.getGroup().getGradeLevel() : null)
                .mentorId(s.getMentor() != null ? s.getMentor().getId() : null)
                .mentorName(s.getMentor() != null ? s.getMentor().getFullName() : null)
                .room(s.getRoom())
                .subject(s.getSubject())
                .topic(s.getTopic())
                .lessonDate(s.getLessonDate())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .status(s.getStatus())
                .cancellationReason(s.getCancellationReason())
                .notes(s.getNotes())
                .isManuallyModified(s.getIsManuallyModified())
                .timeSlotId(s.getTimeSlot() != null ? s.getTimeSlot().getId() : null)
                .shiftName(s.getTimeSlot() != null ? s.getTimeSlot().getName() : null)
                .attendanceRecorded(!records.isEmpty())
                .presentCount(present)
                .absentCount(absent)
                .lateCount(late)
                .excusedCount(excused)
                .totalStudents(total)
                .attendanceRecords(itemDtos)
                .build();
    }
}
