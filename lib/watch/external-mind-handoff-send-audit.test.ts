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
    expect(mapSendErrorToEventType("external_dry_run_ok")).toBe("send_blocked");
    expect(mapSendErrorToEventType("external_config_invalid")).toBe("send_blocked");
    expect(mapSendErrorToEventType("missing_config")).toBe("send_failed");

    expect(mapSendErrorToEventResult("already_sent")).toBe("already_sent");
    expect(mapSendErrorToEventResult("handoff_not_ready")).toBe("invalid_status");
    expect(mapSendErrorToEventResult("not_approved")).toBe("not_approved");
    expect(mapSendErrorToEventResult("forbidden")).toBe("unauthorized");
    expect(mapSendErrorToEventResult("send_disabled")).toBe("send_disabled");
    expect(mapSendErrorToEventResult("missing_config")).toBe("missing_config");
    expect(mapSendErrorToEventResult("external_dry_run_ok")).toBe("external_dry_run_ok");
    expect(mapSendErrorToEventResult("external_config_invalid")).toBe("external_config_invalid");
  });

  it("builds privacy-safe metadata without secrets", () => {
    expect(buildPrivacySafeMetadata({ transportKind: "sent", httpStatus: 202 })).toEqual({
      transport_kind: "sent",
      http_status: 202,
    });
  });

  it("includes transport metadata fields for dry-run and live outcomes", () => {
    expect(
      buildPrivacySafeMetadata({
        transportKind: "blocked",
        transportMetadata: {
          transport_mode: "dry_run",
          dry_run_only: true,
          endpoint_host: "mind.example.com",
        },
      })
    ).toEqual({
      transport_kind: "blocked",
      transport_mode: "dry_run",
      dry_run_only: true,
      endpoint_host: "mind.example.com",
    });

    expect(
      buildPrivacySafeMetadata({
        transportKind: "failed",
        transportMetadata: {
          transport_mode: "live",
          error_class: "http",
          http_status: 503,
          endpoint_host: "mind.example.com",
          timeout_ms: 15000,
        },
      })
    ).toEqual({
      transport_kind: "failed",
      transport_mode: "live",
      error_class: "http",
      http_status: 503,
      endpoint_host: "mind.example.com",
      timeout_ms: 15000,
    });

    expect(
      buildPrivacySafeMetadata({
        transportKind: "sent",
        transportMetadata: {
          transport_mode: "live",
          provider: "hellominds",
          http_status: 200,
          endpoint_host: "api.build.hellominds.ai",
          conversation_id_suffix: "ab12",
          message_id_suffix: "cd34",
          conversation_alias: "lucient-em-ho-handoff-uuid-001",
          artifact_count: 0,
        },
      })
    ).toEqual({
      transport_kind: "sent",
      transport_mode: "live",
      provider: "hellominds",
      http_status: 200,
      endpoint_host: "api.build.hellominds.ai",
      conversation_alias: "lucient-em-ho-handoff-uuid-001",
      conversation_id_suffix: "ab12",
      message_id_suffix: "cd34",
      artifact_count: 0,
    });
  });
});
