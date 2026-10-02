require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'MeetopolyBoardCam'
  s.version        = package['version']
  s.summary        = 'iOS WebRTC board-camera rotation for Meetopoly landscape'
  s.description    = 'Registers a react-native-webrtc VideoFrameProcessor that tags capture frames with landscape rotation so Android remotes upright without CSS.'
  s.author         = 'Meetopoly'
  s.homepage       = 'https://github.com/needrima/meetopoly'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'react-native-webrtc'
  s.dependency 'JitsiWebRTC', '~> 124.0.0'

  # No SWIFT_OBJC_BRIDGING_HEADER — unsupported for CocoaPods framework-style targets.
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/Headers/Public/react-native-webrtc" "$(PODS_ROOT)/../../node_modules/react-native-webrtc/ios/RCTWebRTC" "$(PODS_ROOT)/../../node_modules/react-native-webrtc/ios/RCTWebRTC/videoEffects"'
  }

  s.source_files = '**/*.{h,m,mm,swift}'
  s.exclude_files = '**/MeetopolyBoardCam-Bridging-Header.h'
end
