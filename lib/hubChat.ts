/**
 * Phase 17.1 — ephemeral hub chat over the presence DataChannel.
 * Server stamps userId/username/t (unix ms); no persistence.
 */

export const HUB_CHAT_MSG_TYPE = "hubChat" as const;

/** Matches meetopoly-be MaxHubChatRunes. */
export const MAX_HUB_CHAT_RUNES = 280;

export type HubChatMessage = {
  type: typeof HUB_CHAT_MSG_TYPE;
  userId: string;
  username: string;
  text: string;
  /** Unix ms (client optimistic or server-stamped). */
  t: number;
};

export function encodeHubChat(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if ([...trimmed].length > MAX_HUB_CHAT_RUNES) {
    return null;
  }
  const msg: HubChatMessage = {
    type: HUB_CHAT_MSG_TYPE,
    userId: "",
    username: "",
    text: trimmed,
    t: 0,
  };
  return JSON.stringify(msg);
}

/** Trim + length check used by send + composer (matches encodeHubChat). */
export function normalizeHubChatText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if ([...trimmed].length > MAX_HUB_CHAT_RUNES) {
    return null;
  }
  return trimmed;
}

export function parseHubChat(raw: string): HubChatMessage | null {
  try {
    const msg = JSON.parse(raw) as Partial<HubChatMessage>;
    if (
      msg?.type !== HUB_CHAT_MSG_TYPE ||
      typeof msg.userId !== "string" ||
      !msg.userId.trim() ||
      typeof msg.username !== "string" ||
      typeof msg.text !== "string"
    ) {
      return null;
    }
    const text = msg.text.trim();
    if (!text || [...text].length > MAX_HUB_CHAT_RUNES) {
      return null;
    }
    const t =
      typeof msg.t === "number" && Number.isFinite(msg.t) && msg.t > 0
        ? msg.t
        : Date.now();
    return {
      type: HUB_CHAT_MSG_TYPE,
      userId: msg.userId.trim(),
      username: msg.username.trim() || "Player",
      text,
      t,
    };
  } catch {
    return null;
  }
}
