const defaultApiUrl = import.meta.env.DEV
	? "http://127.0.0.1:8000"
	: "https://dtr-system-eqia.onrender.com";

const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim();
const isLocalHostUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredApiUrl);
const isLocalFrontendHost =
	typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

// Keep local overrides in dev and local preview, but avoid shipping localhost URLs for deployed frontend hosts.
const resolvedApiUrl = configuredApiUrl && (import.meta.env.DEV || !isLocalHostUrl || isLocalFrontendHost)
	? configuredApiUrl
	: defaultApiUrl;

export const API_URL = resolvedApiUrl.replace(/\/$/, "");
