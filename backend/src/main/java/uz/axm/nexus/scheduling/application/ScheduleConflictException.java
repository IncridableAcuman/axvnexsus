package uz.axm.nexus.scheduling.application;

import lombok.Getter;
import uz.axm.nexus.shared.application.BusinessException;

import java.util.List;

@Getter
public class ScheduleConflictException extends BusinessException {
    private final String code = "SCHEDULE_CONFLICT";
    private final List<ConflictDetailDto> conflicts;

    public ScheduleConflictException(String message, List<ConflictDetailDto> conflicts) {
        super(message);
        this.conflicts = (conflicts != null) ? conflicts : List.of();
    }
}
