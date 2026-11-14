package uz.axm.nexus.scheduling.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.DayOfWeek;

/**
 * 6 kunlik akademik haftaning kanonik kunlari.
 * Yakshanba ushbu akademik modelga kirmaydi.
 */
@Getter
@RequiredArgsConstructor
public enum AcademicWeekday {
    MONDAY(DayOfWeek.MONDAY, "Dushanba", "Понедельник", "Monday", true),
    TUESDAY(DayOfWeek.TUESDAY, "Seshanba", "Вторник", "Tuesday", false),
    WEDNESDAY(DayOfWeek.WEDNESDAY, "Chorshanba", "Среda", "Wednesday", true),
    THURSDAY(DayOfWeek.THURSDAY, "Payshanba", "Четверг", "Thursday", false),
    FRIDAY(DayOfWeek.FRIDAY, "Juma", "Пятница", "Friday", true),
    SATURDAY(DayOfWeek.SATURDAY, "Shanba", "Суббота", "Saturday", false);

    private final DayOfWeek dayOfWeek;
    private final String uzbekName;
    private final String russianName;
    private final String englishName;
    private final boolean oddDay; // true = Toq kun, false = Juft kun
}
