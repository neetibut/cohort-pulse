// Backend base URL. Vite inlines import.meta.env.* at build time.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
