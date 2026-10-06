# Omoluabi Voice Engine

Ariyọ̀ now has a provider-neutral, local-first voice adapter. The browser UI detects a local voice service on loopback and keeps the integration isolated from the chatbot provider.

## Architecture

`Ariyọ̀ UI -> OmoluabiVoiceEngine -> local voice provider`

The first target provider is Voicebox-compatible local speech infrastructure. The adapter intentionally does not bundle Voicebox, model weights, or a cloud credential into the web deployment. Local inference belongs on the user's machine, while Ariyọ̀ remains deployable on Vercel.

## Privacy rule

Never upload a user's reference voice for cloning without explicit consent. Voice profiles should remain local by default. Do not silently fall back from local voice cloning to a remote cloning provider.

## Current first slice

- Voice-first control in Ariyọ̀ Chat.
- Local service detection on loopback.
- Nigerian English browser dictation fallback when supported.
- Transcript event bridge for the parent Ariyọ̀ application.
- Provider-neutral settings storage so a future desktop companion can expose the local engine without changing the chat UI.

## Next slice

Connect the local provider's exact transcription and TTS endpoints after its installed API version is detected, then add Pidgin/Yoruba language profiles and spoken Ariyọ̀ responses. The adapter must feature-detect endpoints rather than assuming one Voicebox API version.
