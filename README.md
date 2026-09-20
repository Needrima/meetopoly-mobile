# Meetopoly mobile

Expo (SDK 57) + Expo Router + NativeWind + TanStack Query. City icons live in `city-icons/`.

## Prerequisites

- Node 20+
- Backend running (`meetopoly-be` on `:8080`) with local Mongo + Redis
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

The home screen reads this via `api/client.ts` → `getApiBaseUrl()`.

Phase 0 home screen calls `GET /health` via TanStack Query (`hooks/useHealth`).

## Notes

- No Docker.
- **Landscape** only (`app.json` → `orientation: landscape`).
- Theme: `theme/` (see `theme/README.md`) — colors + **Fraunces** (display) / **Figtree** (UI).
- OpenAPI codegen: **orval** (`npm run api:generate`) → `api/generated/` (see `api/README.md`).
- Phase 0 health screen uses StyleSheet + theme tokens; NativeWind remains configured for later chrome.
