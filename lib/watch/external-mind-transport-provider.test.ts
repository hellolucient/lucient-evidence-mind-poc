import { describe, expect, it } from "vitest";

import { resolveExternalMindTransportProvider } from "@/lib/watch/external-mind-transport-provider";

describe("external-mind-transport-provider", () => {
  it("routes test_sink to test_sink provider", () => {
    expect(resolveExternalMindTransportProvider("test_sink")).toBe("test_sink");
  });

  it("routes animoca_mind and internal_export to generic_http provider", () => {
    expect(resolveExternalMindTransportProvider("animoca_mind")).toBe("generic_http");
    expect(resolveExternalMindTransportProvider("internal_export")).toBe("generic_http");
  });

  it("routes hellominds to hellominds provider", () => {
    expect(resolveExternalMindTransportProvider("hellominds")).toBe("hellominds");
  });
});
