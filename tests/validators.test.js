import { isStrongPassword, sanitizeTitle } from "../src/validators.js";

test("isStrongPassword: good", () => {
  expect(isStrongPassword("CorrectHorse7Battery")).toBe(true);
});

test("isStrongPassword: too short", () => {
  expect(isStrongPassword("Abc123")).toBe(false);
});

test("isStrongPassword: no uppercase", () => {
  expect(isStrongPassword("lowercasepassword123")).toBe(false);
});

test("sanitizeTitle removes angle brackets (XSS)", () => {
  expect(sanitizeTitle("<script>alert(1)</script>")).toBe(
    "scriptalert(1)/script"
  );
});

test("sanitizeTitle is idempotent", () => {
  const once = sanitizeTitle("<b>Hi</b>");
  const twice = sanitizeTitle(once);
  expect(twice).toBe(once);
});

test("isStrongPassword: non-string input is false", () => {
  expect(isStrongPassword(12345)).toBe(false);
});

test("sanitizeTitle handles null safely", () => {
  expect(sanitizeTitle(null)).toBe("null");
});
