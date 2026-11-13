package uz.axm.nexus.analytics.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardDto {
    private Integer totalActiveStudents;
    private Integer totalMentors;
    private Integer totalGroups;
    private Integer totalScheduledLessons;
    private Double systemAttendanceRate;
    private Double systemAverageScore;
    private Integer totalCompletedLessons;
    private Integer totalSubmittedAssignments;
    private Integer totalEvaluatedAssessments;

    // Attendance breakdown
    private Integer presentCount;
    private Integer lateCount;
    private Integer excusedCount;
    private Integer absentCount;

    // Charts & breakdowns
    private List<DailyAttendanceDto> weeklyAttendance;
    private List<RoomOccupancyDto> roomOccupancy;
    private List<GroupComparisonDto> groupPerformance;
    private Map<String, Integer> enrollmentByGrade;
    private List<TrendDataPointDto> systemTrend;
    private MetricRuleDocumentationDto ruleDocumentation;
}
