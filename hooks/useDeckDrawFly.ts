import { useCallback, useEffect, useRef, useState } from 'react';

import type { GameLastCard } from '@/api/types';
import type { CenterDeckLayout } from '@/components/board/boardLayout';
import type { DeckDrawFlyModel } from '@/components/board/DeckDrawFlyCard';
import { lastCardSignature } from '@/lib/economyFeedback';

type UseDeckDrawFlyArgs = {
  lastCard: GameLastCard | null | undefined;
  decks: CenterDeckLayout[] | null | undefined;
  boardSize: number;
  /**
   * Pin/dice idle — same moment the card modal would have opened.
   * Fly starts here; modal waits until `busy` clears.
   */
  ready: boolean;
  /** False until game snapshot exists — seeds sticky lastCard without flying. */
  gameReady: boolean;
  enabled?: boolean;
  /**
   * Phase 22.2 — only the drawer runs the deck fly.
   * Spectators mark the draw done immediately (no fly, no `busy`).
   */
  isDrawer?: boolean;
};

/**
 * Board Chance/Chest: when a new draw becomes ready, fly a top card off the
 * matching center deck before economy feedback presents the modal.
 *
 * `busy` stays true while a new draw needs a fly OR the Animated card is still
 * mounted — so the modal cannot race ahead of the fly-off.
 * Non-drawers skip the fly (Phase 22.2).
 */
export function useDeckDrawFly({
  lastCard,
  decks,
  boardSize,
  ready,
  gameReady,
  enabled = true,
  isDrawer = true,
}: UseDeckDrawFlyArgs): {
  fly: DeckDrawFlyModel | null;
  busy: boolean;
  onFlyComplete: (key: string) => void;
} {
  const [fly, setFly] = useState<DeckDrawFlyModel | null>(null);
  /** Last draw signature whose fly finished (or was seeded / skipped). */
  const [doneSig, setDoneSig] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const currentSig = lastCard ? lastCardSignature(lastCard) : null;

  // Seed once game is ready — no historical fly on join / first snapshot.
  useEffect(() => {
    if (!gameReady || hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    setDoneSig(currentSig);
  }, [gameReady, currentSig]);

  // Clear / seed while disabled or game gone so remount does not replay.
  useEffect(() => {
    if (enabled && gameReady) {
      return;
    }
    if (currentSig !== undefined) {
      hydratedRef.current = true;
      setDoneSig(currentSig);
    }
    setFly(null);
  }, [enabled, gameReady, currentSig]);

  // Spectators: advance doneSig immediately — no fly, no busy gate.
  useEffect(() => {
    if (!gameReady || !hydratedRef.current || isDrawer) {
      return;
    }
    if (!currentSig || currentSig === doneSig) {
      return;
    }
    setFly(null);
    setDoneSig(currentSig);
  }, [isDrawer, gameReady, currentSig, doneSig]);

  const needsFly = Boolean(
    enabled &&
      isDrawer &&
      gameReady &&
      hydratedRef.current &&
      ready &&
      currentSig &&
      currentSig !== doneSig &&
      decks &&
      decks.length > 0 &&
      boardSize > 0,
  );

  useEffect(() => {
    if (!needsFly || !lastCard || !decks || !currentSig) {
      return;
    }
    if (fly?.key === currentSig) {
      return;
    }
    const deck = decks.find((d) => d.id === lastCard.deck);
    if (!deck) {
      setDoneSig(currentSig);
      return;
    }
    setFly({ key: currentSig, deck, boardSize });
  }, [needsFly, lastCard, decks, boardSize, currentSig, fly?.key]);

  const onFlyComplete = useCallback((key: string) => {
    setFly((prev) => (prev?.key === key ? null : prev));
    setDoneSig(key);
  }, []);

  return {
    fly: isDrawer ? fly : null,
    busy: isDrawer && (needsFly || fly != null),
    onFlyComplete,
  };
}
