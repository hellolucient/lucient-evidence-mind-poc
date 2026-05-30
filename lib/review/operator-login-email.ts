export function normalizeOperatorLoginEmail(
  email: string | null | undefined
): string | null {
  if (email === null || email === undefined) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  return normalized;
}
