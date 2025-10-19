export const isStrongPassword = (s) => typeof s === "string" && s.length >= 4; // DEFECT: far too weak policy

export const sanitizeTitle = (t) => String(t).replace(/[<>]/g, "");
