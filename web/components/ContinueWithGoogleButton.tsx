'use client';

const LOGIN_PROXY_URL =
  process.env.NEXT_PUBLIC_LOGIN_PROXY_URL ?? 'https://login.faciliter.xyz';

/**
 * Mismo flujo que el login staff: proxy `login.faciliter.xyz` y cookie `central_session`.
 */
export function ContinueWithGoogleButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="btn-google"
      disabled={disabled}
      onClick={() => {
        const returnTo = encodeURIComponent(window.location.href);
        window.location.href = `${LOGIN_PROXY_URL}/start?return_to=${returnTo}`;
      }}
    >
      Continuar con Google
    </button>
  );
}
