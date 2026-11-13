package uz.axm.nexus.analytics.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomOccupancyDto {
    private Long roomId;
    private String name; // e.g. "IT Lab 1 — Web Full-Stack"
    private String branchLocation;
    private Integer used; // currently occupied seats / active students in session
    private Integer total; // capacity, e.g. 24 or 16
    private Double percent; // e.g. 100.0
    private String indicator; // "bg-blue-500", "bg-indigo-500", etc.
}
