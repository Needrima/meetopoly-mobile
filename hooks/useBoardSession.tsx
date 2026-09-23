import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AvatarColorKey } from '@/hooks/useBoardWalk';

export type NormPose = { x: number; y: number };

export type BoardSessionSnapshot = {
  worldId: string;
  /** Pose normalized to 0..1 of board side (size-independent). */
  poseNorm: NormPose;
  /** True after Enter — Leave may restore pose. */
  hasPose: boolean;
  accent: string;
  accentKey: AvatarColorKey;
  initials: string;
};

type BoardSessionValue = {
  snapshot: BoardSessionSnapshot | null;
  saveSnapshot: (next: BoardSessionSnapshot) => void;
  clearSnapshot: () => void;
};

const BoardSessionContext = createContext<BoardSessionValue | null>(null);

/**
 * Survives board ↔ hub navigation so Leave restores walk pose + avatar color.
 */
export function BoardSessionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<BoardSessionSnapshot | null>(null);

  const saveSnapshot = useCallback((next: BoardSessionSnapshot) => {
    setSnapshot(next);
  }, []);

  const clearSnapshot = useCallback(() => {
    setSnapshot(null);
  }, []);

  const value = useMemo(
    () => ({ snapshot, saveSnapshot, clearSnapshot }),
    [snapshot, saveSnapshot, clearSnapshot],
  );

  return (
    <BoardSessionContext.Provider value={value}>
      {children}
    </BoardSessionContext.Provider>
  );
}

export function useBoardSession(): BoardSessionValue {
  const ctx = useContext(BoardSessionContext);
  if (!ctx) {
    throw new Error('useBoardSession must be used inside BoardSessionProvider');
  }
  return ctx;
}
