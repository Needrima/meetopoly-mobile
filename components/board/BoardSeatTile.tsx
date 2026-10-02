import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ComponentType } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { AvatarPod } from "@/components/board/AvatarPod";
import type { PresenceMediaStream } from "@/hooks/useBoardPresence";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type RTCViewComponent = ComponentType<{
  streamURL?: string;
  mirror?: boolean;
  objectFit?: "contain" | "cover";
  style?: object;
  zOrder?: number;
}>;

function loadRTCView(): RTCViewComponent | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-webrtc") as {
      RTCView?: RTCViewComponent;
    };
    return mod.RTCView ?? null;
  } catch {
    return null;
  }
}

const RTCView = loadRTCView();
const ICON_SIZE = 20;

export type BoardSeatTileProps = {
  displayName: string;
  pinColor: string;
  initials: string;
  isLocal: boolean;
  resigned?: boolean;
  hubCode?: string;
  /** Show live video when stream present and camera not off. */
  stream: PresenceMediaStream | null;
  cameraOff: boolean;
  mirror?: boolean;
  /**
   * Display-only rotation for upright video (iOS publishers). Remotes use the
   * value announced over the presence DC — never applied to Android sources.
   */
  contentRotateDeg?: number;
  micMuted?: boolean;
  videoMuted?: boolean;
  onPress: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onFlipCamera?: () => void;
};

/**
 * Phase 16.2 — Meet-style seat tile. Local-only: mic / flip / cam controls.
 * Corner slots are plain Views (Pressable absolute styles were stacking top-left).
 */
export function BoardSeatTile({
  displayName,
  pinColor,
  initials,
  isLocal,
  resigned = false,
  hubCode = "",
  stream,
  cameraOff,
  mirror = false,
  contentRotateDeg = 0,
  micMuted = false,
  videoMuted = false,
  onPress,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
}: BoardSeatTileProps) {
  const [box, setBox] = useState({ w: 0, h: 0 });

  const streamURL = useMemo(() => {
    if (!stream || cameraOff) {
      return "";
    }
    try {
      return stream.toURL?.() ?? "";
    } catch {
      return "";
    }
  }, [stream, cameraOff]);

  const showVideo = Boolean(RTCView && streamURL && !cameraOff);
  const rotate = ((contentRotateDeg % 360) + 360) % 360;
  const needsSwap = rotate === 90 || rotate === 270;

  const onMediaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) {
      setBox({ w: width, h: height });
    }
  };

  return (
    <View
      style={[
        styles.tile,
        { borderColor: pinColor },
        resigned ? styles.tileOut : null,
      ]}
      accessibilityLabel={`${displayName} seat`}
    >
      <View style={styles.media} pointerEvents="none" onLayout={onMediaLayout}>
        {showVideo && RTCView ? (
          <View style={styles.videoClip}>
            {/*
              Rotate a wrapper View — transforms on native RTCView are often
              ignored on iOS.
            */}
            <View
              style={
                rotate !== 0 && box.w > 0 && box.h > 0
                  ? {
                      width: needsSwap ? box.h : box.w,
                      height: needsSwap ? box.w : box.h,
                      transform: [
                        { rotate: `${contentRotateDeg}deg` as const },
                      ],
                    }
                  : styles.videoFill
              }
            >
              <RTCView
                streamURL={streamURL}
                mirror={mirror}
                objectFit="cover"
                style={styles.videoFill}
                zOrder={isLocal ? 1 : 0}
              />
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <AvatarPod initials={initials} accent={pinColor} radius={22} />
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${displayName} player info`}
        onPress={onPress}
        style={styles.pressHit}
      />

      {hubCode ? (
        <View style={styles.hubChip} pointerEvents="none">
          <Text style={styles.hubChipText}>{hubCode}</Text>
        </View>
      ) : null}

      <View style={styles.chrome} pointerEvents="box-none">
        {isLocal ? (
          <>
            <View
              style={[styles.ctrlSlot, styles.ctrlTL]}
              pointerEvents="box-none"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Flip camera"
                hitSlop={8}
                onPress={onFlipCamera}
                style={({ pressed }) => [
                  styles.ctrl,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Ionicons
                  name="camera-reverse"
                  size={ICON_SIZE}
                  color={colors.onBrand}
                />
              </Pressable>
            </View>
            <View
              style={[styles.ctrlSlot, styles.ctrlTR]}
              pointerEvents="box-none"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  videoMuted ? "Turn camera on" : "Turn camera off"
                }
                hitSlop={8}
                onPress={onToggleCamera}
                style={({ pressed }) => [
                  styles.ctrl,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Ionicons
                  name={videoMuted ? "videocam-off" : "videocam"}
                  size={ICON_SIZE}
                  color={colors.onBrand}
                />
              </Pressable>
            </View>
            <View
              style={[styles.ctrlSlot, styles.ctrlBL]}
              pointerEvents="box-none"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  micMuted ? "Unmute microphone" : "Mute microphone"
                }
                hitSlop={8}
                onPress={onToggleMic}
                style={({ pressed }) => [
                  styles.ctrl,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Ionicons
                  name={micMuted ? "mic-off" : "mic"}
                  size={ICON_SIZE}
                  color={colors.onBrand}
                />
              </Pressable>
            </View>
          </>
        ) : null}

        <View style={styles.nameBar} pointerEvents="none">
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
            {resigned ? " · out" : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 10,
    borderWidth: 2,
    overflow: "hidden",
    backgroundColor: "#0B1210",
    position: "relative",
  },
  tileOut: {
    opacity: 0.55,
  },
  media: {
    ...StyleSheet.absoluteFill,
  },
  videoClip: {
    flex: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  videoFill: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1210",
  },
  pressHit: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  hubChip: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  hubChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.onBrand,
    backgroundColor: "rgba(20, 32, 27, 0.72)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  chrome: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  ctrlSlot: {
    position: "absolute",
    zIndex: 4,
  },
  ctrl: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(20, 32, 27, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlTL: {
    top: 6,
    left: 6,
  },
  ctrlTR: {
    top: 6,
    right: 6,
  },
  ctrlBL: {
    bottom: 6,
    left: 6,
  },
  nameBar: {
    position: "absolute",
    right: 6,
    bottom: 6,
    maxWidth: "62%",
    backgroundColor: "transparent",
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.onBrand,
    textShadowColor: "rgba(0, 0, 0, 0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pressed: {
    opacity: 0.75,
  },
});
