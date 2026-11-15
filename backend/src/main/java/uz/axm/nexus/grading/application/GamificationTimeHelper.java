package uz.axm.nexus.grading.application;

import org.springframework.stereotype.Component;

import java.time.*;
import java.time.temporal.TemporalAdjusters;

@Component
public class GamificationTimeHelper {

    public static final ZoneId ACADEMIC_ZONE = ZoneId.of("Asia/Tashkent");

    public ZoneId getAcademicZone() {
        return ACADEMIC_ZONE;
    }

    public LocalDate getCurrentAcademicDate() {
        return LocalDate.now(ACADEMIC_ZONE);
    }

    public LocalDateTime getCurrentAcademicDateTime() {
        return LocalDateTime.now(ACADEMIC_ZONE);
    }

    public LocalDateTime getStartOfWeek() {
        LocalDate today = getCurrentAcademicDate();
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return monday.atStartOfDay();
    }

    public LocalDateTime getStartOfMonth() {
        LocalDate today = getCurrentAcademicDate();
        LocalDate firstDay = today.withDayOfMonth(1);
        return firstDay.atStartOfDay();
    }

    public LocalDateTime getStartOfDay(LocalDate date) {
        return date.atStartOfDay();
    }

    public LocalDateTime getEndOfDay(LocalDate date) {
        return date.atTime(LocalTime.MAX);
    }
}
