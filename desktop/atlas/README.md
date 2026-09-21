# ATLAS — Mac desk companion

ATLAS means Assistant for Tasks, Learning, Action, and Strategy.

This companion listens locally for **Hey Atlas**, sends only the recognized command text to your private BEAST workspace, and plays an American male AI voice (OpenAI Onyx). Ambient audio is not uploaded or saved. It is a local speech recognizer, not a biometric voice lock; people nearby can use supported commands. Speaker echo may cause false recognition. Use a headset for the first test.

## Setup on your Mac

Requires Python 3.11 or newer, a microphone, speakers, and an internet connection. The Mac must be awake. This is a Python companion, not a signed App Store app, and it does not install an automatic startup service.

Open Terminal in this extracted folder, then run:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python setup_model.py
python atlas.py --pair
```

For pairing, open https://thebeast.seangworld.com/dashboard/operations/atlas → Desk setup. Create a device key and paste it at the hidden prompt. The key is kept in the macOS Keychain, not the source files. It expires after 90 days and can be revoked in ATLAS. Do not paste an OpenAI API key here.

Start:

```sh
source .venv/bin/activate
python atlas.py
```

Allow Terminal/Python to use your microphone when macOS asks. Say **Hey Atlas**, pause for “Listening…”, then ask a question. You can also say the wake phrase and command in one sentence.

- “Hey Atlas, check my sites.”
- “Hey Atlas, remember that Army is the first game theme after VIP STATUS.”
- “Hey Atlas, add task: review the Instagram connection.”
- “Hey Atlas, give me my rundown.”
- “Atlas stop” interrupts speech/waiting; it does not cancel an already submitted action.
- Type `m` then Enter to mute/unmute. Muted samples are discarded; Ctrl+C closes the microphone completely.
- Type `s` then Enter to stop speech. Ctrl+C quits.

Saved tasks are checklist items, not reminders. ATLAS can answer using its own saved records and dated monitoring summaries, save explicit notes/tasks, and check three owned homepages. It cannot publish, spend, run shell commands, change code, or deploy. It does not inherit your ChatGPT history or connectors. Responses and commands are saved in your owner-only ATLAS workspace. Audio answers are synthesized by OpenAI; usage is billed through the existing BEAST API account. Each category (turns, speech, transcription) is capped at 100 calls per UTC day. This is a request cap, not a dollar cap.

If recognition is poor, pause after the wake phrase, reduce background noise, and check the default macOS microphone. Local speech recognition can mishear names. Review saved actions in the web workspace. Desktop speech commands submit immediately; the web microphone offers a transcript review before sending.

If a request times out, check ATLAS history before repeating a save. The server records durable requests and does not automatically replay an uncertain action.

## Validation boundary

The local wake-word state machine is tested automatically. Actual microphone permissions, recognition accuracy, speaker interruption, and the chosen voice must be accepted on your Mac. This build was prepared in Linux and cannot verify macOS hardware behavior remotely.

## Components

- Vosk: https://alphacephei.com/vosk/ (offline speech recognition)
- English model: https://alphacephei.com/vosk/models (small US English 0.15)
- sounddevice: https://python-sounddevice.readthedocs.io/
- OpenAI speech: https://developers.openai.com/api/docs/guides/text-to-speech
