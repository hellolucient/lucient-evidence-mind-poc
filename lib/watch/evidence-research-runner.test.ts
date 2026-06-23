import { describe, expect, it } from "vitest";

import { runControlledClaimResearch } from "@/lib/watch/evidence-research-runner";
import type { PrivacySafeWellnessClaim } from "@/lib/watch/wellness-claims-store";

const supportsDeepSleepClaim: PrivacySafeWellnessClaim = {
  claim_id: "claim-001",
  workspace_id: "demo-workspace-spa-menu",
  source_document_id: "doc-001",
  source_candidate_claim_id: "candidate-001",
  claim_text: "supports deep sleep",
  normalized_claim_text: "supports deep sleep",
  claim_type: "sleep",
  claim_family: "sleep_support",
  subject: "Magnesium Calm Ritual",
  predicate: "supports sleep",
  object: "sleep",
  claim_strength: "moderate",
  evidence_sensitivity: "medium",
  source_excerpt: "support deep sleep",
  source_location: "line 1",
  status: "active",
  review_status: "accepted",
  research_status: "not_started",
  created_at: "2026-06-23T10:05:00.000Z",
  updated_at: "2026-06-23T10:05:00.000Z",
};

describe("evidence-research-runner", () => {
  it("uses pubmed_live_v1 when enabled and stores metadata-only citations", async () => {
    const previous = process.env.PUBMED_LIVE_ENABLED;
    process.env.PUBMED_LIVE_ENABLED = "true";

    const calls: string[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (url: unknown) => {
      const u = String(url);
      calls.push(u);
      if (u.includes("esearch.fcgi")) {
        return new Response(
          JSON.stringify({ esearchresult: { idlist: ["12345678", "23456789"] } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (u.includes("esummary.fcgi")) {
        return new Response(
          JSON.stringify({
            result: {
              uids: ["12345678", "23456789"],
              "12345678": {
                uid: "12345678",
                title: "Magnesium supplementation and sleep quality: a randomized trial",
                pubdate: "2021",
                fulljournalname: "Sleep Medicine",
                articleids: [{ idtype: "doi", value: "10.1000/demo.doi" }],
              },
              "23456789": {
                uid: "23456789",
                title: "Magnesium and insomnia symptoms: a systematic review and meta-analysis",
                pubdate: "2020",
                fulljournalname: "Nutrients",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    try {
      const result = await runControlledClaimResearch(supportsDeepSleepClaim);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }

      expect(result.research_mode).toBe("pubmed_live_v1");
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.citations[0]).toHaveProperty("title");
      expect(result.citations[0]).not.toHaveProperty("pmid");
      expect(result.research_notes).toContain("pubmed_live_v1");
      expect(calls.some((c) => c.includes("esearch.fcgi"))).toBe(true);
      expect(calls.some((c) => c.includes("esummary.fcgi"))).toBe(true);
      expect(calls.some((c) => c.includes("efetch.fcgi"))).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      process.env.PUBMED_LIVE_ENABLED = previous;
    }
  });

  it("produces controlled demo output for supports deep sleep", async () => {
    const result = await runControlledClaimResearch(supportsDeepSleepClaim);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.research_mode).toBe("mock_evidence_v1");
    expect(result.evidence_posture).toBe("mixed");
    expect(result.evidence_strength).toBe("low");
    expect(result.risk_level).toBe("medium");
    expect(result.summary).toContain("Magnesium may have some evidence related to sleep quality");
    expect(result.safer_wording).toBe("May support relaxation and healthy sleep routines.");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.research_notes).toContain("mock_evidence_v1");
  });

  it("returns generic insufficient demo output for unknown claims", async () => {
    const result = await runControlledClaimResearch({
      ...supportsDeepSleepClaim,
      claim_text: "boosts immunity overnight",
      normalized_claim_text: "boosts immunity overnight",
      claim_family: "immune_support",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.evidence_posture).toBe("insufficient");
    expect(result.evidence_strength).toBe("very_low");
    expect(result.citations).toEqual([]);
  });
});
