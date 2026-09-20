/**
 * Meetopoly theme tokens (locked).
 * Warm paper shell + forest brand + gold accent.
 * Use via NativeWind classes (bg-brand, text-ink, …) or import here for GL/non-TW.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { colors: rawColors, colorGroups: rawGroups } = require('./colors.js') as {
  colors: {
    brand: string;
    brandMuted: string;
    accent: string;
    bg: string;
    surface: string;
    border: string;
    overlay: string;
    hud: string;
    ink: string;
    muted: string;
    onBrand: string;
    onAccent: string;
    money: string;
    danger: string;
    warn: string;
    info: string;
    success: string;
  };
  colorGroups: {
    brown: string;
    lightBlue: string;
    pink: string;
    orange: string;
    red: string;
    yellow: string;
    green: string;
    darkBlue: string;
  };
};

export const colors = rawColors;
export const colorGroups = rawGroups;

export type ColorToken = keyof typeof colors;
