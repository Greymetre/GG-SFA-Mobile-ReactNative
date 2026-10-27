import AVFoundation
import Foundation
import React
import Speech
import UserNotifications

@objc(FieldKonnectNotifications)
class FieldKonnectNotifications: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(requestAuthorization:rejecter:)
  func requestAuthorization(
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if let error = error {
        reject("notification_permission_failed", error.localizedDescription, error)
        return
      }

      resolve(granted)
    }
  }

  @objc(showNotification:message:resolver:rejecter:)
  func showNotification(
    title: String,
    message: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = message
    content.sound = .default

    let request = UNNotificationRequest(
      identifier: "fieldkonnect-location-\(UUID().uuidString)",
      content: content,
      trigger: nil
    )

    UNUserNotificationCenter.current().add(request) { error in
      if let error = error {
        reject("notification_failed", error.localizedDescription, error)
        return
      }

      resolve(true)
    }
  }
}

@objc(AppInfo)
class AppInfo: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func constantsToExport() -> [AnyHashable: Any] {
    [
      "versionName": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0",
      "versionCode": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0",
    ]
  }
}

/// Voice typing for free-text fields. start() resolves with the recognised text once
/// stop() is called (or recognition ends on its own); "no speech" resolves with "".
@objc(SpeechToText)
class SpeechToText: NSObject {
  private let audioEngine = AVAudioEngine()
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var pendingResolve: RCTPromiseResolveBlock?
  private var transcript = ""
  private var sessionId = 0

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  var methodQueue: DispatchQueue {
    DispatchQueue.main
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(SFSpeechRecognizer()?.isAvailable ?? false)
  }

  @objc(start:resolver:rejecter:)
  func start(
    locale: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    SFSpeechRecognizer.requestAuthorization { status in
      guard status == .authorized else {
        reject("SPEECH_PERMISSION", "Speech recognition permission is required.", nil)
        return
      }

      AVAudioSession.sharedInstance().requestRecordPermission { granted in
        DispatchQueue.main.async {
          guard granted else {
            reject("MIC_PERMISSION", "Microphone permission is required.", nil)
            return
          }

          self.begin(locale: locale, resolve: resolve, reject: reject)
        }
      }
    }
  }

  @objc(stop:rejecter:)
  func stop(
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stopAudio()
    request?.endAudio()
    resolve(true)
  }

  @objc(cancel:rejecter:)
  func cancel(
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    transcript = ""
    finish()
    resolve(true)
  }

  private func begin(
    locale: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    finish()

    // Fall back to the device language / en-US when the requested locale's recognizer is offline.
    let candidates = [SFSpeechRecognizer(locale: Locale(identifier: locale)), SFSpeechRecognizer(), SFSpeechRecognizer(locale: Locale(identifier: "en-US"))]
    guard let recognizer = candidates.compactMap({ $0 }).first(where: { $0.isAvailable }) else {
      reject(
        "NOT_AVAILABLE",
        "Speech recognition is not available. Check your internet connection and that Siri & Dictation is enabled.",
        nil
      )
      return
    }

    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.record, mode: .measurement, options: .duckOthers)
      try session.setActive(true, options: .notifyOthersOnDeactivation)

      let request = SFSpeechAudioBufferRecognitionRequest()
      request.shouldReportPartialResults = true
      self.request = request

      let input = audioEngine.inputNode
      input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in
        request.append(buffer)
      }
      audioEngine.prepare()
      try audioEngine.start()
    } catch {
      finish()
      reject("AUDIO_ERROR", "Could not start recording.", error)
      return
    }

    transcript = ""
    pendingResolve = resolve
    sessionId += 1
    let session = sessionId
    task = recognizer.recognitionTask(with: request!) { [weak self] result, error in
      DispatchQueue.main.async {
        // Ignore late callbacks from a task that was already cancelled.
        guard let self = self, self.sessionId == session else { return }
        if let result = result {
          self.transcript = result.bestTranscription.formattedString
        }
        // Errors after stop() (e.g. "no speech detected") still resolve with whatever was heard.
        if error != nil || result?.isFinal == true {
          self.finish()
        }
      }
    }
  }

  private func stopAudio() {
    if audioEngine.isRunning {
      audioEngine.stop()
    }
    audioEngine.inputNode.removeTap(onBus: 0)
  }

  /// Resolves the pending start() (if any) with the transcript and releases audio resources.
  private func finish() {
    stopAudio()
    task?.cancel()
    task = nil
    request = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

    sessionId += 1
    pendingResolve?(transcript)
    pendingResolve = nil
  }
}
