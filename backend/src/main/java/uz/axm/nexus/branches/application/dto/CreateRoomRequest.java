package uz.axm.nexus.branches.application.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoomRequest {

    @NotBlank(message = "Xona nomi kiritilishi shart")
    @Size(max = 100, message = "Xona nomi 100 belgidan oshmasligi kerak")
    private String name;

    @Builder.Default
    private String roomType = "IT_LAB"; // "IT_LAB", "THEORY_ROOM", "ROBOTICS_LAB", "CONFERENCE_HALL"

    @NotNull(message = "Xona sig'imi kiritilishi shart")
    @Min(value = 1, message = "Xona sig'imi kamida 1 bo'lishi kerak")
    @Builder.Default
    private Integer capacity = 16;

    @Builder.Default
    private String status = "ACTIVE"; // "ACTIVE", "MAINTENANCE", "INACTIVE"
}
