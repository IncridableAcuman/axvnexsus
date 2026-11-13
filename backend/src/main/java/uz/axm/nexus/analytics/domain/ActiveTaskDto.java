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
public class ActiveTaskDto {
    private Long id;
    private String title;
    private String subject;
    private String deadline;
    private LocalDateTime dueDate;
    private Boolean urgent;
    private String type; // "ASSIGNMENT" or "ASSESSMENT"
    private Boolean isSubmitted;
    private Double score;
}
