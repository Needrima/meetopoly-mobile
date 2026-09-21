import { MotiView } from 'moti';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHeroArt } from '@/components/auth/AuthHeroArt';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const HERO_MS = 300;
const FORM_MS = 300;
/** Slight pause after hero finishes before the form enters. */
const FORM_DELAY_MS = HERO_MS + 150;
const SLIDE_X = 48;

export type AuthScreenMeta = {
  title: string;
  subtitle?: string;
  showHeroArt?: boolean;
};

type AuthMetaContextValue = {
  setMeta: (meta: AuthScreenMeta) => void;
};

const AuthMetaContext = createContext<AuthMetaContextValue | null>(null);

/** Screens register title / subtitle / hero art into the shared chrome. */
export function useAuthScreenMeta(meta: AuthScreenMeta) {
  const ctx = useContext(AuthMetaContext);
  if (!ctx) {
    throw new Error('useAuthScreenMeta must be used inside AuthChrome');
  }
  const { setMeta } = ctx;

  useEffect(() => {
    setMeta({
      title: meta.title,
      subtitle: meta.subtitle,
      showHeroArt: meta.showHeroArt ?? true,
    });
  }, [setMeta, meta.title, meta.subtitle, meta.showHeroArt]);
}

type AuthChromeProps = {
  children: ReactNode;
};

/**
 * Shared auth shell: left hero stays mounted across steps; right side hosts
 * the Stack. On first mount: hero slides in from the left, then form from the right.
 */
export function AuthChrome({ children }: AuthChromeProps) {
  const insets = useSafeAreaInsets();
  const [meta, setMetaState] = useState<AuthScreenMeta>({
    title: '',
    showHeroArt: true,
  });

  const setMeta = useCallback((next: AuthScreenMeta) => {
    setMetaState(next);
  }, []);

  const value = useMemo(() => ({ setMeta }), [setMeta]);

  return (
    <AuthMetaContext.Provider value={value}>
      <View style={styles.root}>
        <View
          style={[
            styles.hero,
            {
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
              paddingLeft: Math.max(insets.left, 28),
            },
          ]}
        >
          <View style={styles.heroInner}>
            {/* Slide only brand/copy — keep city Moti loops outside this transform. */}
            <MotiView
              from={{ opacity: 0, translateX: -SLIDE_X }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: HERO_MS }}
            >
              <Text style={styles.brand}>Meetopoly</Text>
              <MotiView
                key={meta.title || 'empty'}
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 200 }}
              >
                {meta.title ? <Text style={styles.title}>{meta.title}</Text> : null}
                {meta.subtitle ? <Text style={styles.subtitle}>{meta.subtitle}</Text> : null}
              </MotiView>
            </MotiView>
            {meta.showHeroArt !== false ? (
              <AuthHeroArt key={meta.title || 'hero-art'} />
            ) : null}
          </View>
        </View>

        <MotiView
          from={{ opacity: 0, translateX: SLIDE_X }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: FORM_MS, delay: FORM_DELAY_MS }}
          style={styles.formHost}
        >
          {children}
        </MotiView>
      </View>
    </AuthMetaContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  hero: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  heroInner: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 16,
  },
  brand: {
    marginBottom: 6,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    color: colors.brand,
  },
  title: {
    marginBottom: 8,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    maxWidth: 280,
  },
  formHost: {
    flex: 1,
    backgroundColor: colors.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
    overflow: 'hidden',
  },
});
