package uz.axm.nexus.scheduling.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonSessionDto {
    private Long id;
    private Long scheduleId;
    private Long groupId;
    private String groupCode;
    private String gradeLevel;
    private Long mentorId;
    private String mentorName;
    private String room;
    private String subject;
    private String topic;
    private LocalDate lessonDate;
    private String startTime;
    private String endTime;
    private String status;
    private String cancellationReason;
    private String notes;
    private Boolean isManuallyModified;
    private Long timeSlotId;
    private String shiftName;
    private boolean attendanceRecorded;
    private int presentCount;
    private int absentCount;
    private int lateCount;
    private int excusedCount;
    private int totalStudents;
    private List<AttendanceItemDto> attendanceRecords;
}
