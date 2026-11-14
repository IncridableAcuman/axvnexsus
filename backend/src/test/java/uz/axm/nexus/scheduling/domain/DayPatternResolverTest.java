package uz.axm.nexus.scheduling.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import uz.axm.nexus.shared.application.BusinessException;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DayPatternResolverTest {

    @Test
    @DisplayName("1. Odd-day pattern resolves to Monday, Wednesday, Friday")
    void shouldResolveOddDayPattern() {
        List<AcademicWeekday> days = DayPatternResolver.resolve(DayPattern.ODD_DAYS, null);

        assertThat(days).containsExactly(
                AcademicWeekday.MONDAY,
                AcademicWeekday.WEDNESDAY,
                AcademicWeekday.FRIDAY
        );
        assertThat(DayPatternResolver.formatCanonicalDays(days))
                .isEqualTo("Dushanba, Chorshanba, Juma");
        assertThat(DayPatternResolver.inferPattern(days))
                .isEqualTo(DayPattern.ODD_DAYS);
    }

    @Test
    @DisplayName("2. Even-day pattern resolves to Tuesday, Thursday, Saturday")
    void shouldResolveEvenDayPattern() {
        List<AcademicWeekday> days = DayPatternResolver.resolve(DayPattern.EVEN_DAYS, null);

        assertThat(days).containsExactly(
                AcademicWeekday.TUESDAY,
                AcademicWeekday.THURSDAY,
                AcademicWeekday.SATURDAY
        );
        assertThat(DayPatternResolver.formatCanonicalDays(days))
                .isEqualTo("Seshanba, Payshanba, Shanba");
        assertThat(DayPatternResolver.inferPattern(days))
                .isEqualTo(DayPattern.EVEN_DAYS);
    }

    @Test
    @DisplayName("3. All-six-day pattern resolves to all six weekdays (Monday to Saturday)")
    void shouldResolveAllSixDaysPattern() {
        List<AcademicWeekday> days = DayPatternResolver.resolve(DayPattern.ALL_SIX_DAYS, null);

        assertThat(days).containsExactly(
                AcademicWeekday.MONDAY,
                AcademicWeekday.TUESDAY,
                AcademicWeekday.WEDNESDAY,
                AcademicWeekday.THURSDAY,
                AcademicWeekday.FRIDAY,
                AcademicWeekday.SATURDAY
        );
        assertThat(DayPatternResolver.formatCanonicalDays(days))
                .isEqualTo("Dushanba, Seshanba, Chorshanba, Payshanba, Juma, Shanba");
        assertThat(DayPatternResolver.inferPattern(days))
                .isEqualTo(DayPattern.ALL_SIX_DAYS);
    }

    @Test
    @DisplayName("4. Custom pattern resolves to exactly the selected weekdays")
    void shouldResolveCustomPattern() {
        List<AcademicWeekday> days = DayPatternResolver.resolve(
                DayPattern.CUSTOM,
                List.of("Dushanba", "Payshanba")
        );

        assertThat(days).containsExactly(
                AcademicWeekday.MONDAY,
                AcademicWeekday.THURSDAY
        );
        assertThat(DayPatternResolver.formatCanonicalDays(days))
                .isEqualTo("Dushanba, Payshanba");
        assertThat(DayPatternResolver.inferPattern(days))
                .isEqualTo(DayPattern.CUSTOM);
    }

    @Test
    @DisplayName("5. Empty custom selection is rejected")
    void shouldRejectEmptyCustomSelection() {
        assertThatThrownBy(() -> DayPatternResolver.resolve(DayPattern.CUSTOM, Collections.emptyList()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("kamida bitta dars kuni");

        assertThatThrownBy(() -> DayPatternResolver.resolve(DayPattern.CUSTOM, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("kamida bitta dars kuni");
    }

    @Test
    @DisplayName("6. Unsupported Sunday selection is rejected")
    void shouldRejectSundayInAcademicWeek() {
        assertThatThrownBy(() -> DayPatternResolver.resolve(DayPattern.CUSTOM, List.of("Yakshanba")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Yakshanba 6 kunlik akademik haftaga kirmaydi");

        assertThatThrownBy(() -> DayPatternResolver.resolve(DayPattern.CUSTOM, List.of("Sunday")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Yakshanba 6 kunlik akademik haftaga kirmaydi");

        assertThatThrownBy(() -> DayPatternResolver.matchSingleWeekday("Воскресенье"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Yakshanba 6 kunlik akademik haftaga kirmaydi");
    }

    @Test
    @DisplayName("Weekday overlap: Odd days and Even days do NOT overlap")
    void oddAndEvenDaysShouldNeverOverlap() {
        boolean overlaps = DayPatternResolver.hasWeekdayOverlap(
                DayPatternResolver.ODD_WEEKDAYS,
                DayPatternResolver.EVEN_WEEKDAYS
        );
        assertThat(overlaps).isFalse();
    }

    @Test
    @DisplayName("Weekday overlap: Odd days and All-Six-Days DO overlap")
    void oddAndAllSixDaysShouldOverlap() {
        boolean overlaps = DayPatternResolver.hasWeekdayOverlap(
                DayPatternResolver.ODD_WEEKDAYS,
                DayPatternResolver.ALL_SIX_WEEKDAYS
        );
        assertThat(overlaps).isTrue();
    }

    @Test
    @DisplayName("Time validation: validates valid ranges and rejects start >= end")
    void shouldValidateTimeRange() {
        // Valid
        DayPatternResolver.validateTimeRange("14:00", "15:30");
        DayPatternResolver.validateTimeRange("09:00", "10:30");

        // Invalid: start >= end
        assertThatThrownBy(() -> DayPatternResolver.validateTimeRange("16:00", "15:00"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("kechroq bo'lishi kerak");

        assertThatThrownBy(() -> DayPatternResolver.validateTimeRange("15:00", "15:00"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("kechroq bo'lishi kerak");

        // Invalid format
        assertThatThrownBy(() -> DayPatternResolver.validateTimeRange("invalid", "15:00"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Vaqt formati noto'g'ri");
    }

    @Test
    @DisplayName("Time overlap: detects overlapping intervals and ignores non-overlapping")
    void shouldDetectTimeOverlaps() {
        // 14:00-15:30 overlaps with 15:00-16:30
        assertThat(DayPatternResolver.isTimeOverlap("14:00", "15:30", "15:00", "16:30")).isTrue();

        // 14:00-15:00 does not overlap with 15:00-16:00 (back-to-back)
        assertThat(DayPatternResolver.isTimeOverlap("14:00", "15:00", "15:00", "16:00")).isFalse();

        // 14:00-15:00 does not overlap with 16:00-17:00
        assertThat(DayPatternResolver.isTimeOverlap("14:00", "15:00", "16:00", "17:00")).isFalse();
    }
}
