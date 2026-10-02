# meetopoly-board-cam

iOS-only Expo module for Meetopoly board cameras.

Registers a `react-native-webrtc` `VideoFrameProcessor` named `meetopolyCamRot` that adds **+90°** to each captured frame’s `rotation` metadata (ObjC `__attribute__((constructor))` — no Swift bridging header). Android’s `SurfaceViewRenderer` respects that metadata; CSS `transform` on a wrapper does **not**.

## Rebuild required

After pulling this module, rebuild the **iOS** native app (JS reload is not enough):

```bash
cd meetopoly-mobile
rm -rf ios   # optional if local prebuild is messy
eas build --profile development --platform ios
```

## Tuning

If iOS→Android is still sideways the other way, edit `MEETOPOLY_CAM_ROT_ADD` in `ios/MeetopolyCamRotProcessor.m` (`90` ↔ `-90` / `270`).
