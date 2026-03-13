const defaultApiUrl = import.meta.env.DEV
	? "http://127.0.0.1:8000"
	: "https://dtr-system-eqia.onrender.com";

export const API_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/$/, "");
