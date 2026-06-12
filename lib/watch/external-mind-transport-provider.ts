import type { ExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";

export const EXTERNAL_MIND_TRANSPORT_PROVIDERS = [
  "test_sink",
  "generic_http",
  "hellominds",
] as const;

export type ExternalMindTransportProvider = (typeof EXTERNAL_MIND_TRANSPORT_PROVIDERS)[number];

export function resolveExternalMindTransportProvider(
  destination: ExternalMindHandoffDestination
): ExternalMindTransportProvider | null {
  if (destination === "test_sink") {
    return "test_sink";
  }

  if (destination === "animoca_mind" || destination === "internal_export") {
    return "generic_http";
  }

  if (destination === "hellominds") {
    return "hellominds";
  }

  return null;
}
