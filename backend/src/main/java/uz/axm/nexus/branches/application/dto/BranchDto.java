package uz.axm.nexus.branches.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchDto {
    private Long id;
    private String name;
    private String code;
    private String description;
    private String region;
    private String district;
    private String address;
    private String phone;
    private String email;
    private String status;
    private long studentCount;
    private long groupCount;
    private long mentorCount;
    private long roomCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
