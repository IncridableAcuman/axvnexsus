package uz.axm.nexus.scheduling.domain;

import uz.axm.nexus.shared.application.BusinessException;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 6 kunlik akademik hafta dars kunlarini aniqlash, tekshirish va formatlash yordamchisi.
 */
public final class DayPatternResolver {

    public static final List<AcademicWeekday> ODD_WEEKDAYS = List.of(
            AcademicWeekday.MONDAY,
            AcademicWeekday.WEDNESDAY,
            AcademicWeekday.FRIDAY
    );

    public static final List<AcademicWeekday> EVEN_WEEKDAYS = List.of(
            AcademicWeekday.TUESDAY,
            AcademicWeekday.THURSDAY,
            AcademicWeekday.SATURDAY
    );

    public static final List<AcademicWeekday> ALL_SIX_WEEKDAYS = List.of(
            AcademicWeekday.MONDAY,
            AcademicWeekday.TUESDAY,
            AcademicWeekday.WEDNESDAY,
            AcademicWeekday.THURSDAY,
            AcademicWeekday.FRIDAY,
            AcademicWeekday.SATURDAY
    );

    private DayPatternResolver() {}

    /**
     * Berilgan rejim (pattern) va ixtiyoriy tanlangan kunlar ro'yxatidan kanonik kunlar to'plamini hosil qiladi.
     */
    public static List<AcademicWeekday> resolve(DayPattern pattern, List<String> customDayNames) {
        if (pattern == null) {
            if (customDayNames != null && !customDayNames.isEmpty()) {
                pattern = DayPattern.CUSTOM;
            } else {
                pattern = DayPattern.ODD_DAYS;
            }
        }

        switch (pattern) {
            case ODD_DAYS:
                return ODD_WEEKDAYS;
            case EVEN_DAYS:
                return EVEN_WEEKDAYS;
            case ALL_SIX_DAYS:
                return ALL_SIX_WEEKDAYS;
            case CUSTOM:
                return resolveCustomDays(customDayNames);
            default:
                throw new BusinessException("Noma'lum dars jadvali turi: " + pattern);
        }
    }

    /**
     * Maxsus (CUSTOM) kunlarni tekshirish va konvertatsiya qilish.
     */
    public static List<AcademicWeekday> resolveCustomDays(List<String> rawDays) {
        if (rawDays == null || rawDays.isEmpty()) {
            throw new BusinessException("Maxsus kunlar tanlanganda kamida bitta dars kuni tanlanishi shart!");
        }

        Set<AcademicWeekday> resolved = new LinkedHashSet<>();
        for (String raw : rawDays) {
            if (raw == null || raw.isBlank()) continue;
            AcademicWeekday day = matchSingleWeekday(raw.trim());
            resolved.add(day);
        }

        if (resolved.isEmpty()) {
            throw new BusinessException("Kamida bitta to'g'ri dars kuni tanlanishi shart!");
        }

        // 6 kunlik tartibda saralash
        return ALL_SIX_WEEKDAYS.stream()
                .filter(resolved::contains)
                .collect(Collectors.toList());
    }

    /**
     * Bitta kun nomini aniqlash. Yakshanba kelsa rad etiladi.
     */
    public static AcademicWeekday matchSingleWeekday(String name) {
        String norm = name.trim().toLowerCase();

        // Yakshanba tekshiruvi (6 kunlik standartda taqiqlangan)
        if (norm.contains("yakshanba") || norm.contains("sunday") || norm.contains("воскресенье") || norm.equals("sun")) {
            throw new BusinessException("Yakshanba 6 kunlik akademik haftaga kirmaydi! Faqat Dushanba - Shanba kunlari ruxsat etilgan.");
        }

        if (norm.contains("dush") || norm.contains("mon") || norm.contains("понедельник")) {
            return AcademicWeekday.MONDAY;
        }
        if (norm.contains("sesh") || norm.contains("tue") || norm.contains("вторник")) {
            return AcademicWeekday.TUESDAY;
        }
        if (norm.contains("chor") || norm.contains("wed") || norm.contains("среда") || norm.contains("cреда")) {
            return AcademicWeekday.WEDNESDAY;
        }
        if (norm.contains("pay") || norm.contains("thu") || norm.contains("четверг")) {
            return AcademicWeekday.THURSDAY;
        }
        if (norm.contains("jum") || norm.contains("fri") || norm.contains("пятница")) {
            return AcademicWeekday.FRIDAY;
        }
        if (norm.contains("shan") || norm.contains("sat") || norm.contains("суббота")) {
            return AcademicWeekday.SATURDAY;
        }

        throw new BusinessException("Noto'g'ri dars kuni ko'rsatilgan: '" + name + "'. Faqat Dushanbadan Shanbagacha ruxsat etilgan.");
    }

