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
public class MentorDashboardDto {
    private Long mentorId;
    private String mentorName;
    private String role;
    private String branchLocation;

    // Top KPIs
    private Integer todayLessonsCount;
    private Integer assignedGroupsCount;
    private Integer assignedStudentsCount;
    private Double todayAttendanceRate;
    private Integer pendingGradingCount;

    // Next lesson countdown
    private ScheduledSessionDto nextLesson;

    // Schedules and submissions
    private List<ScheduledSessionDto> todayLessons;
    private List<PendingSubmissionDto> pendingReviews;
    private List<TrendDataPointDto> weeklyAttendanceTrend;

    // Student growth metrics
    private Double theoryMasteryRate;
    private Double codingPracticeRate;
    private Double miniProjectRate;
}
