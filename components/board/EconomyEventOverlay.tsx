import { MotiView } from 'moti';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarPod } from '@/components/board/AvatarPod';
import { DeedCard } from '@/components/board/DeedCard';
import { isLightHex, stripColorFor } from '@/components/board/deedVisual';
import { resolveBoardIcon } from '@/components/board/iconRegistry';
import { MeetCoinAmount } from '@/components/ui/MeetCoinAmount';
import type { EconomyEvent } from '@/lib/economyFeedback';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type EconomyEventOverlayProps = {
  event: EconomyEvent | null;
};

/**
 * Phase 9.3 — center-board economy celebration (buy / rent / tax / salary).
 * Auto-dismiss owned by `useEconomyEventQueue` (`ECONOMY_MODAL_MS`).
 */
export function EconomyEventOverlay({ event }: EconomyEventOverlayProps) {
  if (!event) {
    return null;
  }

  return (
    <View style={styles.host} pointerEvents="none">
      <View style={styles.backdrop} />
      <View style={styles.center}>
        <MotiView
          key={`${event.kind}:${event.toastTitle}:${event.toastMessage}`}
          from={{ opacity: 0, scale: 0.92, translateY: 12 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 220 }}
          style={styles.sheetWrap}
        >
          {event.kind === 'buy' ? <BuyBody event={event} /> : null}
          {event.kind === 'rent' ? <RentBody event={event} /> : null}
          {event.kind === 'tax' ? <TaxBody event={event} /> : null}
          {event.kind === 'salary' ? <SalaryBody event={event} /> : null}
          {event.kind === 'card' ? <CardBody event={event} /> : null}
          {event.kind === 'just_visiting' ? (
            <JustVisitingBody event={event} />
          ) : null}
        </MotiView>
      </View>
    </View>
  );
}

function BuyBody({ event }: { event: Extract<EconomyEvent, { kind: 'buy' }> }) {
  const Icon = resolveBoardIcon(event.location.assets?.icon);
  const strip = stripColorFor(event.location, event.location.kind);
  const onStrip = isLightHex(strip) ? colors.ink : colors.onBrand;
  return (
    <View style={[styles.sheet, { borderColor: strip }]}>
      <View style={[styles.header, { backgroundColor: strip }]}>
        <Text style={[styles.headerText, { color: onStrip }]}>{event.title}</Text>
      </View>
      <View style={styles.buyBody}>
        <DeedCard
          name={event.location.name}
          kind={event.location.kind}
          location={event.location}
          Icon={Icon}
          animate={false}
        />
        <View style={styles.buyFooter}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Price</Text>
            <MeetCoinAmount amount={event.price} size={20} color={colors.money} />
          </View>
          <AvatarPod
            initials={event.buyerInitials}
            accent={event.buyerPinColor}
            radius={20}
          />
        </View>
      </View>
    </View>
  );
}

function RentBody({
  event,
}: {
  event: Extract<EconomyEvent, { kind: 'rent' }>;
}) {
  return (
    <View style={styles.sheet}>
      <View style={[styles.header, styles.brandHeader]}>
        <Text style={[styles.headerText, styles.brandHeaderText]}>PAID RENT</Text>
      </View>
      <Text style={styles.place} numberOfLines={1}>
        {event.place}
      </Text>
      <View style={styles.transferRow}>
        <AvatarParty
          initials={event.fromInitials}
          accent={event.fromPinColor}
          label={event.fromUsername}
        />
        <View style={styles.transferMid}>
          <Text style={styles.arrows}>› › ›</Text>
          <MeetCoinAmount amount={event.amount} size={26} color={colors.money} />
        </View>
        <AvatarParty
          initials={event.toInitials}
          accent={event.toPinColor}
          label={event.toUsername}
        />
      </View>
    </View>
  );
}

function TaxBody({ event }: { event: Extract<EconomyEvent, { kind: 'tax' }> }) {
  return (
    <View style={styles.sheet}>
      <View style={[styles.header, styles.brandHeader]}>
        <Text style={[styles.headerText, styles.brandHeaderText]}>PAID TAX</Text>
      </View>
      <View style={styles.taxBody}>
        <AvatarPod
          initials={event.fromInitials}
          accent={event.fromPinColor}
          radius={22}
        />
        <Text style={styles.taxLine}>
          {event.fromUsername} paid{' '}
          <Text style={styles.taxAmount}>{event.amount}</Text> MeetCoin to the
          bank
        </Text>
        <Text style={styles.placeTight}>{event.place}</Text>
      </View>
    </View>
  );
}

