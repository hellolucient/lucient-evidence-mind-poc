import { describe, expect, it } from "vitest";

import {
  buildPrivacySafeMetadata,
  mapSendErrorToEventResult,
  mapSendErrorToEventType,
} from "@/lib/watch/external-mind-handoff-send-audit";

describe("external-mind-handoff-send-audit", () => {
  it("maps send errors to audit event types and results", () => {
    expect(mapSendErrorToEventType("already_sent")).toBe("send_already_sent");
    expect(mapSendErrorToEventType("handoff_not_ready")).toBe("send_blocked");
    expect(mapSendErrorToEventType("not_approved")).toBe("send_blocked");
    expect(mapSendErrorToEventType("send_disabled")).toBe("send_blocked");
    expect(mapSendErrorToEventType("missing_config")).toBe("send_failed");

    expect(mapSendErrorToEventResult("already_sent")).toBe("already_sent");
    expect(mapSendErrorToEventResult("handoff_not_ready")).toBe("invalid_status");
    expect(mapSendErrorToEventResult("not_approved")).toBe("not_approved");
    expect(mapSendErrorToEventResult("forbidden")).toBe("unauthorized");
    expect(mapSendErrorToEventResult("send_disabled")).toBe("send_disabled");
    expect(mapSendErrorToEventResult("missing_config")).toBe("missing_config");
  });

  it("builds privacy-safe metadata without secrets", () => {
    expect(buildPrivacySafeMetadata({ transportKind: "sent", httpStatus: 202 })).toEqual({
      transport_kind: "sent",
      http_status: 202,
    });
  });
});
