package uz.axm.nexus.analytics.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDashboardDto {
    private Long studentId;
    private String studentName;
    private String studentIdNumber;
    private String gradeLevel;
    private Long groupId;
    private String groupCode;
    private String mentorName;
    private String branchLocation;

    // Gamification info
    private Integer level;
    private Integer totalPoints; // XP
    private Integer rank;
    private Integer currentStreak;
    private Integer longestStreak;
    private Integer nextLevelXp;
    private Integer badgesCount;

    // KPIs
    private Double gpa; // Overall average score
    private Double courseProgress; // Percentage of completed curriculum lessons
    private Double attendanceRate;
    private Integer presentCount;
    private Integer lateCount;
    private Integer excusedCount;
    private Integer absentCount;

    // Today's lesson & approaching deadlines
    private ScheduledSessionDto todayLesson;
    private List<ActiveTaskDto> activeTasks;

    // Latest quiz feedback
    private LatestFeedbackDto latestFeedback;
}
