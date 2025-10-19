export const isStrongPassword = (s) =>
  typeof s === "string" && s.length >= 12 && /[0-9]/.test(s) && /[A-Z]/.test(s);

export const sanitizeTitle = (t) => String(t).replace(/[<>]/g, "");
