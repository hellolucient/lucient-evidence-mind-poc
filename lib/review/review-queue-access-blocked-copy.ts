export const REVIEW_QUEUE_ACCESS_BLOCKED_COPY = {
  title: "Review queue access restricted",
  intro:
    "This internal review queue is limited to approved operators. Sign in with your operator email to continue.",
  loginPrompt: "Approved operators can sign in at",
  loginPath: "/review-login",
  fallbackPrompt:
    "Operator login is not configured in this environment. Contact your administrator for access.",
} as const;

const FORBIDDEN_BLOCKED_TERMS = [
  "uuid",
  "token",
  "INTERNAL_REVIEW_ACCESS_TOKEN",
  "service_role",
  "CRON_SECRET",
  "raw_payload",
  "claim_text",
] as const;

export function getReviewQueueAccessBlockedMessage(showLoginLink: boolean): {
  title: string;
  intro: string;
  loginPrompt: string | null;
  loginPath: string | null;
  fallbackPrompt: string | null;
} {
  return {
    title: REVIEW_QUEUE_ACCESS_BLOCKED_COPY.title,
    intro: REVIEW_QUEUE_ACCESS_BLOCKED_COPY.intro,
    loginPrompt: showLoginLink ? REVIEW_QUEUE_ACCESS_BLOCKED_COPY.loginPrompt : null,
    loginPath: showLoginLink ? REVIEW_QUEUE_ACCESS_BLOCKED_COPY.loginPath : null,
    fallbackPrompt: showLoginLink ? null : REVIEW_QUEUE_ACCESS_BLOCKED_COPY.fallbackPrompt,
  };
}

export function reviewQueueAccessBlockedMessageIsSafe(message: ReturnType<
  typeof getReviewQueueAccessBlockedMessage
>): boolean {
  const serialized = JSON.stringify(message).toLowerCase();

  return !FORBIDDEN_BLOCKED_TERMS.some((term) => serialized.includes(term.toLowerCase()));
}
