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

1. ObjC `MeetopolyCamRotProcessor` registers with react-native-webrtc’s
   `ProcessorProvider` as effect name `meetopolyCamRot` (via
   `__attribute__((constructor))` — no Swift bridging header; those break
   CocoaPods framework-style targets on EAS).
2. JS `applyMeetopolyBoardCamEffect(track)` calls
   `track._setVideoEffect('meetopolyCamRot')` after board `getUserMedia` / flip
   (`useBoardPresence`).
3. Remotes must **not** use CSS `contentRotateDeg` for uprightness.
4. Local CSS rotate is only a fallback if this native module isn’t in the binary.

## Not related

- **Cam-off / AvatarPod** — DataChannel `videoMuted` + SFU `StampPresenceDC`
  (backend). Unrelated to this module.
- **Front-camera left/right** — `BoardSeatGrid` sets `mirror={isLocal}` only
  (local selfie preview mirrored; remotes see true camera). Same as Meet /
  FaceTime / Zoom — intentional, not a rotation bug.

## When someone must touch this folder

| Change | What to check |
|--------|----------------|
| Expo SDK / `ExpoModulesCore` major bump | Rebuild iOS. If Swift `Module` / `Function` APIs break, update `MeetopolyBoardCamModule.swift`. |
| `react-native-webrtc` bump | Podspec pins `JitsiWebRTC '~> 124.0.0'`. Align pin; confirm `ProcessorProvider` / `VideoFrameProcessor` / `_setVideoEffect` still exist. |
| WebRTC videoEffects path moves | Update `HEADER_SEARCH_PATHS` in `ios/MeetopolyBoardCam.podspec`. |
| iOS min version change | Align `s.platforms` in the podspec. |
| iOS→Android still sideways (wrong way) | Flip `MEETOPOLY_CAM_ROT_ADD` in `MeetopolyCamRotProcessor.m` (`90` ↔ `-90` / `270`). Rebuild iOS. |
| Effect “does nothing” after pull | New **native** iOS build required (`eas build --profile development --platform ios`). JS reload is not enough. |
| Bridging-header / “framework targets” build error | Do **not** add `SWIFT_OBJC_BRIDGING_HEADER`. Keep ObjC constructor registration. |

Day-to-day app work usually does **not** require editing `modules/`.

## Rebuild

```bash
cd meetopoly-mobile
rm -rf ios   # optional if local prebuild is messy
eas build --profile development --platform ios
```

Install the new client, then `npx expo start`.
