package uz.axm.nexus.scheduling.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleConflictResponse {
    @Builder.Default
    private boolean success = false;
    @Builder.Default
    private String code = "SCHEDULE_CONFLICT";
    @Builder.Default
    private String errorCode = "SCHEDULE_CONFLICT";
    private String message;
    private List<ConflictDetailDto> conflicts;
}
