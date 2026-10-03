import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { FlashList, type ListRenderItem } from "@shopify/flash-list";

import type { HubChatMessage } from "@/lib/hubChat";
import { MAX_HUB_CHAT_RUNES } from "@/lib/hubChat";
import { formatUsername } from "@/lib/formatUsername";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type HubChatRailProps = {
  messages: HubChatMessage[];
  localUserId: string | null;
  /** Avatar/pin accent per userId — fills bubble background. */
  accentByUserId?: Record<string, string>;
  dcOpen: boolean;
  onSend: (text: string) => boolean;
};

/**
 * Phase 17.1 — left-rail ephemeral hub chat (FlashList + fixed composer).
 * FlashList v2: chronological data + startRenderingFromBottom (no `inverted`).
 * Bubbles use each player's avatar accent + white text.
 */
export function HubChatRail({
  messages,
  localUserId,
  accentByUserId,
  dcOpen,
  onSend,
}: HubChatRailProps) {
  const [draft, setDraft] = useState("");
  const canSend = Boolean(dcOpen && draft.trim());
  const localAccent =
    (localUserId && accentByUserId?.[localUserId]?.trim()) || colors.brand;
  const sendColor = canSend ? localAccent : colors.muted;

  const submit = useCallback(() => {
    const ok = onSend(draft);
    if (ok) {
      setDraft("");
    }
  }, [draft, onSend]);

  const renderItem = useCallback<ListRenderItem<HubChatMessage>>(
    ({ item }) => {
      const mine = Boolean(localUserId) && item.userId === localUserId;
      const who = mine
        ? "You"
        : formatUsername(item.username) || "Player";
      const fill = accentByUserId?.[item.userId]?.trim() || colors.muted;
      return (
        <View
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : null,
            { backgroundColor: fill, borderColor: fill },
          ]}
        >
          <Text style={styles.who} numberOfLines={1}>
            {who}
          </Text>
          <Text style={styles.body}>{item.text}</Text>
        </View>
      );
    },
    [accentByUserId, localUserId],
  );

  return (
    <View style={styles.root}>
      <View style={styles.padded}>
        <Text style={styles.eyebrow}>Chat</Text>
        <View style={styles.listWrap}>
          {messages.length === 0 ? (
            <Text style={styles.empty}>
              {dcOpen ? "Say hi to the hub" : "Connecting…"}
            </Text>
          ) : (
            <FlashList
              data={messages}
              extraData={accentByUserId}
              keyExtractor={(item, index) =>
                `${item.userId}:${item.t}:${index}`
              }
              keyboardShouldPersistTaps="handled"
              maintainVisibleContentPosition={{
                autoscrollToBottomThreshold: 80,
                startRenderingFromBottom: true,
              }}
              renderItem={renderItem}
            />
          )}
        </View>
      </View>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={dcOpen ? "Type something..." : "Connecting…"}
          placeholderTextColor={colors.muted}
          editable={dcOpen}
          maxLength={MAX_HUB_CHAT_RUNES}
          returnKeyType="send"
          onSubmitEditing={submit}
          blurOnSubmit={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!canSend}
          onPress={submit}
          hitSlop={8}
          style={({ pressed }) => [
            styles.send,
            pressed && canSend ? styles.pressed : null,
          ]}
        >
          <AntDesign name="send" size={20} color={sendColor} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  padded: {
    flex: 1,
    minHeight: 0,
    gap: 6,
    paddingHorizontal: 10,
  },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
  },
  listWrap: {
    flex: 1,
    minHeight: 0,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    paddingVertical: 8,
  },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "94%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  bubbleMine: {
    alignSelf: "flex-end",
  },
  who: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.onBrand,
    opacity: 0.85,
    marginBottom: 2,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onBrand,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    width: "100%",
    gap: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingRight: 3,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    width: "100%",
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.bg,
    borderWidth: 0,
    borderRadius: 0,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 10,
  },
  send: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.75,
  },
});
