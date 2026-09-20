# Meetopoly theme

Locked visual tokens for mobile v1 (and later web/desktop ports).

| Area | Choice |
|------|--------|
| Orientation | **Landscape** (Guns of Glory–style overworld) |
| Shell | Warm paper (`bg`) |
| Brand | Forest green + gold accent |
| Display font | **Fraunces** Soft (`assets/fonts/Fraunces`) |
| UI/body font | **Figtree** (`assets/fonts/Figtree`) |
| Colors source | `theme/colors.js` → NativeWind via `tailwind.config.js` |
| Fonts source | `theme/fonts.ts` → loaded in `app/_layout.tsx` via `expo-font` |

## Fonts (locked)

| Family | Role | Typical use |
|--------|------|-------------|
| **Fraunces** (72pt Soft) | Display | Brand wordmark, screen titles, city names, big turn/money callouts |
| **Figtree** | UI / body | Buttons, forms, HUD labels, sheets, status, helper text |

Load map + `fontFamily` names: `theme/fonts.ts` (`fonts.displayBold`, `fonts.bodySemiBold`, etc.). Prefer those weight-specific families over `fontWeight` with custom fonts (Android).

OFL licenses ship beside the files under `assets/fonts/*/OFL.txt`.

## App chrome tokens

| Token | Hex | Role |
|-------|-----|------|
| `brand` | `#0B6E4F` | Primary CTA, selected chrome |
| `brand-muted` | `#148F6A` | Pressed / secondary brand |
| `accent` | `#E8A317` | Your turn, rewards, highlights |
| `bg` | `#F3F0E8` | App shell behind GL |
| `surface` | `#FFFFFF` | Sheets, auth cards |
| `border` | `#D6D0C4` | Dividers, inputs |
| `ink` | `#14201B` | Primary text |
| `muted` | `#5C6B63` | Secondary text |
| `money` | `#1B7F4E` | Cash / income |
| `danger` | `#C23B2A` | Rent, errors, lost turn |
| `warn` | `#C47A0A` | Timer low |
| `info` | `#2F6FED` | Links / tips (sparing) |
| `success` | `#2A9D5C` | Confirmations |

Also: `overlay`, `hud`, `on-brand`, `on-accent`.

## Board `colorGroup` (data only)

Classic Monopoly-ish track colors in `colorGroups` — for pins/board chrome, **not** app brand.

## Usage

```tsx
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

<Text style={{ fontFamily: fonts.displayBold, color: colors.brand }}>Meetopoly</Text>
<Text style={{ fontFamily: fonts.body, color: colors.ink }}>Body copy</Text>
```

NativeWind font families (when using `className`): `font-display`, `font-display-bold`, `font-sans`, `font-sans-semibold`, etc.
