import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import type { Game, GameTrade, Location } from '@/api/types';
import { AvatarPod } from '@/components/board/AvatarPod';
import { Button } from '@/components/ui/Button';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import { usernameInitials } from '@/hooks/useBoardWalk';
import { formatUsername } from '@/lib/formatUsername';
import { stripWorldNamePrefix } from '@/components/board/deedVisual';
import {
  acceptRedeemCosts,
  canSubmitTrade,
  deedsForUser,
  parseCashDigits,
  tradeHasMortgagedDeeds,
  type TradeDeedRow,
} from '@/lib/tradeUi';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const AVATAR_R = 11;
const SHEET_H = Math.round(Dimensions.get('window').height * 0.9);
/** One accessory per cash field — iOS drops a shared accessory when focus moves. */
const TRADE_GIVE_CASH_ACCESSORY_ID = 'meetopolyTradeGiveCashDone';
const TRADE_TAKE_CASH_ACCESSORY_ID = 'meetopolyTradeTakeCashDone';

function TradeCashDoneAccessory({ nativeID }: { nativeID: string }) {
  if (Platform.OS !== 'ios') {
    return null;
  }
  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.keyboardAccessory}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => Keyboard.dismiss()}
          style={styles.keyboardAccessoryBtn}
          hitSlop={8}
        >
          <Text style={styles.keyboardAccessoryText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

type TradeOverlayProps = {
  visible: boolean;
  /** Hold/peek board under trade chrome. */
  peeking?: boolean;
  game: Game;
  locations: Location[];
  localUserId: string;
  /** Compose mode — proposer building an offer. */
  composing: boolean;
  proposePending?: boolean;
  acceptPending?: boolean;
  declinePending?: boolean;
  onCloseCompose: () => void;
  onPeekBoard: () => void;
  onEndPeek: () => void;
  onPropose: (args: {
    toUserId: string;
    give: { cash: number; boardIndexes: number[]; getOutOfJailFree: number };
    take: { cash: number; boardIndexes: number[]; getOutOfJailFree: number };
  }) => void;
  onAccept: (mortgageAction?: 'redeem_all' | 'leave_all') => void;
  onDecline: () => void;
};

function toggleIndex(list: number[], idx: number): number[] {
  return list.includes(idx) ? list.filter((x) => x !== idx) : [...list, idx];
}

function PeekIconButton({
  disabled,
  onPeekIn,
  onPeekOut,
}: {
  disabled?: boolean;
  onPeekIn: () => void;
  onPeekOut: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Hold to view board"
      accessibilityHint="Hold to peek the board; release to return"
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) {
          onPeekIn();
        }
      }}
      onPressOut={onPeekOut}
      style={[styles.iconBtn, styles.iconBtnOutline, disabled ? styles.iconOff : null]}
    >
      <MaterialCommunityIcons name="eye" size={22} color={colors.brand} />
    </Pressable>
  );
}

function DeedPickRow({
  row,
  selected,
  disabled,
  onToggle,
}: {
  row: TradeDeedRow;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const blocked = row.blocked || disabled;
  const on = selected && !blocked;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: blocked }}
      disabled={blocked}
      onPress={onToggle}
      style={[
        styles.deedRow,
        on ? styles.deedRowOn : null,
        blocked ? styles.deedRowOff : null,
      ]}
    >
      <Text style={[styles.deedName, on ? styles.deedTextOn : null]} numberOfLines={1}>
        {row.name}
      </Text>
      <Text style={[styles.deedSub, on ? styles.deedSubOn : null]} numberOfLines={1}>
        {row.mortgaged ? 'Mortgaged · ' : ''}
        {row.houses > 0
          ? row.houses === 5
            ? 'Hotel'
            : `${row.houses} house${row.houses === 1 ? '' : 's'}`
          : `List ${row.listPrice}`}
      </Text>
    </Pressable>
  );
}

