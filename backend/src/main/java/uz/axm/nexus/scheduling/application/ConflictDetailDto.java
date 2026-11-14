package uz.axm.nexus.scheduling.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConflictDetailDto {
    private String type; // "CLASSROOM", "MENTOR", "GROUP", "BRANCH"
    private String weekday; // "MONDAY", "TUESDAY", etc.
    private String resourceName; // e.g. "IT Lab 1" or "Abdurasharipov Izzatbek"
    private String existingGroupCode; // "YA-26I0804"
    private String startTime; // "15:00"
    private String endTime; // "16:30"
}
