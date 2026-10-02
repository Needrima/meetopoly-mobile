# meetopoly-board-cam

iOS-only Expo local module that fixes **iOS → Android** board camera uprightness.

## Why it exists

Meetopoly is landscape-locked. On iOS, `getUserMedia` often produces frames with
`rotation = 0` while pixels are sideways for landscape UI.

- **Local iOS preview** can be fixed with a CSS `transform` on a wrapper `View`.
- **Android remotes** use `SurfaceViewRenderer`. Parent CSS rotate **does not**
  rotate the video (you only stretch the layout hole). Confirmed in playtest.

So we tag **frame rotation metadata** on the iOS publisher. Android’s renderer
respects that metadata and shows the feed upright.

## What it does

1. ObjC processors register with react-native-webrtc’s `ProcessorProvider`:
   - `meetopolyCamRot` — **+90°** front / `user` (**legacy name — do not rename**)
   - `meetopolyCamRotBack` — **+270°** back / `environment` (new binaries only)  
   Registration uses `__attribute__((constructor))` (no Swift bridging header).
2. JS `applyMeetopolyBoardCamEffect(track, facing)`:
   - Front always uses `meetopolyCamRot` (works on **current** installed clients).
   - Back uses `meetopolyCamRotBack` only if native `hasBackCamEffect()` is true.
   - Never calls an unknown effect name (that clears processors → front sideways).
3. Remotes must **not** use CSS `contentRotateDeg` for uprightness.
4. Local CSS rotate is only a fallback if this native module isn’t in the binary.

## Compatibility

| Client binary | Front | Back |
|---------------|-------|------|
| Older (only `meetopolyCamRot`) | Upright | Still upside-down (same as before) |
| New (front + back registered) | Upright | Upright after rebuild |

Ship JS anytime; back fix needs an iOS native rebuild. Front must not regress on old clients.

## Not related

- **Cam-off / AvatarPod** — DataChannel `videoMuted` + SFU `StampPresenceDC`
  (backend). Unrelated to this module.
- **Front-camera left/right** — `BoardSeatGrid` sets `mirror={isLocal}` only
  (local selfie preview mirrored; remotes see true camera). Same as Meet /
  FaceTime / Zoom — intentional, not a rotation bug.

## When someone must touch this folder

| Change | What to check |
|--------|----------------|
| Expo SDK / `ExpoModulesCore` major bump | Rebuild iOS. If Swift APIs break, update `MeetopolyBoardCamModule.swift`. |
| `react-native-webrtc` bump | Podspec pins `JitsiWebRTC '~> 124.0.0'`. Align pin; confirm video-effect APIs. |
| WebRTC videoEffects path moves | Update `HEADER_SEARCH_PATHS` in `ios/MeetopolyBoardCam.podspec`. |
| iOS min version change | Align `s.platforms` in the podspec. |
| Front upright, back upside-down after rebuild | Tune `MEETOPOLY_CAM_ROT_ADD_BACK` in `MeetopolyCamRotProcessor.m` (`270` ↔ `90`). Rebuild. |
| Front sideways after a JS change | Ensure front still calls **`meetopolyCamRot`**, not a renamed effect. |
| Bridging-header / “framework targets” build error | Do **not** add `SWIFT_OBJC_BRIDGING_HEADER`. |

## Rebuild

```bash
cd meetopoly-mobile
rm -rf ios   # optional
eas build --profile development --platform ios
```

Install the new client, then `npx expo start`.
