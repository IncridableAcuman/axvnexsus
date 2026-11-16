package uz.axm.nexus.scheduling.domain;

/**
 * Takrorlanuvchi dars jadvali (Recurring Schedule) holatlari:
 * - ACTIVE: Faol, darslar o'tkazilmoqda
 * - PAUSED: Vaqtincha to'xtatilgan (masalan, ta'tilda)
 * - COMPLETED: Muddat yakunlangan
 * - ARCHIVED: Bekor qilingan / arxivlangan
 */
public enum ScheduleStatus {
    ACTIVE,
    PAUSED,
    COMPLETED,
    ARCHIVED
}
