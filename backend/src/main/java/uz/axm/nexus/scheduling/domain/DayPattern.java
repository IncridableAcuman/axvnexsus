package uz.axm.nexus.scheduling.domain;

/**
 * 6 kunlik akademik hafta dars kunlari modeli:
 * - ODD_DAYS: Toq kunlar (Dushanba, Chorshanba, Juma)
 * - EVEN_DAYS: Juft kunlar (Seshanba, Payshanba, Shanba)
 * - ALL_SIX_DAYS: Barcha 6 kun (Dushanba - Shanba)
 * - CUSTOM: Maxsus (foydalanuvchi tanlagan kunlar)
 */
public enum DayPattern {
    ODD_DAYS,
    EVEN_DAYS,
    ALL_SIX_DAYS,
    CUSTOM
}
