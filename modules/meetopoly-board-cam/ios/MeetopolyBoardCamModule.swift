import ExpoModulesCore

/**
 * JS surface for board-cam upright effect name.
 * Native VideoFrameProcessor registers via ObjC constructor (no bridging header).
 */
public class MeetopolyBoardCamModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MeetopolyBoardCam")

    /// react-native-webrtc `_setVideoEffect` name for board camera upright.
    Function("effectName") { () -> String in
      "meetopolyCamRot"
    }
  }
}
