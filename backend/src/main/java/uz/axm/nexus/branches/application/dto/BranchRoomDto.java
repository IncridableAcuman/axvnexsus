package uz.axm.nexus.branches.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchRoomDto {
    private Long id;
    private String name;
    private Long branchId;
    private String branchName;
    private String roomType; // "IT_LAB", "THEORY_ROOM", "ROBOTICS_LAB", "CONFERENCE_HALL"
    private int capacity;
    private String status; // "ACTIVE", "MAINTENANCE", "INACTIVE"
    private int currentOccupancy;
    private List<String> assignedGroups;
    private String availabilityStatus; // "AVAILABLE", "OCCUPIED", "OVERLOADED"
}
