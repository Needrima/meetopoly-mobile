import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarPod } from '@/components/board/AvatarPod';
import type { PresenceMediaStream } from '@/hooks/useBoardPresence';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type RTCViewComponent = ComponentType<{
  streamURL?: string;
  mirror?: boolean;
  objectFit?: 'contain' | 'cover';
  style?: object;
  zOrder?: number;
}>;

function loadRTCView(): RTCViewComponent | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-webrtc') as { RTCView?: RTCViewComponent };
    return mod.RTCView ?? null;
  } catch {
    return null;
  }
}

const RTCView = loadRTCView();

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
  micMuted?: boolean;
  videoMuted?: boolean;
  onLongPress: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onFlipCamera?: () => void;
};

/**
 * Phase 16.2 — Meet-style seat tile. Local-only: mic / flip / cam controls.
 */
export function BoardSeatTile({
  displayName,
  pinColor,
  initials,
  isLocal,
  resigned = false,
  hubCode = '',
  stream,
  cameraOff,
  mirror = false,
  micMuted = false,
  videoMuted = false,
  onLongPress,
  onToggleMic,
  onToggleCamera,
  onFlipCamera,
}: BoardSeatTileProps) {
  const streamURL = useMemo(() => {
    if (!stream || cameraOff) {
      return '';
    }
    try {
      return stream.toURL?.() ?? '';
    } catch {
      return '';
    }
  }, [stream, cameraOff]);

  const showVideo = Boolean(RTCView && streamURL && !cameraOff);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${displayName} seat`}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[
        styles.tile,
        { borderColor: pinColor },
        resigned ? styles.tileOut : null,
      ]}
    >
      <View style={styles.media}>
        {showVideo && RTCView ? (
          <RTCView
            streamURL={streamURL}
            mirror={mirror}
            objectFit="cover"
            style={styles.video}
            zOrder={isLocal ? 1 : 0}
          />
        ) : (
          <View style={styles.placeholder}>
            <AvatarPod initials={initials} accent={pinColor} radius={22} />
          </View>
        )}
      </View>

      {hubCode ? (
        <View style={styles.hubChip} pointerEvents="none">
          <Text style={styles.hubChipText}>{hubCode}</Text>
        </View>
      ) : null}

      {isLocal ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
            hitSlop={6}
            onPress={onFlipCamera}
            style={({ pressed }) => [
              styles.ctrl,
              styles.ctrlTL,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons name="camera-reverse" size={16} color={colors.onBrand} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={videoMuted ? 'Turn camera on' : 'Turn camera off'}
            hitSlop={6}
            onPress={onToggleCamera}
            style={({ pressed }) => [
              styles.ctrl,
              styles.ctrlTR,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons
              name={videoMuted ? 'videocam-off' : 'videocam'}
              size={16}
              color={colors.onBrand}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={micMuted ? 'Unmute microphone' : 'Mute microphone'}
            hitSlop={6}
            onPress={onToggleMic}
            style={({ pressed }) => [
              styles.ctrl,
              styles.ctrlBL,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons
              name={micMuted ? 'mic-off' : 'mic'}
              size={16}
              color={colors.onBrand}
            />
          </Pressable>
        </>
      ) : null}

      <View style={styles.nameBar} pointerEvents="none">
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
          {resigned ? ' · out' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#0B1210',
  },
  tileOut: {
    opacity: 0.55,
  },
  media: {
    ...StyleSheet.absoluteFill,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1210',
  },
  hubChip: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hubChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.onBrand,
    backgroundColor: 'rgba(20, 32, 27, 0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ctrl: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 32, 27, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'absolute',
    right: 6,
    bottom: 6,
    maxWidth: '62%',
    backgroundColor: 'rgba(20, 32, 27, 0.72)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.onBrand,
  },
  pressed: {
    opacity: 0.75,
  },
});
