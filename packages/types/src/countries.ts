// Multi-country configuration. Nigeria launches first; add countries here, not in app code.

export interface CountryConfig {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dialCode: string;
  currency: string; // ISO 4217
  currencySymbol: string;
  /** Validates the national number (digits only, without dial code or leading 0). */
  nationalNumberPattern: RegExp;
  enabled: boolean;
}

export const COUNTRIES = {
  NG: {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    currency: 'NGN',
    currencySymbol: '₦',
    nationalNumberPattern: /^[789][01]\d{8}$/,
    enabled: true,
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    dialCode: '+233',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    nationalNumberPattern: /^[235]\d{8}$/,
    enabled: false,
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    dialCode: '+254',
    currency: 'KES',
    currencySymbol: 'KSh',
    nationalNumberPattern: /^[17]\d{8}$/,
    enabled: false,
  },
} as const satisfies Record<string, CountryConfig>;

export type CountryCode = keyof typeof COUNTRIES;

export const DEFAULT_COUNTRY: CountryCode = 'NG';

/**
 * Normalises a local or international phone number to E.164
 * (e.g. "0803 123 4567" -> "+2348031234567"). Returns null when invalid for the country.
 */
export function toE164(input: string, country: CountryCode = DEFAULT_COUNTRY): string | null {
  return normalizePhoneNumber(input, COUNTRIES[country]);
}

/**
 * Same as `toE164`, but for any country configuration (e.g. a row loaded from the
 * `countries` table, whose `phone_pattern` is the source of `nationalNumberPattern`).
 */
export function normalizePhoneNumber(
  input: string,
  cfg: { dialCode: string; nationalNumberPattern: RegExp },
): string | null {
  const dialDigits = cfg.dialCode.slice(1);
  let digits = input.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;
  if (digits.startsWith('+')) {
    if (!digits.startsWith(cfg.dialCode)) return null;
    digits = digits.slice(cfg.dialCode.length);
  } else if (digits.startsWith(dialDigits) && digits.length > 10) {
    digits = digits.slice(dialDigits.length);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return cfg.nationalNumberPattern.test(digits) ? `${cfg.dialCode}${digits}` : null;
}
