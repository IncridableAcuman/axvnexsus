package uz.axm.nexus.scheduling.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictDetailDto {
    private String type; // "CLASSROOM", "MENTOR", "GROUP", "BRANCH"
    private String weekday; // "MONDAY", "TUESDAY", etc.
    private LocalDate conflictingDate; // Concrete calendar date e.g. 2026-11-02
    private String resourceName; // e.g. "IT Lab 1" or "Abdurasharipov Izzatbek"
    private String existingGroupCode; // "YA-26I0804"
    private Long existingScheduleId; // ID of conflicting schedule if known
    private String startTime; // "15:00"
    private String endTime; // "16:30"
}
