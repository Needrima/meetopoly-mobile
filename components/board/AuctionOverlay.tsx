import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MotiView } from 'moti';

import type { GameAuction, Location } from '@/api/types';
import { DeedCard } from '@/components/board/DeedCard';
import {
  isLightHex,
  stripColorFor,
  stripWorldNamePrefix,
} from '@/components/board/deedVisual';
import { resolveBoardIcon } from '@/components/board/iconRegistry';
import { Button } from '@/components/ui/Button';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { formatUsername } from '@/lib/formatUsername';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** Matches server `AuctionBidTurn` (1 minute). */
const AUCTION_TURN_SEC = 60;

type AuctionOverlayProps = {
  visible: boolean;
  /** When true, hide chrome so the board peeks through (hold eye). */
  peeking?: boolean;
  auction: GameAuction;
  location?: Location | null;
  localUserId: string | null;
  localCash: number;
  bidPending?: boolean;
  foldPending?: boolean;
  onBid: (amount: number) => void;
  onFold: () => void;
};

function historyLine(ev: GameAuction['history'][number]): string {
  const name = formatUsername(ev.username) || 'Player';
  if (ev.kind === 'fold' || ev.kind === 'auto_fold') {
    return `${name} gives up.`;
  }
  return `${name} bid ${ev.amount}`;
}

function historyTone(ev: GameAuction['history'][number]): string {
  if (ev.kind === 'fold' || ev.kind === 'auto_fold') {
    return colors.danger;
  }
  return colors.ink;
}

function formatTurnClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/**
 * Phase 13.1 — non-dismissible bank auction for all seated players.
 * Native numeric TextInput + Bid/Fold; controls enabled only on your auction turn.
 */
