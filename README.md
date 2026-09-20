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
- OpenAPI codegen into `api/` comes in Phase 1; Phase 0 uses a hand-written client stub.
