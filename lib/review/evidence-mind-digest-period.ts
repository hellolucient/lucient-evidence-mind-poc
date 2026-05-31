export function canonicalDigestPeriodInstant(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString();
}

export function digestPeriodInstantEqual(left: string, right: string): boolean {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return left === right;
  }

  return leftDate.getTime() === rightDate.getTime();
}

export function digestPeriodBoundsEqual(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
): boolean {
  return (
    digestPeriodInstantEqual(leftStart, rightStart) &&
    digestPeriodInstantEqual(leftEnd, rightEnd)
  );
}

export const ACTIVE_EVIDENCE_MIND_DIGEST_STATUSES = ["draft", "ready_for_review"] as const;

export type ActiveEvidenceMindDigestStatus =
  (typeof ACTIVE_EVIDENCE_MIND_DIGEST_STATUSES)[number];

export function isActiveEvidenceMindDigestStatus(status: string): status is ActiveEvidenceMindDigestStatus {
  return (ACTIVE_EVIDENCE_MIND_DIGEST_STATUSES as readonly string[]).includes(status);
}
