import { buildQueryStrategy } from "@/lib/structured-query";

import type { StoredQueryStrategy, WatchTopicState } from "./watchlist-store";

export type QueryHashInput = {
  watch_topic_id: string;
  query_mode: "structured" | "raw";
  raw_query: string;
  structured_query: string | null;
  query_version: string;
};

/** Pure JS FNV-1a — safe in Node and Edge without importing `crypto`. */
function fnv1aHex(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashQueryStrategy(input: QueryHashInput): string {
  const payload = JSON.stringify({
    watch_topic_id: input.watch_topic_id,
    query_version: input.query_version,
    query_mode: input.query_mode,
    raw_query: input.raw_query,
    structured_query: input.structured_query ?? "",
  });

  const primary = fnv1aHex(payload);
  const secondary = fnv1aHex(`${payload}:watchlist-query-hash`);

  return `${primary}${secondary}`.slice(0, 16);
}

export function hashStoredQueryStrategy(topic: WatchTopicState): string {
  return hashQueryStrategy({
    watch_topic_id: topic.watch_topic_id,
    query_mode: topic.query_strategy.mode,
    raw_query: topic.query_strategy.raw_query,
    structured_query: topic.query_strategy.structured_query,
    query_version: topic.query_strategy.query_version,
  });
}

export function resolveCurrentQueryHash(topic: WatchTopicState): string {
  const built = buildQueryStrategy(
    topic.query_strategy.raw_query,
    topic.watch_topic_id,
    topic.claim_family,
    topic.query_strategy.mode === "structured"
  );

  return hashQueryStrategy({
    watch_topic_id: topic.watch_topic_id,
    query_mode: built.mode,
    raw_query: built.raw_query,
    structured_query: built.structured_query,
    query_version: topic.query_strategy.query_version,
  });
}

export function buildStoredQueryHash(
  watchTopicId: string,
  strategy: Omit<StoredQueryStrategy, "query_hash">
): string {
  return hashQueryStrategy({
    watch_topic_id: watchTopicId,
    query_mode: strategy.mode,
    raw_query: strategy.raw_query,
    structured_query: strategy.structured_query,
    query_version: strategy.query_version,
  });
}
