import { getHelloMindsConversationAliasPrefix } from "@/lib/watch/external-mind-hellominds-send-config";

export function buildHelloMindsConversationAlias(handoffId: string): string {
  const prefix = getHelloMindsConversationAliasPrefix();
  const normalizedHandoffId = handoffId.trim();

  return `${prefix}-ho-${normalizedHandoffId}`;
}
