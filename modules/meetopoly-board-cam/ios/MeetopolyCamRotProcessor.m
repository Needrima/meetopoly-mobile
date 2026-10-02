#import <Foundation/Foundation.h>
#import <WebRTC/RTCVideoCapturer.h>
#import <WebRTC/RTCVideoFrame.h>

#import "ProcessorProvider.h"
#import "VideoFrameProcessor.h"

/**
 * Adds +90° to each captured frame's rotation metadata.
 * Landscape-locked Meetopoly: iOS often tags rotation=0 with sideways pixels;
 * Android SurfaceViewRenderer respects metadata (CSS transforms do not).
 * Flip MEETOPOLY_CAM_ROT_ADD if upright is wrong the other way.
 */
static const NSInteger MEETOPOLY_CAM_ROT_ADD = 90;

@interface MeetopolyCamRotProcessor : NSObject <VideoFrameProcessorDelegate>
@end

@implementation MeetopolyCamRotProcessor

- (RTCVideoFrame *)capturer:(RTCVideoCapturer *)capturer
    didCaptureVideoFrame:(RTCVideoFrame *)frame {
  NSInteger rot = (NSInteger)frame.rotation + MEETOPOLY_CAM_ROT_ADD;
  while (rot < 0) {
    rot += 360;
  }
  while (rot >= 360) {
    rot -= 360;
  }
  RTCVideoRotation outRot = RTCVideoRotation_0;
  if (rot == 90) {
    outRot = RTCVideoRotation_90;
  } else if (rot == 180) {
    outRot = RTCVideoRotation_180;
  } else if (rot == 270) {
    outRot = RTCVideoRotation_270;
  }
  return [[RTCVideoFrame alloc] initWithBuffer:frame.buffer
                                      rotation:outRot
                                   timeStampNs:frame.timeStampNs];
}

@end

/** Register at load — no Swift↔ObjC bridging header (unsupported for pod frameworks). */
__attribute__((constructor)) static void MeetopolyBoardCamRegisterProcessor(void) {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    [ProcessorProvider addProcessor:[[MeetopolyCamRotProcessor alloc] init]
                            forName:@"meetopolyCamRot"];
  });
}