export function AuctionOverlay({
  visible,
  peeking = false,
  auction,
  location = null,
  localUserId,
  localCash,
  bidPending = false,
  foldPending = false,
  onBid,
  onFold,
}: AuctionOverlayProps) {
  const myTurn = Boolean(
    localUserId && auction.currentBidderUserId === localUserId,
  );
  const minBid = Math.max(1, auction.minBid);
  const [digits, setDigits] = useState(String(minBid));
  const [remainSec, setRemainSec] = useState(AUCTION_TURN_SEC);

  useEffect(() => {
    setDigits(String(minBid));
  }, [minBid, auction.currentBidderUserId, auction.highBid]);

  useEffect(() => {
    const tick = () => {
      const end = Date.parse(auction.bidDeadline);
      if (!Number.isFinite(end)) {
        setRemainSec(0);
        return;
      }
      setRemainSec(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [auction.bidDeadline, auction.currentBidderUserId]);

  if (!visible || peeking) {
    return null;
  }

  const amount = Number.parseInt(digits, 10);
  const amountOk = Number.isFinite(amount) && amount >= minBid;
  const canAfford = amountOk && amount <= localCash;
  const busy = bidPending || foldPending;
  const bidEnabled = myTurn && canAfford && !busy;
  const foldEnabled = myTurn && !busy;
  const inputEnabled = myTurn && !busy;

  const Icon = resolveBoardIcon(location?.assets?.icon);
  const strip = stripColorFor(location, auction.kind);
  const onStrip = isLightHex(strip) ? colors.ink : colors.onBrand;
  const place = stripWorldNamePrefix(auction.name);
  const bidderName =
    formatUsername(auction.currentBidderUsername ?? '') || 'Player';
  const history = [...(auction.history ?? [])].reverse();

  const onChangeAmount = (raw: string) => {
    if (!inputEnabled) {
      return;
    }
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 6);
    setDigits(cleaned.length === 0 ? '' : cleaned);
  };

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View
        style={styles.backdrop}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <MotiView
          key={`${auction.boardIndex}:${auction.startedByUserId}`}
          from={{ opacity: 0, scale: 0.94, translateY: 12 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 220 }}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerText}>AUCTION</Text>
              <View style={styles.timerTrack}>
                <View
                  style={[
                    styles.timerFill,
                    {
                      width: `${Math.min(
                        100,
                        (remainSec / AUCTION_TURN_SEC) * 100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.timerLabel}>{formatTurnClock(remainSec)}</Text>
            </View>

            <View style={styles.main}>
              <View style={styles.deedCol}>
                <DeedCard
                  name={place}
                  kind={auction.kind}
                  location={location}
                  Icon={Icon}
                  compactHeader
                />
              </View>

              <View style={styles.feedCol}>
                <Text style={styles.statusLine}>
                  {myTurn
                    ? 'Your turn to bid…'
                    : `${bidderName} is bidding…`}
                </Text>
                <ScrollView
                  style={styles.feed}
                  contentContainerStyle={styles.feedContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {history.length === 0 ? (
                    <Text style={styles.feedEmpty}>No bids yet</Text>
                  ) : (
                    history.map((ev, i) => (
                      <View
                        key={`${ev.userId}:${ev.kind}:${ev.amount}:${i}`}
                        style={[
                          styles.feedRow,
                          ev.userId === auction.highBidderUserId &&
                          (ev.kind === 'bid' || ev.kind === 'auto_bid')
                            ? styles.feedRowHigh
                            : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.feedText,
                            { color: historyTone(ev) },
                          ]}
                          numberOfLines={2}
                        >
                          {historyLine(ev)}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>

                <View style={styles.highBlock}>
                  <Text style={styles.highLabel}>Highest Bid</Text>
                  <MeetCoinAmount amount={auction.highBid} size={18} />
                </View>

                <View style={styles.amountMeta}>
                  <Text style={styles.minHint}>Min {minBid}</Text>
                  {!canAfford && myTurn && amountOk ? (
                    <Text style={styles.cannot}>Not enough MeetCoin</Text>
                  ) : null}
                </View>

                <TextInput
                  value={digits}
                  onChangeText={onChangeAmount}
                  editable={inputEnabled}
                  multiline={false}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  returnKeyType="done"
                  selectTextOnFocus
                  placeholder={String(minBid)}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="Bid amount"
                  style={[
                    styles.amountInput,
                    !inputEnabled ? styles.amountInputOff : null,
                  ]}
                />

                <View style={styles.actions}>
                  <Button
                    label="Fold"
                    variant="danger"
                    compact
                    onPress={onFold}
                    disabled={!foldEnabled}
                    loading={foldPending}
                    style={styles.actionBtn}
                  />
                  <Button
                    label="Bid"
                    compact
                    onPress={() => {
                      if (bidEnabled && Number.isFinite(amount)) {
                        onBid(amount);
                      }
                    }}
                    disabled={!bidEnabled}
                    loading={bidPending}
                    style={styles.actionBtn}
                  />
                </View>

                <View style={[styles.listPrice, { backgroundColor: strip }]}>
                  <Text style={[styles.listPriceText, { color: onStrip }]}>
                    Listed price
                  </Text>
                  <MeetCoinAmount
                    amount={auction.listPrice}
                    size={14}
                    color={onStrip}
                  />
                </View>
              </View>
            </View>
          </View>
        </MotiView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 45,
    elevation: 45,
  },
  backdrop: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: colors.overlay,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sheetWrap: {
    width: '96%',
    maxWidth: 640,
    maxHeight: '94%',
  },
  sheet: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brand,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.brand,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 1.2,
    color: colors.onBrand,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  timerTrack: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    backgroundColor: colors.onBrand,
  },
  timerLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.onBrand,
  },
  main: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  deedCol: {
    width: '42%',
    flexShrink: 0,
  },
  listPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 2,
  },
  listPriceText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  feedCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  statusLine: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.brand,
  },
  feed: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 88,
    minHeight: 36,
  },
  feedContent: {
    gap: 4,
    paddingBottom: 4,
  },
  feedEmpty: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  feedRow: {
    borderRadius: 6,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  feedRowHigh: {
    backgroundColor: colors.info,
  },
  feedText: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  highBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  highLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.muted,
  },
  amountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  minHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    fontWeight: 500,
  },
  cannot: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.danger,
  },
  amountInput: {
    alignSelf: 'stretch',
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.ink,
    textAlign: 'center',
    includeFontPadding: false,
  },
  amountInputOff: {
    opacity: 0.55,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    height: 40,
  },
});