    /**
     * Mavjud matnli kunlar qatorini (masalan: "Dushanba, Chorshanba, Juma" yoki "Seshanba-Payshanba-Shanba")
     * tahlil qilib AcademicWeekday lar ro'yxatiga aylantirish.
     */
    public static List<AcademicWeekday> parseWeekdays(String daysString) {
        if (daysString == null || daysString.isBlank()) {
            return Collections.emptyList();
        }

        String lower = daysString.toLowerCase().trim();

        // Shortcut tekshiruvlar
        if (lower.contains("toq") || lower.equals("odd_days")) {
            return ODD_WEEKDAYS;
        }
        if (lower.contains("juft") || lower.equals("even_days")) {
            return EVEN_WEEKDAYS;
        }
        if (lower.contains("barcha") || lower.contains("hamma") || lower.equals("all_six_days")) {
            return ALL_SIX_WEEKDAYS;
        }

        // Ajratuvchilar bo'yicha bo'lish (vergul, tire, nuqta, slash, probel)
        String[] parts = daysString.split("[,\\-•/;|\\n]+");
        Set<AcademicWeekday> found = new LinkedHashSet<>();

        for (String p : parts) {
            String trimmed = p.trim();
            if (trimmed.isEmpty()) continue;
            try {
                AcademicWeekday day = matchSingleWeekday(trimmed);
                found.add(day);
            } catch (BusinessException ignored) {
                // Matnda noma'lum so'z bo'lsa o'tkazib yuborish
            }
        }

        return ALL_SIX_WEEKDAYS.stream()
                .filter(found::contains)
                .collect(Collectors.toList());
    }

    /**
     * Kunlar to'plamini standart o'zbek tilidagi kanonik qatorga formatlash:
     * Masalan: "Dushanba, Chorshanba, Juma"
     */
    public static String formatCanonicalDays(Collection<AcademicWeekday> weekdays) {
        if (weekdays == null || weekdays.isEmpty()) {
            return "";
        }

        return ALL_SIX_WEEKDAYS.stream()
                .filter(weekdays::contains)
                .map(AcademicWeekday::getUzbekName)
                .collect(Collectors.joining(", "));
    }

    /**
     * Kunlar to'plamiga qarab mos DayPattern ni aniqlash.
     */
    public static DayPattern inferPattern(Collection<AcademicWeekday> weekdays) {
        if (weekdays == null || weekdays.isEmpty()) {
            return DayPattern.CUSTOM;
        }
        Set<AcademicWeekday> set = new HashSet<>(weekdays);
        if (set.equals(new HashSet<>(ODD_WEEKDAYS))) {
            return DayPattern.ODD_DAYS;
        }
        if (set.equals(new HashSet<>(EVEN_WEEKDAYS))) {
            return DayPattern.EVEN_DAYS;
        }
        if (set.equals(new HashSet<>(ALL_SIX_WEEKDAYS))) {
            return DayPattern.ALL_SIX_DAYS;
        }
        return DayPattern.CUSTOM;
    }

    /**
     * Ikki kunlar to'plamida umumiy kun (overlap) bor-yo'qligini tekshirish.
     */
    public static boolean hasWeekdayOverlap(Collection<AcademicWeekday> set1, Collection<AcademicWeekday> set2) {
        if (set1 == null || set2 == null || set1.isEmpty() || set2.isEmpty()) {
            return false;
        }
        for (AcademicWeekday day : set1) {
            if (set2.contains(day)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Ikkita dars vaqt oralig'i to'qnashishini (overlap) tekshirish.
     */
    public static boolean isTimeOverlap(String start1, String end1, String start2, String end2) {
        LocalTime s1 = LocalTime.parse(start1.trim());
        LocalTime e1 = LocalTime.parse(end1.trim());
        LocalTime s2 = LocalTime.parse(start2.trim());
        LocalTime e2 = LocalTime.parse(end2.trim());
        return s1.isBefore(e2) && e1.isAfter(s2);
    }

    /**
     * Boshlanish va tugash vaqtlarini tekshirish (HH:mm format va start < end).
     */
    public static void validateTimeRange(String startTime, String endTime) {
        if (startTime == null || startTime.trim().isBlank()) {
            throw new BusinessException("Dars boshlanish vaqti ko'rsatilishi shart!");
        }
        if (endTime == null || endTime.trim().isBlank()) {
            throw new BusinessException("Dars tugash vaqti ko'rsatilishi shart!");
        }

        try {
            LocalTime s = LocalTime.parse(startTime.trim());
            LocalTime e = LocalTime.parse(endTime.trim());
            if (!s.isBefore(e)) {
                throw new BusinessException("Dars tugash vaqti boshlanish vaqtidan kechroq bo'lishi kerak (" + startTime + " >= " + endTime + ")");
            }
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            throw new BusinessException("Vaqt formati noto'g'ri (masalan: 15:00 yoki 16:30)");
        }
    }
}
