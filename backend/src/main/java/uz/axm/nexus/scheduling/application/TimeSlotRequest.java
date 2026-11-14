package uz.axm.nexus.scheduling.application;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeSlotRequest {

    @NotBlank(message = "Dars vaqti nomi ko'rsatilishi shart")
    private String name;

    @NotBlank(message = "Boshlanish vaqti ko'rsatilishi shart")
    private String startTime;

    @NotBlank(message = "Tugash vaqti ko'rsatilishi shart")
    private String endTime;

    private Integer durationMinutes;
    private Integer displayOrder;
    private Boolean active;
    private String description;
    private Long branchId;
}
