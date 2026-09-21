# Meetopoly mobile

Expo (SDK 57) + Expo Router + NativeWind + TanStack Query. City icons live in `city-icons/`.

## Prerequisites

- Node 20+
- Backend running (`meetopoly-be` on `:8080`) with local Mongo + Redis + SMTP configured
- Expo Go or a simulator

## Run

```bash
cd meetopoly-mobile
npm start
```

Then press `i` (iOS), `a` (Android), or scan the QR code with Expo Go.

### API URL

Set in `.env` (gitignored; copy from `.env.example`):

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080
```

Examples:

| Target | Value |
|--------|--------|
| iOS simulator / web | `http://localhost:8080` |
| Android emulator | `http://10.0.2.2:8080` |
| Physical device | `http://YOUR_LAN_IP:8080` |

Restart Expo after edits: `npx expo start -c`.

### Auth (Phase 2)

- Routes: `app/(auth)/` (email → verify → password → profile, login) and `app/(app)/` (home)
- Session token in **expo-secure-store**; restored on launch via `SessionProvider`
- Hooks: `hooks/useAuth.ts`, `hooks/useSession.tsx`, `hooks/useAuthForms.ts` (Formik + Yup)
- Forms: RN inputs + Moti card; Formik/Yup in hooks; Lottie sun + drifting city SVGs on auth hero

OpenAPI codegen: **orval** (`npm run api:generate`) → `api/generated/`.

## Notes

- No Docker.
- **Landscape** only (`app.json` → `orientation: landscape`).
- Theme: `theme/` — colors + **Fraunces** (display) / **Figtree** (UI).
- Phase 0 health panel remains on the signed-in home screen.
