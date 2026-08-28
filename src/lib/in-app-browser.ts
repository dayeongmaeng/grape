/**
 * Detects the KakaoTalk in-app browser and bounces out to the real system browser.
 *
 * When a user starts the web Kakao login from inside the KakaoTalk app, the consent screen opens in
 * KakaoTalk's own WebView, which has no access to the `sessionStorage` the login was started with —
 * so the callback can't finish there. Re-opening the same URL in Safari / Chrome lets it complete.
 *  - iOS:     `kakaotalk://web/openExternal?url=` reopens in Safari
 *  - Android: an `intent://` URL hands off to the default browser
 */

export function isKakaoTalkInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /KAKAOTALK/i.test(navigator.userAgent);
}

/** Redirects out of the KakaoTalk in-app browser to `targetUrl`. Returns true if a redirect fired. */
export function escapeKakaoTalkInAppBrowser(targetUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isKakaoTalkInAppBrowser()) return false;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) {
    window.location.replace(`kakaotalk://web/openExternal?url=${encodeURIComponent(targetUrl)}`);
    return true;
  }

  const urlWithoutScheme = targetUrl.replace(/^https?:\/\//, '');
  window.location.replace(
    `intent://${urlWithoutScheme}#Intent;scheme=https;action=android.intent.action.VIEW;end`,
  );
  return true;
}
