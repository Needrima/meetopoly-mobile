/**
 * Meetopoly typefaces (locked).
 *
 * - Fraunces (Soft) → display: brand, headlines, city names, big callouts
 * - Figtree → UI/body: buttons, forms, HUD, status, sheets
 */
export const fonts = {
  display: 'Fraunces',
  displaySemiBold: 'Fraunces-SemiBold',
  displayBold: 'Fraunces-Bold',
  body: 'Figtree',
  bodyMedium: 'Figtree-Medium',
  bodySemiBold: 'Figtree-SemiBold',
  bodyBold: 'Figtree-Bold',
} as const;

/** Map for `useFonts` — keys become `fontFamily` values. */
export const fontAssets = {
  [fonts.body]: require('../assets/fonts/Figtree/static/Figtree-Regular.ttf'),
  [fonts.bodyMedium]: require('../assets/fonts/Figtree/static/Figtree-Medium.ttf'),
  [fonts.bodySemiBold]: require('../assets/fonts/Figtree/static/Figtree-SemiBold.ttf'),
  [fonts.bodyBold]: require('../assets/fonts/Figtree/static/Figtree-Bold.ttf'),
  [fonts.display]: require('../assets/fonts/Fraunces/static/Fraunces_72pt_Soft-Regular.ttf'),
  [fonts.displaySemiBold]: require('../assets/fonts/Fraunces/static/Fraunces_72pt_Soft-SemiBold.ttf'),
  [fonts.displayBold]: require('../assets/fonts/Fraunces/static/Fraunces_72pt_Soft-Bold.ttf'),
} as const;
