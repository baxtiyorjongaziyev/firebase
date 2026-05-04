export const COOKIE_CONSENT_KEY = 'cookie_consent_accepted';
export const COOKIE_CONSENT_EVENT = 'cookie-consent-accepted';

export function hasCookieConsent() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
}
