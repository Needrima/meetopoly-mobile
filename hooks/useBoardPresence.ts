import { useCallback, useEffect, useRef, useState } from "react";

import { getWsBaseUrl } from "@/api/client";
import { useMuteMic } from "@/hooks/useMuteMic";
import { useMuteVideo } from "@/hooks/useMuteVideo";
import { useSession } from "@/hooks/useSession";
import { formatUsername } from "@/lib/formatUsername";
import { startHubSpeaker, stopHubSpeaker } from "@/lib/hubAudioRoute";
import { notify } from "@/lib/notify";
import {
  encodePresencePose,
  parsePresencePose,
  PRESENCE_POSE_TYPE,
  type PresencePose,
  type PresencePoseInput,
} from "@/lib/presencePose";
import { encodeVideoMuted, parseVideoMuted } from "@/lib/boardVideoMute";
import {
  encodeVideoOrientation,
  localBoardVideoRotationDeg,
  parseVideoOrientation,
} from "@/lib/boardVideoOrientation";
import {
  encodeHubChat,
  HUB_CHAT_MSG_TYPE,
  normalizeHubChatText,
  parseHubChat,
  type HubChatMessage,
} from "@/lib/hubChat";
import { applyMeetopolyBoardCamEffect } from "meetopoly-board-cam";

/** Cap in-memory hub chat while staying in one hub (Phase 17.1). */
const MAX_HUB_CHAT_BUFFER = 200;

/** SFU board video stream id prefix (Phase 16.0) — `video-{userId}`. */
const BOARD_VIDEO_STREAM_PREFIX = "video-";
const PRESENCE_DC_LABEL = "presence";

export type CameraFacing = "user" | "environment";

/** Minimal local/remote track/stream surface (Phase 10 / 16.1). */
export type PresenceMediaStream = {
  id?: string;
  getAudioTracks: () => PresenceMediaTrack[];
  getVideoTracks: () => PresenceMediaTrack[];
  getTracks: () => PresenceMediaTrack[];
  addTrack?: (track: PresenceMediaTrack) => void;
  release?: (releaseTracks?: boolean) => void;
  /** react-native-webrtc — required by RTCView. */
  toURL?: () => string;
};

type PresenceMediaTrack = {
  id?: string;
  kind: string;
  enabled: boolean;
  muted?: boolean;
  readyState?: string;
  stop: () => void;
  /** react-native-webrtc — board cam upright on iOS (optional). */
  _setVideoEffect?: (name: string) => void;
  onmute?: ((ev?: unknown) => void) | null;
  onunmute?: ((ev?: unknown) => void) | null;
  onended?: ((ev?: unknown) => void) | null;
};

type PresencePeer = {
  userId: string;
  username: string;
  country?: string;
  avatarUrl?: string;
};

/** Hub/board presence roster row (Phase 9.0a + 19.1 avatar). */
export type PresenceRosterEntry = {
  userId: string;
  username: string;
  country?: string;
  avatarUrl?: string;
};

type WelcomeMessage = {
  type: "welcome";
  roomId: string;
  userId: string;
  username: string;
  country?: string;
  avatarUrl?: string;
  peers?: PresencePeer[];
  iceServers?: { urls: string | string[] }[];
};

type PeerJoinedMessage = {
  type: "peer-joined";
  userId: string;
  username: string;
  country?: string;
  avatarUrl?: string;
};

type PeerLeftMessage = {
  type: "peer-left";
  userId: string;
  username: string;
};

type AnswerMessage = {
  type: "answer";
  sdp: string;
};

type OfferMessage = {
  type: "offer";
  sdp: string;
};