function SalaryBody({
  event,
}: {
  event: Extract<EconomyEvent, { kind: 'salary' }>;
}) {
  return (
    <View style={[styles.sheet, styles.salarySheet]}>
      <Text style={styles.salaryEyebrow}>Passed GO</Text>
      <Text style={styles.salaryTitle}>SALARY</Text>
      <MeetCoinAmount amount={event.amount} size={36} color={colors.onBrand} />
    </View>
  );
}

function CardBody({ event }: { event: Extract<EconomyEvent, { kind: 'card' }> }) {
  const isChance = event.deck === 'chance';
  const headerBg = isChance ? colors.danger : colors.info;
  const deckLabel = isChance ? 'CHANCE' : 'COMMUNITY CHEST';
  const cashDelta = event.cashDelta;
  const cashColor = cashDelta > 0 ? colors.money : colors.danger;
  return (
    <View style={[styles.sheet, { borderColor: headerBg }]}>
      <View style={[styles.header, styles.cardHeader, { backgroundColor: headerBg }]}>
        <Text style={[styles.headerText, styles.cardHeaderText, styles.brandHeaderText]}>
          {deckLabel}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <AvatarPod
          initials={event.drawerInitials}
          accent={event.drawerPinColor}
          radius={14}
        />
        <Text style={styles.cardDrawer} numberOfLines={1}>
          {event.drawerUsername}
        </Text>
        <Text style={styles.cardTitle}>{event.title}</Text>
        {cashDelta !== 0 ? (
          <View style={styles.cardCashRow}>
            <Text style={[styles.cardCashSign, { color: cashColor }]}>
              {cashDelta > 0 ? '+' : '−'}
            </Text>
            <MeetCoinAmount
              amount={Math.abs(cashDelta)}
              size={18}
              color={cashColor}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function JustVisitingBody({
  event,
}: {
  event: Extract<EconomyEvent, { kind: 'just_visiting' }>;
}) {
  return (
    <View style={styles.sheet}>
      <View style={[styles.header, styles.brandHeader]}>
        <Text style={[styles.headerText, styles.brandHeaderText]}>
          JUST VISITING
        </Text>
      </View>
      <View style={styles.cardBody}>
        <AvatarPod
          initials={event.visitorInitials}
          accent={event.visitorPinColor}
          radius={22}
        />
        <Text style={styles.cardDrawer} numberOfLines={1}>
          {event.visitorUsername}
        </Text>
        <Text style={styles.cardTitle}>Passing through Jail</Text>
      </View>
    </View>
  );
}

function AvatarParty({
  initials,
  accent,
  label,
}: {
  initials: string;
  accent: string;
  label: string;
}) {
  return (
    <View style={styles.avatarCol}>
      <AvatarPod initials={initials} accent={accent} radius={18} />
      <Text style={styles.avatarLabel} numberOfLines={1}>
        {label}
      </Text>
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
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheetWrap: {
    width: '90%',
    maxWidth: 420,
  },
  sheet: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.brand,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  headerText: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 1.2,
  },
  brandHeader: {
    backgroundColor: colors.brand,
  },
  brandHeaderText: {
    color: colors.onBrand,
  },
  buyBody: {
    padding: 12,
    gap: 12,
  },
  buyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceBlock: {
    flexShrink: 0,
    gap: 2,
  },
  priceLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  place: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  placeTight: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 8,
  },
  transferMid: {
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  arrows: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.money,
    letterSpacing: 2,
  },
  avatarCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  avatarLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
    textAlign: 'center',
  },
  taxBody: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  taxLine: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.brand,
    textAlign: 'center',
  },
  taxAmount: {
    fontFamily: fonts.displayBold,
    color: colors.ink,
  },
  salarySheet: {
    backgroundColor: colors.brand,
    borderColor: colors.brandMuted,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
  },
  salaryEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  salaryTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    color: colors.onBrand,
    letterSpacing: 2,
  },
  cardBody: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  cardHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cardHeaderText: {
    fontSize: 14,
    letterSpacing: 1,
  },
  cardDrawer: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardCashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  cardCashSign: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 20,
  },
});
