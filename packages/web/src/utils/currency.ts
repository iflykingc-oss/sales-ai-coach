export interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number; // Rate from CNY
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  CNY: { code: 'CNY', symbol: '¥', rate: 1, locale: 'zh-CN' },
  USD: { code: 'USD', symbol: '$', rate: 0.14, locale: 'en-US' },
  SGD: { code: 'SGD', symbol: 'S$', rate: 0.19, locale: 'en-SG' },
  MYR: { code: 'MYR', symbol: 'RM', rate: 0.65, locale: 'ms-MY' },
  THB: { code: 'THB', symbol: '฿', rate: 4.9, locale: 'th-TH' },
  VND: { code: 'VND', symbol: '₫', rate: 3400, locale: 'vi-VN' },
  IDR: { code: 'IDR', symbol: 'Rp', rate: 2200, locale: 'id-ID' },
};

export const LOCALE_CURRENCY_MAP: Record<string, string> = {
  zh: 'CNY',
  en: 'USD',
  th: 'THB',
  vi: 'VND',
  ms: 'MYR',
  id: 'IDR',
};

export function getCurrencyForLocale(locale: string): CurrencyConfig {
  const currencyCode = LOCALE_CURRENCY_MAP[locale] || 'USD';
  return CURRENCIES[currencyCode];
}

export function formatPrice(priceCNY: number, locale: string): string {
  if (priceCNY === -1) return '';
  if (priceCNY === 0) return locale === 'zh' ? '免费' : 'Free';

  const currency = getCurrencyForLocale(locale);
  const converted = Math.round(priceCNY * currency.rate);

  // Special formatting for VND and IDR (no decimals)
  if (currency.code === 'VND' || currency.code === 'IDR') {
    return `${currency.symbol}${converted.toLocaleString()}`;
  }

  return `${currency.symbol}${converted}`;
}

export function getCurrencySymbol(locale: string): string {
  return getCurrencyForLocale(locale).symbol;
}
