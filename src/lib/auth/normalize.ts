export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export const normalizeCardNumber = (s: string) => s.replace(/\s+/g, "").toUpperCase();
