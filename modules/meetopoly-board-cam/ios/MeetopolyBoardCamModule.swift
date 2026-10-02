import ExpoModulesCore

/**
 * JS surface for board-cam upright effects.
 * Front keeps legacy `meetopolyCamRot`; back is `meetopolyCamRotBack` (new builds only).
 */
public class MeetopolyBoardCamModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MeetopolyBoardCam")

    /// Front / default — must stay `meetopolyCamRot` for older native clients.
    Function("effectName") { () -> String in
      "meetopolyCamRot"
    }

    /// True only in binaries that register `meetopolyCamRotBack`.
    Function("hasBackCamEffect") { () -> Bool in
      true
    }

    Function("effectNameForFacing") { (facing: String) -> String in
      facing == "environment" ? "meetopolyCamRotBack" : "meetopolyCamRot"
    }
  }
}
