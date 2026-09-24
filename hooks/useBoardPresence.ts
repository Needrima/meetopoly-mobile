import { useCallback, useEffect, useRef, useState } from 'react';

import { getWsBaseUrl } from '@/api/client';
import { useSession } from '@/hooks/useSession';
import { formatUsername } from '@/lib/formatUsername';
import { notify } from '@/lib/notify';
import {
  encodePresencePose,
  parsePresencePose,
  type PresencePose,
  type PresencePoseInput,
} from '@/lib/presencePose';

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

/** Minimal WebRTC surface (avoids hard Expo Go import crash). */
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

function messageDataToString(data: string | ArrayBuffer): string {
  if (typeof data === 'string') {
    return data;
  }
  try {
    return new TextDecoder().decode(data);
  } catch {
    return '';
  }
}

/**
 * Phase 7.0–7.4 — board presence + pose DC; PC/DC recover while signaling WS stays up.
 * Dual presence: pins stay on game WS; this hook never drives boardIndex.
 */
export function useBoardPresence(gameId: string | null | undefined): {
  status: BoardPresenceStatus;
  roomId: string | null;
  dcOpen: boolean;
  remotes: Record<string, PresencePose>;
  sendPose: (pose: PresencePoseInput) => void;
  /** Tear down presence WS + WebRTC immediately (leave board / resign). */
  disconnect: () => void;
} {
  const { token } = useSession();
  const id = gameId?.trim() ?? '';
  const [status, setStatus] = useState<BoardPresenceStatus>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [dcOpen, setDcOpen] = useState(false);
  const [remotes, setRemotes] = useState<Record<string, PresencePose>>({});

  const pcRef = useRef<PeerConnectionLike | null>(null);
  const dcRef = useRef<DataChannelLike | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingIceRef = useRef<IceCandidateInit[]>([]);
  const remoteSetRef = useRef(false);
  const toastedLeftRef = useRef<Set<string>>(new Set());
  const identityRef = useRef<{ userId: string; username: string } | null>(null);
  const iceServersRef = useRef<WelcomeMessage['iceServers']>(undefined);
  const disconnectRef = useRef<() => void>(() => {});

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

  const sendPose = useCallback((pose: PresencePoseInput) => {
    const dc = dcRef.current;
    const identity = identityRef.current;
    if (!dc || !identity) {
      return;
    }
    if (dc.readyState && dc.readyState !== 'open') {
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
      console.warn('[presence] sendPose failed', err);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectRef.current();
  }, []);

  useEffect(() => {
    if (!token || !id) {
      setStatus('idle');
      setRoomId(null);
      setDcOpen(false);
      setRemotes({});
      identityRef.current = null;
      disconnectRef.current = () => {};
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let recoverTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let recoverAttempt = 0;
    let renegotiating = false;
    const webrtc = loadWebRTC();

    const teardownPeer = () => {
      remoteSetRef.current = false;
      pendingIceRef.current = [];
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
      if (cancelled || renegotiating || recoverTimer) {
        return;
      }
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const delay = Math.min(4_000, 400 * 2 ** recoverAttempt);
      recoverAttempt += 1;
      console.warn('[presence] schedule WebRTC recover', reason, delay);
      recoverTimer = setTimeout(() => {
        recoverTimer = undefined;
        if (cancelled) {
          return;
        }
        const openWs = wsRef.current;
        if (!openWs || openWs.readyState !== WebSocket.OPEN) {
          return;
        }
        void startWebRTC(openWs, iceServersRef.current).catch((err) => {
          console.warn('[presence] recover failed', err);
        });
      }, delay);
    };

    const bindDataChannel = (dc: DataChannelLike) => {
      dcRef.current = dc;
      dc.onopen = () => {
        if (!cancelled) {
          recoverAttempt = 0;
          setDcOpen(true);
          setStatus('connected');
        }
      };
      dc.onclose = () => {
        if (dcRef.current === dc) {
          dcRef.current = null;
        }
        if (!cancelled) {
          setDcOpen(false);
        }
        if (!cancelled && !renegotiating) {
          scheduleRecover('dc-close');
        }
      };
      dc.onmessage = (ev) => {
        const text = messageDataToString(ev.data);
        const pose = parsePresencePose(text);
        if (!pose || cancelled) {
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
      iceServers: WelcomeMessage['iceServers'],
    ) => {
      if (!webrtc) {
        setStatus('connected');
        return;
      }
      renegotiating = true;
      try {
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
          if (cancelled || pcRef.current !== pc) {
            return;
          }
          if (pc.connectionState === 'connected') {
            setStatus('connected');
          } else if (
            pc.connectionState === 'failed' ||
            pc.connectionState === 'closed'
          ) {
            setDcOpen(false);
            if (!renegotiating) {
              scheduleRecover(`pc-${pc.connectionState}`);
            }
          }
        };

        const dc = pc.createDataChannel(PRESENCE_DC_LABEL, { ordered: true });
        bindDataChannel(dc);

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
      } finally {
        renegotiating = false;
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
        case 'welcome': {
          const welcome = msg as WelcomeMessage;
          identityRef.current = {
            userId: welcome.userId,
            username: welcome.username,
          };
          iceServersRef.current = welcome.iceServers;
          setRoomId(welcome.roomId);
          setStatus('connecting');
          try {
            await startWebRTC(ws, welcome.iceServers);
          } catch (err) {
            console.warn('[presence] WebRTC start failed', err);
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
            title: `${name} joined`,
            message: 'On the board with you',
            visibilityTime: 2800,
          });
          break;
        }
        case 'peer-left': {
          const peer = msg as PeerLeftMessage;
          clearRemote(peer.userId);
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

    const hardDisconnect = () => {
      cancelled = true;
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
      identityRef.current = null;
      iceServersRef.current = undefined;
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
      setRemotes({});
    };

    disconnectRef.current = hardDisconnect;
    connect();

    return () => {
      hardDisconnect();
      disconnectRef.current = () => {};
    };
  }, [token, id, applyRemotePose, clearRemote]);

  return { status, roomId, dcOpen, remotes, sendPose, disconnect };
}
