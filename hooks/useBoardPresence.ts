import { useEffect, useRef, useState } from 'react';

import { getWsBaseUrl } from '@/api/client';
import { useSession } from '@/hooks/useSession';
import { formatUsername } from '@/lib/formatUsername';
import { notify } from '@/lib/notify';

const PRESENCE_DC_LABEL = 'presence';

type PresencePeer = {
  userId: string;
  username: string;
};

type WelcomeMessage = {
  type: 'welcome';
  roomId: string;
  userId: string;
  username: string;
  peers?: PresencePeer[];
  iceServers?: { urls: string | string[] }[];
};

type PeerJoinedMessage = {
  type: 'peer-joined';
  userId: string;
  username: string;
};

type PeerLeftMessage = {
  type: 'peer-left';
  userId: string;
  username: string;
};

type AnswerMessage = {
  type: 'answer';
  sdp: string;
};

type IceCandidateInit = {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

type IceMessage = {
  type: 'ice';
  candidate: IceCandidateInit | null;
};

type ErrorMessage = {
  type: 'error';
  message?: string;
};

type PresenceServerMessage =
  | WelcomeMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | AnswerMessage
  | IceMessage
  | ErrorMessage
  | { type: 'pong' }
  | { type: string };

export type BoardPresenceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error';

/** Minimal WebRTC surface used by Phase 7.0 (avoids hard Expo Go import crash). */
type WebRTCModule = {
  RTCPeerConnection: new (config?: {
    iceServers?: { urls: string | string[] }[];
  }) => PeerConnectionLike;
  RTCSessionDescription: new (init: {
    type: string;
    sdp: string;
  }) => { type: string; sdp: string };
  RTCIceCandidate: new (init: IceCandidateInit) => IceCandidateInit;
};

type PeerConnectionLike = {
  localDescription: { sdp?: string } | null;
  connectionState: string;
  onicecandidate:
    | ((ev: { candidate: IceCandidateInit | null }) => void)
    | null;
  onconnectionstatechange: (() => void) | null;
  createDataChannel: (
    label: string,
    init?: { ordered?: boolean },
  ) => DataChannelLike;
  createOffer: (opts?: object) => Promise<{ type: string; sdp: string }>;
  setLocalDescription: (desc: { type: string; sdp: string }) => Promise<void>;
  setRemoteDescription: (desc: { type: string; sdp: string }) => Promise<void>;
  addIceCandidate: (c: IceCandidateInit) => Promise<void>;
  close: () => void;
};

type DataChannelLike = {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: (() => void) | null;
};

function loadWebRTC(): WebRTCModule | null {
  try {
    // Dynamic require so Expo Go can still render the board without native WebRTC.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-webrtc') as WebRTCModule;
  } catch (err) {
    console.warn('[presence] react-native-webrtc unavailable', err);
    return null;
  }
}

function iceServersFromWelcome(
  servers: WelcomeMessage['iceServers'],
): { urls: string | string[] }[] {
  if (!servers || servers.length === 0) {
    return [{ urls: 'stun:stun.l.google.com:19302' }];
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

/**
 * Phase 7.0 — join `board:{gameId}` presence room over WS signaling + Pion SFU.
 * Opens an idle DataChannel (`presence`); pose fan-out starts in 7.1.
 * Toasts on peer join/leave. Full PeerConnection needs a dev client build.
 */
export function useBoardPresence(gameId: string | null | undefined): {
  status: BoardPresenceStatus;
  roomId: string | null;
  dcOpen: boolean;
} {
  const { token } = useSession();
  const id = gameId?.trim() ?? '';
  const [status, setStatus] = useState<BoardPresenceStatus>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [dcOpen, setDcOpen] = useState(false);

  const pcRef = useRef<PeerConnectionLike | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingIceRef = useRef<IceCandidateInit[]>([]);
  const remoteSetRef = useRef(false);
  const toastedLeftRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!token || !id) {
      setStatus('idle');
      setRoomId(null);
      setDcOpen(false);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const webrtc = loadWebRTC();

    const teardownPeer = () => {
      remoteSetRef.current = false;
      pendingIceRef.current = [];
      const pc = pcRef.current;
      pcRef.current = null;
      if (pc) {
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

    const startWebRTC = async (
      ws: WebSocket,
      iceServers: WelcomeMessage['iceServers'],
    ) => {
      if (!webrtc) {
        // Signaling-only: join/leave toasts still work without a native PC.
        setStatus('connected');
        return;
      }
      teardownPeer();
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
            type: 'ice',
            candidate: candidatePayload(candidate),
          }),
        );
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) {
          return;
        }
        if (pc.connectionState === 'connected') {
          setStatus('connected');
        } else if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setDcOpen(false);
        }
      };

      const dc = pc.createDataChannel(PRESENCE_DC_LABEL, { ordered: true });
      dc.onopen = () => {
        if (!cancelled) {
          setDcOpen(true);
        }
      };
      dc.onclose = () => {
        if (!cancelled) {
          setDcOpen(false);
        }
      };
      // Phase 7.0: idle — ignore payloads until 7.1 pose fan-out.
      dc.onmessage = () => {};

      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      if (cancelled || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const local = pc.localDescription;
      if (!local?.sdp) {
        return;
      }
      ws.send(JSON.stringify({ type: 'offer', sdp: local.sdp }));
    };

    const handleMessage = async (ws: WebSocket, raw: string) => {
      let msg: PresenceServerMessage;
      try {
        msg = JSON.parse(raw) as PresenceServerMessage;
      } catch {
        return;
      }
      switch (msg.type) {
        case 'welcome': {
          const welcome = msg as WelcomeMessage;
          setRoomId(welcome.roomId);
          setStatus('connecting');
          try {
            await startWebRTC(ws, welcome.iceServers);
          } catch (err) {
            console.warn('[presence] WebRTC start failed', err);
            // Keep WS room membership for join/leave toasts.
            setStatus('connected');
          }
          break;
        }
        case 'answer': {
          const answer = msg as AnswerMessage;
          const pc = pcRef.current;
          if (!pc || !webrtc || !answer.sdp) {
            break;
          }
          try {
            await pc.setRemoteDescription(
              new webrtc.RTCSessionDescription({
                type: 'answer',
                sdp: answer.sdp,
              }),
            );
            remoteSetRef.current = true;
            await flushPendingIce(pc);
          } catch (err) {
            console.warn('[presence] setRemoteDescription failed', err);
          }
          break;
        }
        case 'ice': {
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
        case 'peer-joined': {
          const peer = msg as PeerJoinedMessage;
          toastedLeftRef.current.delete(peer.userId);
          const name = formatUsername(peer.username) || 'Player';
          notify({
            type: 'info',
            title: `${name} joined presence`,
            message: 'On the board with you',
            visibilityTime: 2800,
          });
          break;
        }
        case 'peer-left': {
          const peer = msg as PeerLeftMessage;
          if (toastedLeftRef.current.has(peer.userId)) {
            break;
          }
          toastedLeftRef.current.add(peer.userId);
          const name = formatUsername(peer.username) || 'Player';
          notify({
            type: 'info',
            title: `${name} left`,
            message: 'Left board presence',
            visibilityTime: 2800,
          });
          break;
        }
        case 'error': {
          const err = msg as ErrorMessage;
          console.warn('[presence] server error', err.message);
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
      setStatus('connecting');
      toastedLeftRef.current.clear();
      const ws = new WebSocket(
        `${getWsBaseUrl()}/ws/presence/board/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
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
        if (cancelled) {
          return;
        }
        setStatus('connecting');
        const delay = Math.min(8_000, 500 * 2 ** attempt);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      const ws = wsRef.current;
      wsRef.current = null;
      teardownPeer();
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        ws.close();
      }
      setStatus('idle');
      setRoomId(null);
      setDcOpen(false);
    };
  }, [token, id]);

  return { status, roomId, dcOpen };
}
