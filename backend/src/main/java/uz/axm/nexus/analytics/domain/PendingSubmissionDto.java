package uz.axm.nexus.analytics.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingSubmissionDto {
    private Long submissionId;
    private Long assignmentId;
    private String title;
    private Long studentId;
    private String studentName;
    private String groupCode;
    private LocalDateTime submittedAt;
    private String timeFormatted;
}
