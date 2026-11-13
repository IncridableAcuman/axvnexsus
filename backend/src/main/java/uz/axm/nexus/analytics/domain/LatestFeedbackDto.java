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
public class LatestFeedbackDto {
    private String subject;
    private String topic;
    private Double score;
    private Double maxScore;
    private String mentorFeedback;
    private String mentorName;
    private LocalDateTime gradedAt;
    private String formattedDate;
}