/** Read-only chip matching unselected compose deed rows (pending / waiting). */
function DeedReviewCard({
  name,
  listPrice,
  mortgaged,
}: {
  name: string;
  listPrice: number;
  mortgaged?: boolean;
}) {
  return (
    <View style={styles.deedRow} accessibilityRole="text">
      <Text style={styles.deedName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.deedSub} numberOfLines={1}>
        {mortgaged ? 'Mortgaged · ' : ''}
        List {listPrice}
      </Text>
    </View>
  );
}

function SideSummary({
  title,
  cash,
  deeds,
  goojf,
  locations,
  gameDeeds,
}: {
  title: string;
  cash: number;
  deeds: number[];
  goojf: number;
  locations: Location[];
  gameDeeds: Game['deeds'];
}) {
  const byDeed = useMemo(
    () => new Map((gameDeeds ?? []).map((d) => [d.boardIndex, d])),
    [gameDeeds],
  );
  const rows = useMemo(
    () =>
      deeds.map((bi) => {
        const loc = locations.find((l) => l.boardIndex === bi);
        const deed = byDeed.get(bi);
        return {
          boardIndex: bi,
          name: loc ? stripWorldNamePrefix(loc.name) : `#${bi}`,
          listPrice: typeof loc?.price === 'number' ? loc.price : 0,
          mortgaged: Boolean(deed?.mortgaged),
        };
      }),
    [byDeed, deeds, locations],
  );
  const empty = cash <= 0 && goojf <= 0 && rows.length === 0;
  return (
    <View style={styles.summaryBlock}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <ScrollView
        style={styles.summaryScroll}
        contentContainerStyle={styles.summaryScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {cash > 0 ? (
          <View style={styles.cashReviewChip}>
            <Text style={styles.deedName}>Cash</Text>
            <MeetCoinAmount amount={cash} size={14} />
          </View>
        ) : null}
        {goojf > 0 ? (
          <View style={styles.deedRow}>
            <Text style={styles.deedName}>Get Out of Jail Free</Text>
            <Text style={styles.deedSub}>×{goojf}</Text>
          </View>
        ) : null}
        {empty ? <Text style={styles.summaryMuted}>Nothing</Text> : null}
        {rows.map((row) => (
          <DeedReviewCard
            key={row.boardIndex}
            name={row.name}
            listPrice={row.listPrice}
            mortgaged={row.mortgaged}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Phase 13.3 — board-only trade UI (compose + incoming review).
 * Left = your offer; right = partner ask / carousel.
 */
export function TradeOverlay({
  visible,
  peeking = false,
  game,
  locations,
  localUserId,
  composing,
  proposePending = false,
  acceptPending = false,
  declinePending = false,
  onCloseCompose,
  onPeekBoard,
  onEndPeek,
  onPropose,
  onAccept,
  onDecline,
}: TradeOverlayProps) {
  const trade = game.trade ?? null;
  const partners = useMemo(
    () =>
      game.players.filter(
        (p) => !p.resigned && p.userId !== localUserId,
      ),
    [game.players, localUserId],
  );

  const [partnerIdx, setPartnerIdx] = useState(0);
  const [giveCash, setGiveCash] = useState('');
  const [takeCash, setTakeCash] = useState('');
  const [giveDeeds, setGiveDeeds] = useState<number[]>([]);
  const [takeDeeds, setTakeDeeds] = useState<number[]>([]);
  const [giveGoojf, setGiveGoojf] = useState(0);
  const [takeGoojf, setTakeGoojf] = useState(0);
  const [mortgagePrompt, setMortgagePrompt] = useState(false);
  const [remainSec, setRemainSec] = useState(60);

  const partner = partners[partnerIdx] ?? partners[0] ?? null;

  useEffect(() => {
    if (!composing) {
      return;
    }
    setPartnerIdx(0);
    setGiveCash('');
    setTakeCash('');
    setGiveDeeds([]);
    setTakeDeeds([]);
    setGiveGoojf(0);
    setTakeGoojf(0);
  }, [composing, trade?.fromUserId, trade?.toUserId]);

  useEffect(() => {
    if (!trade?.replyDeadline) {
      setRemainSec(0);
      return;
    }
    const tick = () => {
      const end = Date.parse(trade.replyDeadline);
      if (!Number.isFinite(end)) {
        setRemainSec(0);
        return;
      }
      setRemainSec(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [trade?.replyDeadline]);

  useEffect(() => {
    if (!trade) {
      setMortgagePrompt(false);
    }
  }, [trade]);

  if (!visible) {
    return null;
  }

  const local = game.players.find((p) => p.userId === localUserId);
  const myDeeds = deedsForUser(game, localUserId, locations);
  const partnerDeeds = partner
    ? deedsForUser(game, partner.userId, locations)
    : [];
  const myGoojf = local?.getOutOfJailFree ?? 0;
  const partnerGoojf = partner?.getOutOfJailFree ?? 0;

  const giveCashN = parseCashDigits(giveCash);
  const takeCashN = parseCashDigits(takeCash);
  const offerOk =
    partner &&
    canSubmitTrade(
      {
        cash: giveCashN,
        boardIndexes: giveDeeds,
        getOutOfJailFree: giveGoojf,
      },
      {
        cash: takeCashN,
        boardIndexes: takeDeeds,
        getOutOfJailFree: takeGoojf,
      },
    ) &&
    giveCashN <= (local?.cash ?? 0) &&
    takeCashN <= (partner?.cash ?? 0);

  const isTarget = Boolean(trade && trade.toUserId === localUserId);
  const isProposer = Boolean(trade && trade.fromUserId === localUserId);
  const pendingReview = Boolean(trade);
  const busy = proposePending || acceptPending || declinePending;

  const redeemCosts =
    trade && isTarget
      ? acceptRedeemCosts(trade, game.deeds ?? [], locations)
      : { youPay: 0, partnerPays: 0 };
  const needsMortgageChoice =
    Boolean(trade && isTarget && tradeHasMortgagedDeeds(trade, game.deeds ?? []));

  const cyclePartner = (dir: -1 | 1) => {
    if (partners.length === 0) {
      return;
    }
    setPartnerIdx((i) => (i + dir + partners.length) % partners.length);
    setTakeDeeds([]);
    setTakeCash('');
    setTakeGoojf(0);
  };

  const submitPropose = () => {
    if (!partner || !offerOk) {
      return;
    }
    onPropose({
      toUserId: partner.userId,
      give: {
        cash: giveCashN,
        boardIndexes: giveDeeds,
        getOutOfJailFree: giveGoojf,
      },
      take: {
        cash: takeCashN,
        boardIndexes: takeDeeds,
        getOutOfJailFree: takeGoojf,
      },
    });
  };

  // Hold-to-peek: keep the eye Pressable mounted (opacity 0) so onPressOut
  // still fires — unmounting like auction's dock eye would leave peek stuck.
  return (
    <View style={styles.host} pointerEvents="box-none">
      <TradeCashDoneAccessory nativeID={TRADE_GIVE_CASH_ACCESSORY_ID} />
      <TradeCashDoneAccessory nativeID={TRADE_TAKE_CASH_ACCESSORY_ID} />
      <View
        style={[styles.backdrop, peeking ? styles.chromeHidden : null]}
        pointerEvents={peeking ? 'none' : 'auto'}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.center} pointerEvents="box-none">
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 200 }}
          style={[
            styles.sheet,
            { height: SHEET_H },
            peeking ? styles.sheetPeeking : null,
          ]}
          pointerEvents={peeking ? 'box-none' : 'auto'}
        >
          <View
            style={peeking ? styles.chromeHidden : null}
            pointerEvents={peeking ? 'none' : 'auto'}
          >
            <View style={styles.header}>
              <Text style={styles.headerText}>TRADE</Text>
              {pendingReview ? (
                <Text style={styles.timerLabel}>
                  Reply {Math.floor(remainSec / 60)}:
                  {(remainSec % 60).toString().padStart(2, '0')}
                </Text>
              ) : null}
            </View>
          </View>

          {pendingReview && trade ? (
            <PendingBody
              peeking={peeking}
              trade={trade}
              locations={locations}
              gameDeeds={game.deeds ?? []}
              isTarget={isTarget}
              isProposer={isProposer}
              busy={busy}
              needsMortgageChoice={needsMortgageChoice}
              mortgagePrompt={mortgagePrompt}
              redeemYouPay={redeemCosts.youPay}
              redeemPartnerPays={redeemCosts.partnerPays}
              acceptPending={acceptPending}
              declinePending={declinePending}
              onAskMortgage={() => setMortgagePrompt(true)}
              onAccept={(action) => {
                setMortgagePrompt(false);
                onAccept(action);
              }}
              onDecline={onDecline}
              onCancelMortgage={() => setMortgagePrompt(false)}
              onPeekBoard={onPeekBoard}
              onEndPeek={onEndPeek}
            />
          ) : (
            <ComposeBody
              peeking={peeking}
              localPlayer={local ?? null}
              myDeeds={myDeeds}
              partnerDeeds={partnerDeeds}
              partner={partner}
              partnersCount={partners.length}
              giveCash={giveCash}
              takeCash={takeCash}
              giveDeeds={giveDeeds}
              takeDeeds={takeDeeds}
              giveGoojf={giveGoojf}
              takeGoojf={takeGoojf}
              myGoojf={myGoojf}
              partnerGoojf={partnerGoojf}
              myCash={local?.cash ?? 0}
              partnerCash={partner?.cash ?? 0}
              offerOk={Boolean(offerOk)}
              busy={busy}
              onGiveCash={setGiveCash}
              onTakeCash={setTakeCash}
              onToggleGive={(bi) => setGiveDeeds((xs) => toggleIndex(xs, bi))}
              onToggleTake={(bi) => setTakeDeeds((xs) => toggleIndex(xs, bi))}
              onGiveGoojf={setGiveGoojf}
              onTakeGoojf={setTakeGoojf}
              onPrevPartner={() => cyclePartner(-1)}
              onNextPartner={() => cyclePartner(1)}
              onClose={onCloseCompose}
              onPeekBoard={onPeekBoard}
              onEndPeek={onEndPeek}
              onOffer={submitPropose}
            />
          )}
        </MotiView>
      </View>
    </View>
  );
}

function ComposeBody({
  peeking,
  localPlayer,
  myDeeds,
  partnerDeeds,
  partner,
  partnersCount,
  giveCash,
  takeCash,
  giveDeeds,
  takeDeeds,
  giveGoojf,
  takeGoojf,
  myGoojf,
  partnerGoojf,
  myCash,
  partnerCash,
  offerOk,
  busy,
  onGiveCash,
  onTakeCash,
  onToggleGive,
  onToggleTake,
  onGiveGoojf,
  onTakeGoojf,
  onPrevPartner,
  onNextPartner,
  onClose,
  onPeekBoard,
  onEndPeek,
  onOffer,
}: {
  peeking: boolean;
  localPlayer: Game['players'][number] | null;
  myDeeds: TradeDeedRow[];
  partnerDeeds: TradeDeedRow[];
  partner: Game['players'][number] | null;
  partnersCount: number;
  giveCash: string;
  takeCash: string;
  giveDeeds: number[];
  takeDeeds: number[];
  giveGoojf: number;
  takeGoojf: number;
  myGoojf: number;
  partnerGoojf: number;
  myCash: number;
  partnerCash: number;
  offerOk: boolean;
  busy: boolean;
  onGiveCash: (v: string) => void;
  onTakeCash: (v: string) => void;
  onToggleGive: (bi: number) => void;
  onToggleTake: (bi: number) => void;
  onGiveGoojf: (n: number) => void;
  onTakeGoojf: (n: number) => void;
  onPrevPartner: () => void;
  onNextPartner: () => void;
  onClose: () => void;
  onPeekBoard: () => void;
  onEndPeek: () => void;
  onOffer: () => void;
}) {
  return (
    <View style={styles.body} pointerEvents={peeking ? 'box-none' : 'auto'}>
      <View
        style={[styles.cols, peeking ? styles.chromeHidden : null]}
        pointerEvents={peeking ? 'none' : 'auto'}
      >
        <View style={styles.col}>
          <View style={styles.youHead}>
            <AvatarPod
              initials={usernameInitials(localPlayer?.username)}
              accent={localPlayer?.pinColor || colors.brand}
              radius={AVATAR_R}
            />
            <Text style={styles.partnerName}>You</Text>
          </View>
          <Text style={styles.colTitle}>You offer</Text>
          <Text style={styles.cashCap}>Cash (max {myCash})</Text>
          <TextInput
            value={giveCash}
            onChangeText={(t) => onGiveCash(t.replace(/[^0-9]/g, '').slice(0, 6))}
            multiline={false}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Cash you offer"
            inputAccessoryViewID={
              Platform.OS === 'ios' ? TRADE_GIVE_CASH_ACCESSORY_ID : undefined
            }
            style={styles.cashInput}
          />
          {myGoojf > 0 ? (
            <Pressable
              onPress={() =>
                onGiveGoojf(giveGoojf >= myGoojf ? 0 : giveGoojf + 1)
              }
              style={[styles.goojfChip, giveGoojf > 0 ? styles.goojfOn : null]}
            >
              <Text style={styles.goojfText}>
                GOOJF {giveGoojf > 0 ? `×${giveGoojf}` : `avail ${myGoojf}`}
              </Text>
            </Pressable>
          ) : null}
          <ScrollView
            style={styles.deedList}
            contentContainerStyle={styles.deedListContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {myDeeds.length === 0 ? (
              <Text style={styles.empty}>No deeds</Text>
            ) : (
              myDeeds.map((row) => (
                <DeedPickRow
                  key={row.boardIndex}
                  row={row}
                  selected={giveDeeds.includes(row.boardIndex)}
                  onToggle={() => onToggleGive(row.boardIndex)}
                />
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.col}>
          <View style={styles.partnerHead}>
            <Pressable
              accessibilityLabel="Previous player"
              onPress={onPrevPartner}
              disabled={partnersCount < 2}
              style={[styles.arrowBtn, partnersCount < 2 ? styles.arrowHidden : null]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={20}
                color={colors.ink}
              />
            </Pressable>
            {partner ? (
              <View style={styles.partnerCenter}>
                <AvatarPod
                  initials={usernameInitials(partner.username)}
                  accent={partner.pinColor || colors.brand}
                  radius={AVATAR_R}
                />
                <Text style={styles.partnerName} numberOfLines={1}>
                  {formatUsername(partner.username)}
                </Text>
              </View>
            ) : (
              <Text style={styles.empty}>No partners</Text>
            )}
            <Pressable
              accessibilityLabel="Next player"
              onPress={onNextPartner}
              disabled={partnersCount < 2}
              style={[styles.arrowBtn, partnersCount < 2 ? styles.arrowHidden : null]}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors.ink}
              />
            </Pressable>
          </View>
          <Text style={styles.colTitle}>You ask</Text>
          <Text style={styles.cashCap}>Cash (max {partnerCash})</Text>
          <TextInput
            value={takeCash}
            onChangeText={(t) => onTakeCash(t.replace(/[^0-9]/g, '').slice(0, 6))}
            multiline={false}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Cash you ask"
            inputAccessoryViewID={
              Platform.OS === 'ios' ? TRADE_TAKE_CASH_ACCESSORY_ID : undefined
            }
            style={styles.cashInput}
          />
          {partnerGoojf > 0 ? (
            <Pressable
              onPress={() =>
                onTakeGoojf(takeGoojf >= partnerGoojf ? 0 : takeGoojf + 1)
              }
              style={[styles.goojfChip, takeGoojf > 0 ? styles.goojfOn : null]}
            >
              <Text style={styles.goojfText}>
                GOOJF {takeGoojf > 0 ? `×${takeGoojf}` : `avail ${partnerGoojf}`}
              </Text>
            </Pressable>
          ) : null}
          <ScrollView
            style={styles.deedList}
            contentContainerStyle={styles.deedListContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {partnerDeeds.length === 0 ? (
              <Text style={styles.empty}>No deeds</Text>
            ) : (
              partnerDeeds.map((row) => (
                <DeedPickRow
                  key={row.boardIndex}
                  row={row}
                  selected={takeDeeds.includes(row.boardIndex)}
                  onToggle={() => onToggleTake(row.boardIndex)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>

      <View
        style={[styles.footer, peeking ? styles.footerPeeking : null]}
        pointerEvents="box-none"
      >
        {!peeking ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            disabled={busy}
            onPress={onClose}
            style={[styles.iconBtn, styles.iconBtnDanger, busy ? styles.iconOff : null]}
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.onBrand} />
          </Pressable>
        ) : null}
        <PeekIconButton
          disabled={busy}
          onPeekIn={onPeekBoard}
          onPeekOut={onEndPeek}
        />
        {!peeking ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Offer"
            disabled={!offerOk || busy}
            onPress={onOffer}
            style={[
              styles.iconBtn,
              styles.iconBtnBrand,
              !offerOk || busy ? styles.iconOff : null,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color={colors.onBrand} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PendingBody({
  peeking,
  trade,
  locations,
  gameDeeds,
  isTarget,
  isProposer,
  busy,
  needsMortgageChoice,
  mortgagePrompt,
  redeemYouPay,
  redeemPartnerPays,
  acceptPending,
  declinePending,
  onAskMortgage,
  onAccept,
  onDecline,
  onCancelMortgage,
  onPeekBoard,
  onEndPeek,
}: {
  peeking: boolean;
  trade: GameTrade;
  locations: Location[];
  gameDeeds: NonNullable<Game['deeds']>;
  isTarget: boolean;
  isProposer: boolean;
  busy: boolean;
  needsMortgageChoice: boolean;
  mortgagePrompt: boolean;
  redeemYouPay: number;
  redeemPartnerPays: number;
  acceptPending: boolean;
  declinePending: boolean;
  onAskMortgage: () => void;
  onAccept: (action?: 'redeem_all' | 'leave_all') => void;
  onDecline: () => void;
  onCancelMortgage: () => void;
  onPeekBoard: () => void;
  onEndPeek: () => void;
}) {
  if (mortgagePrompt) {
    const redeemParts: string[] = [];
    if (redeemYouPay > 0) {
      redeemParts.push(`you ${redeemYouPay}`);
    }
    if (redeemPartnerPays > 0) {
      redeemParts.push(`partner ${redeemPartnerPays}`);
    }
    const redeemLabel =
      redeemParts.length > 0
        ? `Redeem all · ${redeemParts.join(' · ')}`
        : 'Redeem all';
    return (
      <View style={styles.mortgageBox}>
        <Text style={styles.mortgageTitle}>Mortgaged deeds in this trade</Text>
        <Text style={styles.mortgageHint}>
          Redeem all now (mortgage + 10%) or leave them mortgaged. Each side
          pays to clear deeds they receive.
        </Text>
        <Button
          label={redeemLabel}
          onPress={() => onAccept('redeem_all')}
          loading={acceptPending}
          disabled={busy}
          style={styles.mortgageBtn}
        />
        <Button
          label="Leave on mortgage"
          variant="outline"
          onPress={() => onAccept('leave_all')}
          disabled={busy}
          style={styles.mortgageBtn}
        />
        <Button
          label="Back"
          variant="outline"
          compact
          onPress={onCancelMortgage}
          disabled={busy}
        />
      </View>
    );
  }

  return (
    <View style={styles.body} pointerEvents={peeking ? 'box-none' : 'auto'}>
      <View
        style={[styles.pendingMain, peeking ? styles.chromeHidden : null]}
        pointerEvents={peeking ? 'none' : 'auto'}
      >
        <Text style={styles.pendingStatus}>
          {isTarget
            ? `${formatUsername(trade.fromUsername)} offered a trade`
            : `Waiting for ${formatUsername(trade.toUsername)}…`}
        </Text>
        <View style={styles.colsPending}>
          <SideSummary
            title={isTarget ? 'They give you' : 'Offer'}
            cash={trade.give.cash ?? 0}
            deeds={trade.give.boardIndexes ?? []}
            goojf={trade.give.getOutOfJailFree ?? 0}
            locations={locations}
            gameDeeds={gameDeeds}
          />
          <SideSummary
            title={isTarget ? 'You give' : 'Ask'}
            cash={trade.take.cash ?? 0}
            deeds={trade.take.boardIndexes ?? []}
            goojf={trade.take.getOutOfJailFree ?? 0}
            locations={locations}
            gameDeeds={gameDeeds}
          />
        </View>
      </View>
      <View
        style={[styles.footer, peeking ? styles.footerPeeking : null]}
        pointerEvents="box-none"
      >
        {!peeking && isTarget ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Accept"
              disabled={busy}
              onPress={() => {
                if (needsMortgageChoice) {
                  onAskMortgage();
                } else {
                  onAccept();
                }
              }}
              style={[styles.iconBtn, styles.iconBtnBrand, busy ? styles.iconOff : null]}
            >
              {acceptPending ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <MaterialCommunityIcons name="check" size={24} color={colors.onBrand} />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decline"
              disabled={busy}
              onPress={onDecline}
              style={[styles.iconBtn, styles.iconBtnDanger, busy ? styles.iconOff : null]}
            >
              {declinePending ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <MaterialCommunityIcons name="close" size={22} color={colors.onBrand} />
              )}
            </Pressable>
          </>
        ) : null}
        {!peeking && !isTarget ? (
          <Text style={styles.waitingHint}>
            {isProposer ? 'Offer sent' : 'Trade in progress'}
          </Text>
        ) : null}
        <PeekIconButton
          disabled={busy}
          onPeekIn={onPeekBoard}
          onPeekOut={onEndPeek}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 46,
    elevation: 46,
  },
  backdrop: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: colors.overlay,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  sheetPeeking: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  chromeHidden: {
    opacity: 0,
  },
  footerPeeking: {
    opacity: 0,
    borderTopWidth: 0,
  },
  header: {
    backgroundColor: colors.brand,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 2,
  },
  headerText: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    letterSpacing: 1.2,
    color: colors.onBrand,
  },
  timerLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.onBrand,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  pendingMain: {
    flex: 1,
    minHeight: 0,
  },
  cols: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 0,
  },
  colsPending: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 4,
    minHeight: 0,
  },
  col: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    gap: 4,
  },
  colTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.brand,
  },
  cashCap: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  cashInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
    textAlign: 'center',
    includeFontPadding: false,
  },
  deedList: {
    flex: 1,
    minHeight: 0,
  },
  deedListContent: {
    paddingBottom: 4,
  },
  deedRow: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  cashReviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  deedRowOn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  deedRowOff: {
    opacity: 0.4,
  },
  deedName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.ink,
  },
  deedSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  deedTextOn: {
    color: colors.onBrand,
  },
  deedSubOn: {
    color: colors.onBrand,
    opacity: 0.85,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  youHead: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  partnerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    minHeight: 44,
  },
  partnerCenter: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  partnerName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.ink,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowHidden: {
    opacity: 0,
  },
  goojfChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.bg,
  },
  goojfOn: {
    borderColor: colors.brand,
    backgroundColor: colors.brandMuted,
  },
  goojfText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.ink,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnBrand: {
    backgroundColor: colors.brand,
  },
  iconBtnDanger: {
    backgroundColor: colors.danger,
  },
  iconBtnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  iconOff: {
    opacity: 0.35,
  },
  pendingStatus: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.ink,
    textAlign: 'center',
    paddingTop: 6,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  waitingHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    flex: 1,
    textAlign: 'center',
  },
  summaryBlock: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 8,
  },
  summaryScroll: {
    flex: 1,
    minHeight: 0,
  },
  summaryScrollContent: {
    gap: 4,
    paddingBottom: 4,
  },
  summaryTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.brand,
    marginBottom: 4,
  },
  summaryMuted: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  keyboardAccessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  keyboardAccessoryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  keyboardAccessoryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.brand,
  },
  mortgageBox: {
    flex: 1,
    padding: 16,
    gap: 10,
    justifyContent: 'center',
  },
  mortgageTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  mortgageHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 4,
  },
  mortgageBtn: {
    height: 44,
  },
});
