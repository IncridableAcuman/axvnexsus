import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { SupportedLocale } from '@/types';
import { uz } from './locales/uz';
import { ru } from './locales/ru';
import { en } from './locales/en';
import { formatLocalizedDate, formatLocalizedNumber, formatRelativeTime } from './formatters';
import { userPreferenceApi } from '@/api';

const DICTIONARIES: Record<SupportedLocale, typeof uz> = {
  uz,
  ru,
  en,
};

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale) => Promise<void>;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  formatDate: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatRelative: (date: string | Date) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'axm_nexus_locale';

/**
 * 4-Tier Language Resolution Strategy:
 * 1. Authenticated user's saved language (backend/stored session)
 * 2. Previously selected local language (localStorage)
 * 3. Browser language (uz-*, ru-*, en-*)
 * 4. Default Uzbek fallback ('uz')
 */
const resolveInitialLocale = (): SupportedLocale => {
  if (typeof window === 'undefined') return 'uz';

  // 1. Authenticated user stored session preference
  try {
    const storedUserStr = localStorage.getItem('axm_nexus_user');
    if (storedUserStr) {
      const storedUser = JSON.parse(storedUserStr);
      if (storedUser?.locale && (storedUser.locale === 'uz' || storedUser.locale === 'ru' || storedUser.locale === 'en')) {
        return storedUser.locale;
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  // 2. Previously selected local storage language
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
    if (saved && (saved === 'uz' || saved === 'ru' || saved === 'en')) {
      return saved;
    }
  } catch {
    // Ignore localStorage access errors
  }

  // 3. Browser language
  try {
    const isTest =
      Boolean((import.meta as any).env?.MODE === 'test') ||
      Boolean((globalThis as any).process?.env?.NODE_ENV === 'test') ||
      Boolean((globalThis as any).process?.env?.VITEST);
    if (!isTest) {
      const navLang = navigator.language?.toLowerCase() || '';
      if (navLang.startsWith('ru')) return 'ru';
      if (navLang.startsWith('en')) return 'en';
      if (navLang.startsWith('uz')) return 'uz';
    }
  } catch {
    // Ignore navigator access errors
  }

  // 4. Fallback
  return 'uz';
};

export const resolveTranslation = (
  dict: any,
  locale: SupportedLocale,
  keyPath: string,
  params?: Record<string, string | number>
): string => {
  const keys = keyPath.split('.');
  let current: any = dict;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      // Fallback to Uzbek if translation missing in Russian or English
      let fallback: any = DICTIONARIES.uz;
      for (const fbKey of keys) {
        if (fallback && typeof fallback === 'object' && fbKey in fallback) {
          fallback = fallback[fbKey];
        } else {
          fallback = undefined;
          break;
        }
      }

      if (fallback !== undefined) {
        current = fallback;
      } else {
        if ((import.meta as any).env?.DEV) {
          console.warn(`[i18n] Missing translation key: "${keyPath}" for locale: "${locale}"`);
        }
        return keyPath;
      }
      break;
    }
  }

  // Pluralization handling: if target is an object with plural forms (one/few/many/other)
  if (typeof current === 'object' && current !== null && params && typeof params.count === 'number') {
    const pluralRule = new Intl.PluralRules(locale).select(params.count);
    if (current[pluralRule]) {
      current = current[pluralRule];
    } else if (current.other) {
      current = current.other;
    }
  }

  if (typeof current !== 'string') {
    return keyPath;
  }

  if (!params) {
    return current;
  }

  // Replace both {paramName} and {{paramName}}
  return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
    return str
      .replaceAll(`{${paramKey}}`, String(paramVal))
      .replaceAll(`{{${paramKey}}}`, String(paramVal));
  }, current);
};

export const I18nProvider: React.FC<{ children: React.ReactNode; initialLocale?: SupportedLocale }> = ({
  children,
  initialLocale,
}) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => initialLocale || resolveInitialLocale());

  // Synchronize on mount if authenticated user has backend preference
  useEffect(() => {
    let isMounted = true;
    const fetchRemotePreference = async () => {
      try {
        const storedUser = localStorage.getItem('axm_nexus_user');
        if (storedUser) {
          const res = await userPreferenceApi.getPreferences();
          const remoteLocale = res.data?.data?.locale as SupportedLocale;
          if (remoteLocale && (remoteLocale === 'uz' || remoteLocale === 'ru' || remoteLocale === 'en')) {
            if (isMounted) {
              setLocaleState(remoteLocale);
              localStorage.setItem(STORAGE_KEY, remoteLocale);
              document.documentElement.lang = remoteLocale;
            }
          }
        }
      } catch {
        // Silent fail if unauthenticated or offline
      }
    };

    fetchRemotePreference();
    return () => {
      isMounted = false;
    };
  }, []);

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;

      // Synchronize with backend user preference
      try {
        const storedUser = localStorage.getItem('axm_nexus_user');
        if (storedUser) {
          await userPreferenceApi.updatePreferences({ locale: newLocale });
        }
      } catch {
        // Silent fail if unauthenticated or offline
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Nested translation resolver with Pluralization and Interpolation
  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>): string => {
      const dict = DICTIONARIES[locale] || DICTIONARIES.uz;
      return resolveTranslation(dict, locale, keyPath, params);
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => {
      return formatLocalizedDate(date, locale, options);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return formatLocalizedNumber(value, locale, options);
    },
    [locale]
  );

  const formatRelative = useCallback(
    (date: string | Date) => {
      return formatRelativeTime(date, locale);
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatDate,
      formatNumber,
      formatRelative,
    }),
    [locale, setLocale, t, formatDate, formatNumber, formatRelative]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback safe context using default uz locale to prevent crashes in standalone tests
    return {
      locale: 'uz',
      setLocale: async () => {},
      t: (k: string, p?: Record<string, string | number>) => resolveTranslation(DICTIONARIES.uz, 'uz', k, p),
      formatDate: (d: string | Date | number, o?: Intl.DateTimeFormatOptions) => formatLocalizedDate(d, 'uz', o),
      formatNumber: (n: number, o?: Intl.NumberFormatOptions) => formatLocalizedNumber(n, 'uz', o),
      formatRelative: (d: string | Date) => formatRelativeTime(d, 'uz'),
    };
  }
  return context;
};
