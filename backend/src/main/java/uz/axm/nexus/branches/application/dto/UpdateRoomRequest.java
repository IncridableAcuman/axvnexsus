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
public class UpdateRoomRequest {

    @NotBlank(message = "Xona nomi kiritilishi shart")
    @Size(max = 100, message = "Xona nomi 100 belgidan oshmasligi kerak")
    private String name;

    private String roomType;

    @NotNull(message = "Xona sig'imi kiritilishi shart")
    @Min(value = 1, message = "Xona sig'imi kamida 1 bo'lishi kerak")
    private Integer capacity;

    private String status;
}
