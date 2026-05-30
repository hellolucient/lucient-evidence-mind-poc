import { describe, expect, it } from "vitest";

import {
  getReviewQueueAccessBlockedMessage,
  reviewQueueAccessBlockedMessageIsSafe,
} from "@/lib/review/review-queue-access-blocked-copy";

describe("getReviewQueueAccessBlockedMessage", () => {
  it("renders a safe login prompt when operator auth is configured", () => {
    const message = getReviewQueueAccessBlockedMessage(true);

    expect(message.title).toBe("Review queue access restricted");
    expect(message.intro).toContain("approved operators");
    expect(message.loginPath).toBe("/review-login");
    expect(reviewQueueAccessBlockedMessageIsSafe(message)).toBe(true);
  });

  it("uses generic fallback copy when login is unavailable", () => {
    const message = getReviewQueueAccessBlockedMessage(false);

    expect(message.loginPath).toBeNull();
    expect(message.fallbackPrompt).toContain("administrator");
    expect(reviewQueueAccessBlockedMessageIsSafe(message)).toBe(true);
  });

  it("does not reveal membership or account existence details", () => {
    const message = getReviewQueueAccessBlockedMessage(true);
    const serialized = JSON.stringify(message).toLowerCase();

    expect(serialized).not.toContain("membership");
    expect(serialized).not.toContain("does not exist");
    expect(serialized).not.toContain("invalid email");
  });
});
