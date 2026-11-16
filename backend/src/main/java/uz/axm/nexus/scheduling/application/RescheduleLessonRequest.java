package uz.axm.nexus.scheduling.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RescheduleLessonRequest {
    @NotNull(message = "Yangi dars sanasi shart")
    private LocalDate newDate;

    @NotBlank(message = "Yangi boshlanish vaqti shart")
    private String newStartTime;

    @NotBlank(message = "Yangi tugash vaqti shart")
    private String newEndTime;

    private String newRoom;

    private Long newMentorId;

    private String reason;
}
