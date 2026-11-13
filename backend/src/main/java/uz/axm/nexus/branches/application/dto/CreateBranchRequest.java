package uz.axm.nexus.branches.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBranchRequest {

    @NotBlank(message = "Filial nomi kiritilishi shart")
    @Size(max = 150, message = "Filial nomi 150 belgidan oshmasligi kerak")
    private String name;

    @NotBlank(message = "Filial kodi kiritilishi shart")
    @Size(max = 50, message = "Filial kodi 50 belgidan oshmasligi kerak")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Filial kodi faqat lotin harflari, raqamlar va chiziqchadan iborat bo'lishi kerak")
    private String code;

    private String description;

    @NotBlank(message = "Hudud / Viloyat kiritilishi shart")
    @Size(max = 100, message = "Viloyat nomi 100 belgidan oshmasligi kerak")
    private String region;

    @Size(max = 100, message = "Tuman nomi 100 belgidan oshmasligi kerak")
    private String district;

    @Size(max = 255, message = "Manzil 255 belgidan oshmasligi kerak")
    private String address;

    @Size(max = 50, message = "Telefon raqami 50 belgidan oshmasligi kerak")
    private String phone;

    @Size(max = 100, message = "Email 100 belgidan oshmasligi kerak")
    private String email;

    @Builder.Default
    private String status = "ACTIVE";
}
