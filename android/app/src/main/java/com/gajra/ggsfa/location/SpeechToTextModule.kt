package com.gajra.ggsfa.location

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Voice typing for free-text fields. start() resolves with the recognised text once the
 * user stops speaking (or stop() is called); "no speech" resolves with an empty string.
 */
class SpeechToTextModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val mainHandler = Handler(Looper.getMainLooper())
  private var recognizer: SpeechRecognizer? = null
  private var pendingPromise: Promise? = null

  override fun getName(): String = "SpeechToText"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(SpeechRecognizer.isRecognitionAvailable(reactApplicationContext))
  }

  @ReactMethod
  fun start(locale: String, promise: Promise) {
    mainHandler.post {
      if (!SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)) {
        promise.reject("NOT_AVAILABLE", "Speech recognition is not available on this device.")
        return@post
      }

      finish(null)
      pendingPromise = promise

      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, locale)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        // Give field users a little time to pause between sentences.
        putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
        putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
      }

      recognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext).apply {
        setRecognitionListener(listener)
        startListening(intent)
      }
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    mainHandler.post {
      recognizer?.stopListening()
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    mainHandler.post {
      finish("")
      promise.resolve(true)
    }
  }

  override fun invalidate() {
    mainHandler.post { finish("") }
    super.invalidate()
  }

  /** Resolves the pending start() (if any) with [text] and releases the recognizer. */
  private fun finish(text: String?) {
    pendingPromise?.resolve(text ?: "")
    pendingPromise = null
    recognizer?.destroy()
    recognizer = null
  }

  private val listener = object : RecognitionListener {
    override fun onResults(results: Bundle?) {
      val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
      finish(matches?.firstOrNull())
    }

    override fun onError(error: Int) {
      when (error) {
        SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> finish("")
        else -> {
          val promise = pendingPromise
          pendingPromise = null
          finish(null)
          promise?.reject("SPEECH_ERROR_$error", errorMessage(error))
        }
      }
    }

    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onPartialResults(partialResults: Bundle?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}
  }

  private fun errorMessage(error: Int): String =
    when (error) {
      SpeechRecognizer.ERROR_AUDIO -> "Could not record audio."
      SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission is required."
      SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
        "Network error. Please check your internet connection."
      SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Speech recognizer is busy. Please try again."
      else -> "Could not recognise speech. Please try again."
    }
}