type IceCandidateInit = {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

type IceMessage = {
  type: "ice";
  candidate: IceCandidateInit | null;
};

type ErrorMessage = {
  type: "error";
  message?: string;
};

type PresenceServerMessage =
  | WelcomeMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | AnswerMessage
  | OfferMessage
  | IceMessage
  | ErrorMessage
  | { type: "pong" }
  | { type: string };

export type BoardPresenceStatus = "idle" | "connecting" | "connected" | "error";

type TrackEventLike = {
  track?: PresenceMediaTrack | null;
  streams?: PresenceMediaStream[];
  transceiver?: { mid?: string | null } | null;
};

/** Minimal WebRTC surface (avoids hard Expo Go import crash). */
type WebRTCModule = {
  RTCPeerConnection: new (config?: {
    iceServers?: { urls: string | string[] }[];
  }) => PeerConnectionLike;
  RTCSessionDescription: new (init: { type: string; sdp: string }) => {
    type: string;
    sdp: string;
  };
  RTCIceCandidate: new (init: IceCandidateInit) => IceCandidateInit;
  MediaStream: new (tracks?: PresenceMediaTrack[]) => PresenceMediaStream;
  mediaDevices: {
    getUserMedia: (constraints: {
      audio?: boolean;
      video?:
        | boolean
        | {
            facingMode?: string | { ideal?: string };
            width?: number | { ideal?: number };
            height?: number | { ideal?: number };
            frameRate?: number | { ideal?: number };
            aspectRatio?: number | { ideal?: number };
          };
    }) => Promise<PresenceMediaStream>;
  };
};

type PeerConnectionLike = {
  localDescription: { sdp?: string } | null;
  remoteDescription?: { sdp?: string } | null;
  connectionState: string;
  onicecandidate: ((ev: { candidate: IceCandidateInit | null }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  ontrack: ((ev: TrackEventLike) => void) | null;
  createDataChannel: (
    label: string,
    init?: { ordered?: boolean },
  ) => DataChannelLike;
  addTrack: (
    track: PresenceMediaTrack,
    ...streams: PresenceMediaStream[]
  ) => unknown;
  getSenders?: () => {
    track: PresenceMediaTrack | null;
    replaceTrack: (track: PresenceMediaTrack | null) => Promise<void>;
  }[];
  getReceivers?: () => { track: PresenceMediaTrack | null }[];
  createOffer: (opts?: object) => Promise<{ type: string; sdp: string }>;
  createAnswer: (opts?: object) => Promise<{ type: string; sdp: string }>;
  setLocalDescription: (desc: { type: string; sdp: string }) => Promise<void>;
  setRemoteDescription: (desc: { type: string; sdp: string }) => Promise<void>;
  addIceCandidate: (c: IceCandidateInit) => Promise<void>;
  close: () => void;
};

type DataChannelLike = {
  readyState?: string;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((ev: { data: string | ArrayBuffer }) => void) | null;
  send: (data: string) => void;
  close?: () => void;
};

function loadWebRTC(): WebRTCModule | null {
  try {
    // Dynamic require so Expo Go can still render the board without native WebRTC.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-webrtc") as WebRTCModule;
  } catch (err) {
    console.warn("[presence] react-native-webrtc unavailable", err);
    return null;
  }
}

/** Board camera constraints — facing only (no forced 16:9; that broke Android→iOS orientation). */
function boardVideoConstraints(facing: CameraFacing) {
  return {
    facingMode: { ideal: facing },
  };
}

function iceServersFromWelcome(
  servers: WelcomeMessage["iceServers"],
): { urls: string | string[] }[] {
  if (!servers || servers.length === 0) {
    return [{ urls: "stun:stun.l.google.com:19302" }];
  }
  return servers.map((s) => ({ urls: s.urls }));
}

function candidatePayload(c: IceCandidateInit) {
  return {
    candidate: c.candidate,
    sdpMid: c.sdpMid,
    sdpMLineIndex: c.sdpMLineIndex,
  };
}

function messageDataToString(data: string | ArrayBuffer): string {
  if (typeof data === "string") {
    return data;
  }
  try {
    return new TextDecoder().decode(data);
  } catch {
    return "";
  }
}

/** Stable frozen pose for welcome roster peers until a live pose arrives. */
function seedPoseFromPeer(peer: PresencePeer): PresencePose {
  let h = 2166136261;
  for (let i = 0; i < peer.userId.length; i++) {
    h ^= peer.userId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const x = 0.28 + ((h >>> 0) % 1000) / 2500;
  const y = 0.28 + ((h >>> 10) % 1000) / 2500;
  return {
    type: PRESENCE_POSE_TYPE,
    userId: peer.userId,
    username: peer.username || "Player",
    x: Math.min(0.72, Math.max(0.28, x)),
    y: Math.min(0.72, Math.max(0.28, y)),
  };
}

function isHubFullMessage(message?: string): boolean {
  if (!message) {
    return false;
  }
  return message.toLowerCase().includes("hub full");
}

/** Parse publisher userId from SFU board video stream id `video-{userId}`. */
function publisherIdFromVideoStream(
  stream: PresenceMediaStream | undefined,
): string | null {
  const id = stream?.id?.trim() ?? "";
  if (!id.startsWith(BOARD_VIDEO_STREAM_PREFIX)) {
    return null;
  }
  const userId = id.slice(BOARD_VIDEO_STREAM_PREFIX.length).trim();
  return userId.length > 0 ? userId : null;
}

/**
 * Map SDP a=mid → publisher userId for board video sections
 * (`a=msid:video-{userId} …`). Used when ontrack omits streams after rejoin.
 */
function videoMidToUserId(sdp: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!sdp) {
    return out;
  }
  const sections = sdp.split(/(?=^m=)/m);
  for (const section of sections) {
    if (!section.startsWith("m=video")) {
      continue;
    }
    const mid = section.match(/^a=mid:(\S+)/m)?.[1]?.trim();
    const msid = section.match(/^a=msid:(video-\S+)/m)?.[1]?.trim();
    if (!mid || !msid) {
      continue;
    }
    const userId = publisherIdFromVideoStream({
      id: msid,
    } as PresenceMediaStream);
    if (userId) {
      out[mid] = userId;
    }
  }
  return out;
}

function publisherIdFromTrackEvent(
  ev: TrackEventLike,
  remoteSdp: string | undefined,
): string | null {
  const fromStream = publisherIdFromVideoStream(ev.streams?.[0]);
  if (fromStream) {
    return fromStream;
  }
  const mid = ev.transceiver?.mid?.trim();
  if (mid && remoteSdp) {
    const mapped = videoMidToUserId(remoteSdp)[mid];
    if (mapped) {
      return mapped;
    }
  }
  // Last resort: single unmatched video-* msid in the remote SDP.
  if (remoteSdp) {
    const ids = Object.values(videoMidToUserId(remoteSdp));
    const unique = [...new Set(ids)];
    if (unique.length === 1) {
      return unique[0] ?? null;
    }
  }
  return null;
}

export type PresenceChannelResult = {
  status: BoardPresenceStatus;
  roomId: string | null;
  dcOpen: boolean;
  remotes: Record<string, PresencePose>;
  /** Peers currently in the room (welcome + peer-joined − peer-left). */
  roster: PresenceRosterEntry[];
  /** Phase 16.1 — local camera preview stream (board only; null when off/unavailable). */
  localVideoStream: PresenceMediaStream | null;
  /** Phase 16.1 — remote board camera streams keyed by publisher userId. */
  remoteVideoByUserId: Record<string, PresenceMediaStream>;
  /**
   * Phase 16.2 — display rotation (deg) for upright video.
   * Local iOS publishes a correction; remotes apply the same for that userId only.
   */
  localVideoRotationDeg: number;
  remoteVideoRotationByUserId: Record<string, number>;
  /**
   * Phase 16.2 — remote publishers who announced cam-off via DataChannel.
   * Remotes cannot see sender `track.enabled`; use this for AvatarPod.
   */
  remoteVideoMutedByUserId: Record<string, boolean>;
  /** Phase 16.1 — front/back facing for local camera (flip in 16.2). */
  cameraFacing: CameraFacing;
  /** Phase 16.2 — swap front/back camera via replaceTrack (board only). */
  flipCamera: () => Promise<void>;
  sendPose: (pose: PresencePoseInput) => void;
  /** Phase 17.1 — hub-only ephemeral chat lines (empty on board). */
  chatMessages: HubChatMessage[];
  /** Phase 17.1 — send hub chat; false if DC closed / invalid. No-op on board. */
  sendChat: (text: string) => boolean;
  /** Drop a remote avatar (call when game marks them resigned — Phase 7.5). */
  clearRemote: (userId: string) => void;
  /** Tear down presence WS + WebRTC immediately (leave game / resign). */
  disconnect: () => void;
};

type PresenceChannelOpts = {
  /** Path after /ws/presence/ — e.g. board/{id} or hub/{id} (segments already encoded). */
  roomPath: string | null;
  enabled?: boolean;
  /** Toast body for peer-joined (board vs hub). */
  joinToastMessage?: string;
  /**
   * When true, drop remotes on peer-left (hub).
   * Board keeps false so avatars linger until resign / hubId synthetic (7.5 / 8.2).
   */
  clearRemoteOnPeerLeft?: boolean;
  /**
   * When true (hub), seed remotes from welcome.peers and stop reconnect on hub-full.
   */
  seedWelcomePeers?: boolean;
  /** Phase 10 — publish local mic into the SFU PC (hub + board). */
  publishLocalAudio?: boolean;
  /** When true, local mic tracks stay `enabled=false` (Settings muteMic). */
  micMuted?: boolean;
  /**
   * Phase 16.1 — board only: publish local camera into the SFU PC.
   * Hub must leave this false (audio-only).
   */
  publishLocalVideo?: boolean;
  /** When true, local video tracks stay `enabled=false` (Settings muteVideo). */
  videoMuted?: boolean;
  /** Phase 17.1 — accept/send hubChat on the presence DC (hub only). */
  enableHubChat?: boolean;
};

/**
 * Shared presence signaling + pose DC (board or hub). PC/DC recover while WS stays up.
 * Dual presence: pins stay on game WS; this hook never drives boardIndex.
 */
function usePresenceChannel({
  roomPath,
  enabled = true,
  joinToastMessage = "On the board with you",
  clearRemoteOnPeerLeft = false,
  seedWelcomePeers = false,
  publishLocalAudio = false,
  micMuted = false,
  publishLocalVideo = false,
  videoMuted = false,
  enableHubChat = false,
}: PresenceChannelOpts): PresenceChannelResult {
  const { token } = useSession();
  const path = roomPath?.trim() ?? "";
  const active = Boolean(token && path && enabled);
  const [status, setStatus] = useState<BoardPresenceStatus>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [dcOpen, setDcOpen] = useState(false);
  const [remotes, setRemotes] = useState<Record<string, PresencePose>>({});
  const [rosterMap, setRosterMap] = useState<
    Record<string, PresenceRosterEntry>
  >({});
  const [chatMessages, setChatMessages] = useState<HubChatMessage[]>([]);
  const [localVideoStream, setLocalVideoStream] =
    useState<PresenceMediaStream | null>(null);
  const [remoteVideoByUserId, setRemoteVideoByUserId] = useState<
    Record<string, PresenceMediaStream>
  >({});
  const [remoteVideoRotationByUserId, setRemoteVideoRotationByUserId] =
    useState<Record<string, number>>({});
  const [remoteVideoMutedByUserId, setRemoteVideoMutedByUserId] = useState<
    Record<string, boolean>
  >({});
  /**
   * When native iOS frame-rotation effect is on, skip CSS rotate (metadata
   * uprights local + remotes). Fallback CSS only if native module missing.
   */
  const [iosCamEffectOn, setIosCamEffectOn] = useState(false);
  const localVideoRotationDeg = iosCamEffectOn
    ? 0
    : localBoardVideoRotationDeg();
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [flipBusy, setFlipBusy] = useState(false);

  const pcRef = useRef<PeerConnectionLike | null>(null);
  const dcRef = useRef<DataChannelLike | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingIceRef = useRef<IceCandidateInit[]>([]);
  const remoteSetRef = useRef(false);
  const toastedLeftRef = useRef<Set<string>>(new Set());
  const identityRef = useRef<{ userId: string; username: string } | null>(null);
  const iceServersRef = useRef<WelcomeMessage["iceServers"]>(undefined);
  const disconnectRef = useRef<() => void>(() => {});
  const localStreamRef = useRef<PresenceMediaStream | null>(null);
  const localAudioTracksRef = useRef<PresenceMediaTrack[]>([]);
  const localVideoTracksRef = useRef<PresenceMediaTrack[]>([]);
  const remoteStreamsRef = useRef<Map<string, PresenceMediaStream>>(new Map());
  const remoteAudioTracksRef = useRef<PresenceMediaTrack[]>([]);
  const facingModeRef = useRef<CameraFacing>("user");
  facingModeRef.current = cameraFacing;
  const joinToastRef = useRef(joinToastMessage);
  joinToastRef.current = joinToastMessage;
  const clearOnLeaveRef = useRef(clearRemoteOnPeerLeft);
  clearOnLeaveRef.current = clearRemoteOnPeerLeft;
  const seedWelcomeRef = useRef(seedWelcomePeers);
  seedWelcomeRef.current = seedWelcomePeers;
  const publishAudioRef = useRef(publishLocalAudio);
  publishAudioRef.current = publishLocalAudio;
  const publishVideoRef = useRef(publishLocalVideo);
  publishVideoRef.current = publishLocalVideo;
  const micMutedRef = useRef(micMuted);
  micMutedRef.current = micMuted;
  const videoMutedRef = useRef(videoMuted);
  videoMutedRef.current = videoMuted;
  const enableHubChatRef = useRef(enableHubChat);
  enableHubChatRef.current = enableHubChat;

  // Keep muteMic → track.enabled in sync without renegotiating.
  useEffect(() => {
    for (const track of localAudioTracksRef.current) {
      track.enabled = !micMuted;
    }
  }, [micMuted]);

  // Keep muteVideo → track.enabled in sync without renegotiating.
  useEffect(() => {
    for (const track of localVideoTracksRef.current) {
      track.enabled = !videoMuted;
    }
  }, [videoMuted]);

  // Announce cam-off to remotes (enabled=false is not visible across WebRTC).
  useEffect(() => {
    if (!publishVideoRef.current) {
      return;
    }
    const dc = dcRef.current;
    const identity = identityRef.current;
    if (!dc || !identity) {
      return;
    }
    if (dc.readyState && dc.readyState !== "open") {
      return;
    }
    try {
      dc.send(encodeVideoMuted(identity.userId, videoMuted));
    } catch (err) {
      console.warn("[presence] videoMuted send failed", err);
    }
  }, [videoMuted]);

  const applyRemotePose = useCallback((pose: PresencePose) => {
    setRemotes((prev) => {
      const prevPose = prev[pose.userId];
      if (
        prevPose &&
        prevPose.x === pose.x &&
        prevPose.y === pose.y &&
        prevPose.rot === pose.rot
      ) {
        return prev;
      }
      return { ...prev, [pose.userId]: pose };
    });
  }, []);

  const clearRemote = useCallback((userId: string) => {
    setRemotes((prev) => {
      if (!(userId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const flipCamera = useCallback(async () => {
    if (!publishVideoRef.current || flipBusy) {
      return;
    }
    const webrtc = loadWebRTC();
    const pc = pcRef.current;
    if (!webrtc?.mediaDevices?.getUserMedia || !pc?.getSenders) {
      return;
    }
    const nextFacing: CameraFacing =
      facingModeRef.current === "user" ? "environment" : "user";
    setFlipBusy(true);
    try {
      const fresh = await webrtc.mediaDevices.getUserMedia({
        audio: false,
        video: boardVideoConstraints(nextFacing),
      });
      const newTrack =
        typeof fresh.getVideoTracks === "function"
          ? fresh.getVideoTracks()[0]
          : fresh.getTracks().find((t) => t.kind === "video");
      if (!newTrack) {
        for (const t of fresh.getTracks()) {
          try {
            t.stop();
          } catch {
            // ignore
          }
        }
        fresh.release?.(true);
        return;
      }
      newTrack.enabled = !videoMutedRef.current;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) {
        try {
          newTrack.stop();
        } catch {
          // ignore
        }
        fresh.release?.(true);
        return;
      }
      await sender.replaceTrack(newTrack);
      const effectOn = applyMeetopolyBoardCamEffect(newTrack, nextFacing);
      setIosCamEffectOn(effectOn);
      const oldTracks = localVideoTracksRef.current;
      localVideoTracksRef.current = [newTrack];
      for (const old of oldTracks) {
        try {
          old.stop();
        } catch {
          // ignore
        }
      }
      // Preview uses the new video-only stream; audio senders keep prior tracks.
      localStreamRef.current = fresh;
      setLocalVideoStream(fresh);
      facingModeRef.current = nextFacing;
      setCameraFacing(nextFacing);
      // Orientation DC only as a legacy hint; Android uses frame metadata.
      if (!effectOn) {
        const deg = localBoardVideoRotationDeg();
        if (deg !== 0) {
          const dc = dcRef.current;
          const identity = identityRef.current;
          if (dc && identity && (!dc.readyState || dc.readyState === "open")) {
            try {
              dc.send(encodeVideoOrientation(identity.userId, deg));
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      console.warn("[presence] flipCamera failed", err);
    } finally {
      setFlipBusy(false);
    }
  }, [flipBusy]);

  const sendPose = useCallback((pose: PresencePoseInput) => {
    const dc = dcRef.current;
    const identity = identityRef.current;
    if (!dc || !identity) {
      return;
    }
    if (dc.readyState && dc.readyState !== "open") {
      return;
    }
    try {
      dc.send(
        encodePresencePose(identity, {
          ...pose,
          t: pose.t ?? Date.now(),
        }),
      );
    } catch (err) {
      console.warn("[presence] sendPose failed", err);
    }
  }, []);

  /** Hub-only chat. SFU does not echo to sender — optimistic local append. */
  const sendChat = useCallback((text: string): boolean => {
    if (!enableHubChatRef.current) {
      return false;
    }
    const dc = dcRef.current;
    const identity = identityRef.current;
    if (!dc || !identity) {
      return false;
    }
    if (dc.readyState && dc.readyState !== "open") {
      return false;
    }
    const stampedText = normalizeHubChatText(text);
    const payload = stampedText ? encodeHubChat(stampedText) : null;
    if (!stampedText || !payload) {
      return false;
    }
    try {
      dc.send(payload);
    } catch (err) {
      console.warn("[presence] sendChat failed", err);
      return false;
    }
    const optimistic: HubChatMessage = {
      type: HUB_CHAT_MSG_TYPE,
      userId: identity.userId,
      username: identity.username,
      text: stampedText,
      t: Date.now(),
    };
    setChatMessages((prev) => {
      const next = [...prev, optimistic];
      return next.length > MAX_HUB_CHAT_BUFFER
        ? next.slice(next.length - MAX_HUB_CHAT_BUFFER)
        : next;
    });
    return true;
  }, []);

  const disconnect = useCallback(() => {
    disconnectRef.current();
  }, []);

  useEffect(() => {
    if (!active) {
      setStatus("idle");
      setRoomId(null);
      setDcOpen(false);
      setRemotes({});
      setRosterMap({});
      setChatMessages([]);
      setLocalVideoStream(null);
      setRemoteVideoByUserId({});
      setRemoteVideoRotationByUserId({});
      setRemoteVideoMutedByUserId({});
      setIosCamEffectOn(false);
      identityRef.current = null;
      disconnectRef.current = () => {};
      return;
    }

    let cancelled = false;
    let stopReconnect = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let recoverTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let recoverAttempt = 0;
    /**
     * True from join createOffer until join answer is applied — SFU offers
     * that arrive mid-join are queued (not dropped).
     */
    let joining = false;
    /**
     * When true, DataChannel/PC close must not schedule recover (intentional
     * teardown during rejoin). Without this, teardown → dc.onclose → recover
     * races a second client offer and the SFU returns "offer failed".
     */
    let suppressDcRecover = false;
    /** Bumps on each startWebRTC; stale async getUserMedia must not finish. */
    let startGeneration = 0;
    let pendingSfuOffer: string | null = null;
    const webrtc = loadWebRTC();

    const stopFatal = (nextStatus: BoardPresenceStatus = "error") => {
      stopReconnect = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      teardownPeer();
      const ws = wsRef.current;
      wsRef.current = null;
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
      if (!cancelled) {
        setStatus(nextStatus);
        setDcOpen(false);
      }
    };

    const stopLocalMedia = () => {
      const audioTracks = localAudioTracksRef.current;
      localAudioTracksRef.current = [];
      const videoTracks = localVideoTracksRef.current;
      localVideoTracksRef.current = [];
      for (const track of [...audioTracks, ...videoTracks]) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      const stream = localStreamRef.current;
      localStreamRef.current = null;
      if (stream?.release) {
        try {
          stream.release(true);
        } catch {
          // ignore
        }
      }
      if (!cancelled) {
        setLocalVideoStream(null);
      }
    };

    const stopRemoteMedia = () => {
      const tracks = remoteAudioTracksRef.current;
      remoteAudioTracksRef.current = [];
      for (const track of tracks) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      for (const stream of remoteStreamsRef.current.values()) {
        if (stream.release) {
          try {
            stream.release(false);
          } catch {
            // ignore
          }
        }
      }
      remoteStreamsRef.current.clear();
      if (!cancelled) {
        setRemoteVideoByUserId({});
        setRemoteVideoRotationByUserId({});
        setRemoteVideoMutedByUserId({});
        setIosCamEffectOn(false);
      }
    };

    const teardownPeer = () => {
      // Do not clear `joining` here — startWebRTC owns that flag. Clearing it
      // before dc.close() allowed onclose → scheduleRecover mid-rejoin.
      suppressDcRecover = true;
      remoteSetRef.current = false;
      pendingIceRef.current = [];
      pendingSfuOffer = null;
      stopLocalMedia();
      stopRemoteMedia();
      const dc = dcRef.current;
      dcRef.current = null;
      if (dc?.close) {
        try {
          dc.close();
        } catch {
          // ignore
        }
      }
      const pc = pcRef.current;
      pcRef.current = null;
      if (pc) {
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.ontrack = null;
        try {
          pc.close();
        } catch {
          // ignore
        }
      }
      setDcOpen(false);
    };

    const flushPendingIce = async (pc: PeerConnectionLike) => {
      if (!webrtc) {
        return;
      }
      const queued = pendingIceRef.current;
      pendingIceRef.current = [];
      for (const cand of queued) {
        if (!cand?.candidate) {
          continue;
        }
        try {
          await pc.addIceCandidate(new webrtc.RTCIceCandidate(cand));
        } catch {
          // trickle race — ignore
        }
      }
    };

    const scheduleRecover = (reason: string) => {
      if (cancelled || joining || suppressDcRecover || recoverTimer) {
        return;
      }
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const delay = Math.min(4_000, 400 * 2 ** recoverAttempt);
      recoverAttempt += 1;
      console.warn("[presence] schedule WebRTC recover", reason, delay);
      recoverTimer = setTimeout(() => {
        recoverTimer = undefined;
        if (cancelled || suppressDcRecover || joining) {
          return;
        }
        const openWs = wsRef.current;
        if (!openWs || openWs.readyState !== WebSocket.OPEN) {
          return;
        }
        void startWebRTC(openWs, iceServersRef.current).catch((err) => {
          console.warn("[presence] recover failed", err);
        });
      }, delay);
    };

    const announceLocalVideoOrientation = () => {
      if (!publishVideoRef.current) {
        return;
      }
      const deg = localBoardVideoRotationDeg();
      if (deg === 0) {
        return;
      }
      const dc = dcRef.current;
      const identity = identityRef.current;
      if (!dc || !identity) {
        return;
      }
      if (dc.readyState && dc.readyState !== "open") {
        return;
      }
      try {
        dc.send(encodeVideoOrientation(identity.userId, deg));
      } catch (err) {
        console.warn("[presence] videoOrientation send failed", err);
      }
    };

    const announceLocalVideoMuted = () => {
      if (!publishVideoRef.current) {
        return;
      }
      const dc = dcRef.current;
      const identity = identityRef.current;
      if (!dc || !identity) {
        return;
      }
      if (dc.readyState && dc.readyState !== "open") {
        return;
      }
      try {
        dc.send(encodeVideoMuted(identity.userId, videoMutedRef.current));
      } catch (err) {
        console.warn("[presence] videoMuted send failed", err);
      }
    };

    const bindDataChannel = (dc: DataChannelLike) => {
      dcRef.current = dc;
      dc.onopen = () => {
        if (!cancelled) {
          recoverAttempt = 0;
          suppressDcRecover = false;
          setDcOpen(true);
          setStatus("connected");
          announceLocalVideoOrientation();
          announceLocalVideoMuted();
        }
      };
      dc.onclose = () => {
        if (dcRef.current === dc) {
          dcRef.current = null;
        }
        if (!cancelled) {
          setDcOpen(false);
        }
        if (!cancelled && !joining && !suppressDcRecover) {
          scheduleRecover("dc-close");
        }
      };
      dc.onmessage = (ev) => {
        const text = messageDataToString(ev.data);
        if (cancelled || !text) {
          return;
        }
        if (enableHubChatRef.current) {
          const chat = parseHubChat(text);
          if (chat) {
            if (
              identityRef.current &&
              chat.userId === identityRef.current.userId
            ) {
              return;
            }
            setChatMessages((prev) => {
              const next = [...prev, chat];
              return next.length > MAX_HUB_CHAT_BUFFER
                ? next.slice(next.length - MAX_HUB_CHAT_BUFFER)
                : next;
            });
            return;
          }
        }
        const mutedMsg = parseVideoMuted(text);
        if (mutedMsg) {
          if (
            identityRef.current &&
            mutedMsg.userId === identityRef.current.userId
          ) {
            return;
          }
          setRemoteVideoMutedByUserId((prev) => {
            if (prev[mutedMsg.userId] === mutedMsg.muted) {
              return prev;
            }
            return { ...prev, [mutedMsg.userId]: mutedMsg.muted };
          });
          return;
        }
        const orient = parseVideoOrientation(text);
        if (orient) {
          if (
            identityRef.current &&
            orient.userId === identityRef.current.userId
          ) {
            return;
          }
          setRemoteVideoRotationByUserId((prev) => {
            if (prev[orient.userId] === orient.rotationDeg) {
              return prev;
            }
            return { ...prev, [orient.userId]: orient.rotationDeg };
          });
          return;
        }
        const pose = parsePresencePose(text);
        if (!pose) {
          return;
        }
        if (identityRef.current && pose.userId === identityRef.current.userId) {
          return;
        }
        applyRemotePose(pose);
      };
    };

    const startWebRTC = async (
      ws: WebSocket,
      iceServers: WelcomeMessage["iceServers"],
    ) => {
      if (!webrtc) {
        setStatus("connected");
        return;
      }
      const gen = ++startGeneration;
      joining = true;
      suppressDcRecover = true;
      pendingSfuOffer = null;
      if (recoverTimer) {
        clearTimeout(recoverTimer);
        recoverTimer = undefined;
      }
      try {
        teardownPeer();
        joining = true;
        suppressDcRecover = true;
        if (gen !== startGeneration) {
          return;
        }
        const pc = new webrtc.RTCPeerConnection({
          iceServers: iceServersFromWelcome(iceServers),
        });
        pcRef.current = pc;

        pc.onicecandidate = (ev) => {
          const candidate = ev.candidate;
          if (!candidate || cancelled || ws.readyState !== WebSocket.OPEN) {
            return;
          }
          ws.send(
            JSON.stringify({
              type: "ice",
              candidate: candidatePayload(candidate),
            }),
          );
        };

        pc.onconnectionstatechange = () => {
          if (cancelled || pcRef.current !== pc) {
            return;
          }
          if (pc.connectionState === "connected") {
            setStatus("connected");
          } else if (
            pc.connectionState === "failed" ||
            pc.connectionState === "closed"
          ) {
            setDcOpen(false);
            if (!joining) {
              scheduleRecover(`pc-${pc.connectionState}`);
            }
          }
        };

        // Phase 10.2 / 16.1 — remote audio (+ board video). Holding streams keeps RN playout alive.
        if (publishAudioRef.current || publishVideoRef.current) {
          if (publishAudioRef.current) {
            startHubSpeaker();
          }
          pc.ontrack = (ev) => {
            if (cancelled || pcRef.current !== pc) {
              return;
            }
            const track = ev.track;
            if (!track) {
              return;
            }
            let stream = ev.streams?.[0];
            if (!stream && webrtc.MediaStream) {
              try {
                stream = new webrtc.MediaStream([track]);
              } catch (err) {
                console.warn("[presence] remote MediaStream wrap failed", err);
              }
            }

            if (track.kind === "audio") {
              if (!publishAudioRef.current) {
                return;
              }
              track.enabled = true;
              remoteAudioTracksRef.current = [
                ...remoteAudioTracksRef.current.filter(
                  (t) => t.id !== track.id,
                ),
                track,
              ];
              if (stream) {
                const key = stream.id || track.id || `audio-${Date.now()}`;
                remoteStreamsRef.current.set(key, stream);
              }
              return;
            }

            if (track.kind === "video") {
              if (!publishVideoRef.current) {
                return;
              }
              track.enabled = true;
              const userId = publisherIdFromTrackEvent(
                ev,
                pc.remoteDescription?.sdp,
              );
              if (!userId || !stream) {
                console.warn(
                  "[presence] remote video missing video-{userId} mapping",
                  {
                    streamId: stream?.id,
                    mid: ev.transceiver?.mid,
                  },
                );
                return;
              }
              remoteStreamsRef.current.set(stream.id || userId, stream);
              const boundStream = stream;
              const commit = () => {
                if (cancelled || pcRef.current !== pc) {
                  return;
                }
                setRemoteVideoByUserId((prev) => ({
                  ...prev,
                  [userId]: boundStream,
                }));
                // Clear stale cam-off from a previous session for this peer.
                setRemoteVideoMutedByUserId((prev) => {
                  if (!(userId in prev)) {
                    return prev;
                  }
                  const next = { ...prev };
                  delete next[userId];
                  return next;
                });
              };
              commit();
              // Rejoin can deliver muted tracks until first frame — remount on unmute.
              track.onunmute = () => {
                commit();
              };
              track.onended = () => {
                if (cancelled || pcRef.current !== pc) {
                  return;
                }
                setRemoteVideoByUserId((prev) => {
                  if (prev[userId] !== boundStream) {
                    return prev;
                  }
                  const next = { ...prev };
                  delete next[userId];
                  return next;
                });
              };
            }
          };
        }

        const dc = pc.createDataChannel(PRESENCE_DC_LABEL, { ordered: true });
        bindDataChannel(dc);

        // Phase 10.1 / 16.1 — publish mic (+ board camera) before createOffer.
        if (
          (publishAudioRef.current || publishVideoRef.current) &&
          webrtc.mediaDevices?.getUserMedia
        ) {
          try {
            const wantAudio = publishAudioRef.current;
            const wantVideo = publishVideoRef.current;
            const stream = await webrtc.mediaDevices.getUserMedia({
              audio: wantAudio,
              video: wantVideo
                ? boardVideoConstraints(facingModeRef.current)
                : false,
            });
            if (
              cancelled ||
              gen !== startGeneration ||
              pcRef.current !== pc
            ) {
              for (const track of stream.getTracks()) {
                try {
                  track.stop();
                } catch {
                  // ignore
                }
              }
              stream.release?.(true);
              if (gen === startGeneration) {
                joining = false;
                suppressDcRecover = false;
              }
              return;
            }
            localStreamRef.current = stream;
            const audioTracks = wantAudio ? stream.getAudioTracks() : [];
            const videoTracks = wantVideo
              ? typeof stream.getVideoTracks === "function"
                ? stream.getVideoTracks()
                : stream.getTracks().filter((t) => t.kind === "video")
              : [];
            localAudioTracksRef.current = audioTracks;
            localVideoTracksRef.current = videoTracks;
            const micOn = !micMutedRef.current;
            const camOn = !videoMutedRef.current;
            for (const track of audioTracks) {
              track.enabled = micOn;
              pc.addTrack(track, stream);
            }
            let anyEffect = false;
            for (const track of videoTracks) {
              track.enabled = camOn;
              if (applyMeetopolyBoardCamEffect(track, facingModeRef.current)) {
                anyEffect = true;
              }
              pc.addTrack(track, stream);
            }
            if (!cancelled) {
              setIosCamEffectOn(anyEffect);
            }
            if (wantVideo && videoTracks.length > 0) {
              setLocalVideoStream(stream);
              // Rejoin: first frames may arrive muted — nudge React remount on unmute.
              for (const track of videoTracks) {
                track.onunmute = () => {
                  if (cancelled || localStreamRef.current !== stream) {
                    return;
                  }
                  setLocalVideoStream(null);
                  requestAnimationFrame(() => {
                    if (cancelled || localStreamRef.current !== stream) {
                      return;
                    }
                    setLocalVideoStream(stream);
                  });
                };
              }
              // CSS/DC orientation only if native frame-tag effect unavailable.
              if (!anyEffect) {
                announceLocalVideoOrientation();
              }
              announceLocalVideoMuted();
            } else {
              setLocalVideoStream(null);
            }
          } catch (err) {
            console.warn("[presence] getUserMedia failed", err);
            // Pose DC still works without mic/camera.
            setLocalVideoStream(null);
          }
        }

        const offer = await pc.createOffer({});
        if (cancelled || gen !== startGeneration || pcRef.current !== pc) {
          if (gen === startGeneration) {
            joining = false;
            suppressDcRecover = false;
          }
          return;
        }
        await pc.setLocalDescription(offer);
        if (
          cancelled ||
          gen !== startGeneration ||
          pcRef.current !== pc ||
          ws.readyState !== WebSocket.OPEN
        ) {
          if (gen === startGeneration) {
            joining = false;
            suppressDcRecover = false;
          }
          return;
        }
        const local = pc.localDescription;
        if (!local?.sdp) {
          joining = false;
          suppressDcRecover = false;
          return;
        }
        ws.send(JSON.stringify({ type: "offer", sdp: local.sdp }));
        // Keep joining=true until the SFU join answer is applied.
        // suppressDcRecover clears on dc.onopen (or answer failure below).
      } catch (err) {
        if (gen === startGeneration) {
          joining = false;
          suppressDcRecover = false;
        }
        throw err;
      }
    };

    const answerSfuOffer = async (sdp: string) => {
      if (
        !sdp ||
        cancelled ||
        !(publishAudioRef.current || publishVideoRef.current) ||
        !webrtc
      ) {
        return;
      }
      if (joining || !remoteSetRef.current) {
        pendingSfuOffer = sdp;
        return;
      }
      const pc = pcRef.current;
      const openWs = wsRef.current;
      if (!pc || !openWs || openWs.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        await pc.setRemoteDescription(
          new webrtc.RTCSessionDescription({
            type: "offer",
            sdp,
          }),
        );
        remoteSetRef.current = true;
        await flushPendingIce(pc);
        const answer = await pc.createAnswer({});
        await pc.setLocalDescription(answer);
        if (cancelled || openWs.readyState !== WebSocket.OPEN) {
          return;
        }
        const local = pc.localDescription;
        if (!local?.sdp) {
          return;
        }
        openWs.send(JSON.stringify({ type: "answer", sdp: local.sdp }));
      } catch (err) {
        console.warn("[presence] SFU offer answer failed", err);
      }
    };

    const flushPendingSfuOffer = async () => {
      const sdp = pendingSfuOffer;
      pendingSfuOffer = null;
      if (sdp && !cancelled && !joining && remoteSetRef.current) {
        await answerSfuOffer(sdp);
      }
    };

    const handleMessage = async (ws: WebSocket, raw: string) => {
      let msg: PresenceServerMessage;
      try {
        msg = JSON.parse(raw) as PresenceServerMessage;
      } catch {
        return;
      }
      switch (msg.type) {
        case "welcome": {
          const welcome = msg as WelcomeMessage;
          identityRef.current = {
            userId: welcome.userId,
            username: welcome.username,
          };
          iceServersRef.current = welcome.iceServers;
          setRoomId(welcome.roomId);
          setStatus("connecting");
          {
            const nextRoster: Record<string, PresenceRosterEntry> = {};
            const localCountry =
              typeof welcome.country === "string"
                ? welcome.country.trim().toUpperCase()
                : "";
            if (welcome.userId) {
              const localAvatar =
                typeof welcome.avatarUrl === "string"
                  ? welcome.avatarUrl.trim()
                  : "";
              nextRoster[welcome.userId] = {
                userId: welcome.userId,
                username: welcome.username || "Player",
                ...(localCountry ? { country: localCountry } : {}),
                ...(localAvatar ? { avatarUrl: localAvatar } : {}),
              };
            }
            for (const peer of welcome.peers ?? []) {
              if (!peer.userId || peer.userId === welcome.userId) {
                continue;
              }
              const peerCountry =
                typeof peer.country === "string"
                  ? peer.country.trim().toUpperCase()
                  : "";
              const peerAvatar =
                typeof peer.avatarUrl === "string"
                  ? peer.avatarUrl.trim()
                  : "";
              nextRoster[peer.userId] = {
                userId: peer.userId,
                username: peer.username || "Player",
                ...(peerCountry ? { country: peerCountry } : {}),
                ...(peerAvatar ? { avatarUrl: peerAvatar } : {}),
              };
            }
            setRosterMap(nextRoster);
          }
          if (seedWelcomeRef.current) {
            const seeded: Record<string, PresencePose> = {};
            for (const peer of welcome.peers ?? []) {
              if (!peer.userId || peer.userId === welcome.userId) {
                continue;
              }
              seeded[peer.userId] = seedPoseFromPeer(peer);
            }
            setRemotes(seeded);
          }
          try {
            await startWebRTC(ws, welcome.iceServers);
          } catch (err) {
            console.warn("[presence] WebRTC start failed", err);
            setStatus("connected");
          }
          break;
        }
        case "answer": {
          const answer = msg as AnswerMessage;
          const pc = pcRef.current;
          if (!pc || !webrtc || !answer.sdp) {
            break;
          }
          try {
            await pc.setRemoteDescription(
              new webrtc.RTCSessionDescription({
                type: "answer",
                sdp: answer.sdp,
              }),
            );
            remoteSetRef.current = true;
            joining = false;
            // DC may already be open; allow unexpected closes to recover again.
            if (dcRef.current) {
              suppressDcRecover = false;
            }
            await flushPendingIce(pc);
            await flushPendingSfuOffer();
            // Rejoin: existing board pubs are in this answer; ontrack should fire.
            // If streams were omitted, mid→userId mapping in ontrack recovers them.
          } catch (err) {
            joining = false;
            suppressDcRecover = false;
            console.warn("[presence] setRemoteDescription failed", err);
          }
          break;
        }
        case "offer": {
          // Phase 10.2 / 16.1 — SFU renegotiation when another peer publishes audio/video.
          const offer = msg as OfferMessage;
          if (!offer.sdp) {
            break;
          }
          // Pose-only hubs never publish media — ignore SFU offers (should not arrive).
          if (!(publishAudioRef.current || publishVideoRef.current)) {
            break;
          }
          if (joining || !remoteSetRef.current) {
            pendingSfuOffer = offer.sdp;
            break;
          }
          await answerSfuOffer(offer.sdp);
          break;
        }
        case "ice": {
          const ice = msg as IceMessage;
          if (!ice.candidate?.candidate || !webrtc) {
            break;
          }
          const pc = pcRef.current;
          if (!pc || !remoteSetRef.current) {
            pendingIceRef.current.push(ice.candidate);
            break;
          }
          try {
            await pc.addIceCandidate(new webrtc.RTCIceCandidate(ice.candidate));
          } catch {
            // ignore bad/late candidates
          }
          break;
        }
        case "peer-joined": {
          const peer = msg as PeerJoinedMessage;
          toastedLeftRef.current.delete(peer.userId);
          const name = formatUsername(peer.username) || "Player";
          const peerCountry =
            typeof peer.country === "string"
              ? peer.country.trim().toUpperCase()
              : "";
          const peerAvatar =
            typeof peer.avatarUrl === "string" ? peer.avatarUrl.trim() : "";
          if (peer.userId) {
            setRosterMap((prev) => ({
              ...prev,
              [peer.userId]: {
                userId: peer.userId,
                username: peer.username || "Player",
                ...(peerCountry ? { country: peerCountry } : {}),
                ...(peerAvatar ? { avatarUrl: peerAvatar } : {}),
              },
            }));
          }
          notify({
            type: "info",
            title: `${name} joined`,
            message: joinToastRef.current,
            visibilityTime: 2800,
          });
          announceLocalVideoOrientation();
          announceLocalVideoMuted();
          if (seedWelcomeRef.current && peer.userId) {
            setRemotes((prev) => {
              if (prev[peer.userId]) {
                return prev;
              }
              return {
                ...prev,
                [peer.userId]: seedPoseFromPeer({
                  userId: peer.userId,
                  username: peer.username,
                  country: peerCountry || undefined,
                }),
              };
            });
          }
          break;
        }
        case "peer-left": {
          // Board: linger until resign / hubId synthetic. Hub: remove avatar immediately.
          // Video streams always clear — peer left the SFU room.
          const peer = msg as PeerLeftMessage;
          if (peer.userId) {
            setRosterMap((prev) => {
              if (!(peer.userId in prev)) {
                return prev;
              }
              const next = { ...prev };
              delete next[peer.userId];
              return next;
            });
            setRemoteVideoByUserId((prev) => {
              if (!(peer.userId in prev)) {
                return prev;
              }
              const next = { ...prev };
              delete next[peer.userId];
              return next;
            });
            setRemoteVideoRotationByUserId((prev) => {
              if (!(peer.userId in prev)) {
                return prev;
              }
              const next = { ...prev };
              delete next[peer.userId];
              return next;
            });
            setRemoteVideoMutedByUserId((prev) => {
              if (!(peer.userId in prev)) {
                return prev;
              }
              const next = { ...prev };
              delete next[peer.userId];
              return next;
            });
          }
          if (clearOnLeaveRef.current) {
            if (peer.userId) {
              setRemotes((prev) => {
                if (!(peer.userId in prev)) {
                  return prev;
                }
                const next = { ...prev };
                delete next[peer.userId];
                return next;
              });
            }
          }
          break;
        }
        case "error": {
          const err = msg as ErrorMessage;
          console.warn("[presence] server error", err.message);
          if (seedWelcomeRef.current && isHubFullMessage(err.message)) {
            notify({
              type: "error",
              title: "Hub full",
              message: "This hub already has 10 players",
              visibilityTime: 3600,
            });
            stopFatal("error");
          }
          break;
        }
        default:
          break;
      }
    };

    const connect = () => {
      if (cancelled) {
        return;
      }
      setStatus("connecting");
      toastedLeftRef.current.clear();
      const ws = new WebSocket(
        `${getWsBaseUrl()}/ws/presence/${path}?token=${encodeURIComponent(token!)}`,
      );
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) {
          attempt = 0;
        }
      };
      ws.onmessage = (ev) => {
        void handleMessage(ws, String(ev.data));
      };
      ws.onerror = () => {
        // onclose reconnects
      };
      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        teardownPeer();
        // Hub: drop ghosts before welcome re-seed. Board keeps linger remotes across soft reconnect.
        if (!cancelled && seedWelcomeRef.current) {
          setRemotes({});
        }
        if (cancelled || stopReconnect) {
          return;
        }
        setStatus("connecting");
        const delay = Math.min(8_000, 500 * 2 ** attempt);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    const hardDisconnect = () => {
      cancelled = true;
      stopReconnect = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      if (recoverTimer) {
        clearTimeout(recoverTimer);
        recoverTimer = undefined;
      }
      const ws = wsRef.current;
      wsRef.current = null;
      teardownPeer();
      if (publishAudioRef.current) {
        stopHubSpeaker();
      }
      identityRef.current = null;
      iceServersRef.current = undefined;
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        ws.close();
      }
      setStatus("idle");
      setRoomId(null);
      setDcOpen(false);
      setRemotes({});
      setRosterMap({});
      setChatMessages([]);
      setLocalVideoStream(null);
      setRemoteVideoByUserId({});
      setRemoteVideoRotationByUserId({});
      setRemoteVideoMutedByUserId({});
      setIosCamEffectOn(false);
    };

    disconnectRef.current = hardDisconnect;
    connect();

    return () => {
      hardDisconnect();
      disconnectRef.current = () => {};
    };
  }, [active, token, path, applyRemotePose]);

  return {
    status,
    roomId,
    dcOpen,
    remotes,
    roster: Object.values(rosterMap),
    chatMessages,
    localVideoStream,
    remoteVideoByUserId,
    localVideoRotationDeg,
    remoteVideoRotationByUserId,
    remoteVideoMutedByUserId,
    cameraFacing,
    flipCamera,
    sendPose,
    sendChat,
    clearRemote,
    disconnect,
  };
}

/**
 * Phase 7 board presence. Pass `enabled=false` only when fully leaving the table
 * (resign / worlds). Locations, Health, and Hub keep `enabled=true` — board SFU
 * (cameras + table voice) stays alive under the stack.
 * Phase 10.4 — publishes/plays mic (`muteMic` SoT).
 * Phase 16.1 — publishes/plays board camera (`muteVideo` SoT).
 */
export function useBoardPresence(
  gameId: string | null | undefined,
  enabled = true,
): PresenceChannelResult {
  const id = gameId?.trim() ?? "";
  const { muted, ready: micReady } = useMuteMic();
  const { muted: videoMuted, ready: videoReady } = useMuteVideo();
  return usePresenceChannel({
    roomPath: id ? `board/${encodeURIComponent(id)}` : null,
    enabled: enabled && Boolean(id) && micReady && videoReady,
    joinToastMessage: "On the board with you",
    publishLocalAudio: true,
    micMuted: muted,
    publishLocalVideo: true,
    videoMuted,
  });
}

/**
 * Phase 8.0 hub presence — any logged-in user; room `hub:{hubId}` on the server.
 * Pose DataChannel only (no mic/speaker). Table A/V stays on the board SFU while
 * the hub UI is open (same keep-alive pattern as Locations).
 */
export function useHubPresence(
  hubId: string | null | undefined,
): PresenceChannelResult {
  const id = hubId?.trim() ?? "";
  return usePresenceChannel({
    roomPath: id ? `hub/${encodeURIComponent(id)}` : null,
    enabled: Boolean(id),
    joinToastMessage: "In this hub with you",
    clearRemoteOnPeerLeft: true,
    seedWelcomePeers: true,
    publishLocalAudio: false,
    publishLocalVideo: false,
    enableHubChat: true,
  });
}
