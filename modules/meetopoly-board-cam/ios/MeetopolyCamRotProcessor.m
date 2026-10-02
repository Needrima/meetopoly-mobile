#import <Foundation/Foundation.h>
#import <WebRTC/RTCVideoCapturer.h>
#import <WebRTC/RTCVideoFrame.h>

#import "ProcessorProvider.h"
#import "VideoFrameProcessor.h"

/**
 * Landscape Meetopoly rotation metadata.
 * Front keeps legacy name `meetopolyCamRot` (+90) so existing iOS clients stay upright.
 * Back uses `meetopolyCamRotBack` (+270); only present after a native rebuild.
 * Tune FRONT / BACK adds independently if a facing is still wrong.
 */
static const NSInteger MEETOPOLY_CAM_ROT_ADD_FRONT = 90;
static const NSInteger MEETOPOLY_CAM_ROT_ADD_BACK = 270;

static RTCVideoFrame *MeetopolyApplyRotationAdd(RTCVideoFrame *frame, NSInteger addDeg) {
  NSInteger rot = (NSInteger)frame.rotation + addDeg;
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

@interface MeetopolyCamRotFrontProcessor : NSObject <VideoFrameProcessorDelegate>
@end

@implementation MeetopolyCamRotFrontProcessor
- (RTCVideoFrame *)capturer:(RTCVideoCapturer *)capturer
    didCaptureVideoFrame:(RTCVideoFrame *)frame {
  return MeetopolyApplyRotationAdd(frame, MEETOPOLY_CAM_ROT_ADD_FRONT);
}
@end

@interface MeetopolyCamRotBackProcessor : NSObject <VideoFrameProcessorDelegate>
@end

@implementation MeetopolyCamRotBackProcessor
- (RTCVideoFrame *)capturer:(RTCVideoCapturer *)capturer
    didCaptureVideoFrame:(RTCVideoFrame *)frame {
  return MeetopolyApplyRotationAdd(frame, MEETOPOLY_CAM_ROT_ADD_BACK);
}
@end

__attribute__((constructor)) static void MeetopolyBoardCamRegisterProcessors(void) {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    // Keep exact legacy name — current App Store / EAS clients depend on it for front.
    [ProcessorProvider addProcessor:[[MeetopolyCamRotFrontProcessor alloc] init]
                            forName:@"meetopolyCamRot"];
    [ProcessorProvider addProcessor:[[MeetopolyCamRotBackProcessor alloc] init]
                            forName:@"meetopolyCamRotBack"];
  });
}
