#!/usr/bin/env python3
"""ATLAS Mac companion. Ambient speech stays local; only a woken command is sent."""
import argparse
import getpass
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request
import uuid
from voice_state import VoiceState

ORIGIN = "https://thebeast.seangworld.com"
SERVICE, ACCOUNT = "com.seangworld.atlas", "device"

def request(action, token, body=None, binary=False):
    raw = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(ORIGIN + "/api/atlas/" + action, data=raw,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=65) as r:
            data = r.read()
            return data if binary else json.loads(data)
    except urllib.error.HTTPError as exc:
        if exc.code == 403:
            raise RuntimeError("Device key expired or revoked. Pair again in ATLAS Desk setup.") from None
        try:
            message = json.loads(exc.read()).get("error", "ATLAS request failed.")
        except (ValueError, AttributeError):
            message = "ATLAS request failed."
        raise RuntimeError(message) from None

def main():
    parser = argparse.ArgumentParser(description="ATLAS local wake-word companion for macOS")
    parser.add_argument("--pair", action="store_true", help="Store a new device key in macOS Keychain")
    parser.add_argument("--forget-device", action="store_true")
    parser.add_argument("--model", default=str(Path(__file__).parent / "model"))
    args = parser.parse_args()
    import keyring
    if args.forget_device:
        keyring.delete_password(SERVICE, ACCOUNT)
        print("Local key removed. Revoke the device in ATLAS to invalidate it server-side.")
        return
    if args.pair:
        token = getpass.getpass("Paste the ATLAS device key (hidden): ").strip()
        if not re.fullmatch(r"atlas_[a-f0-9]{64}", token):
            raise SystemExit("Invalid device key format.")
        request("state", token)
        keyring.set_password(SERVICE, ACCOUNT, token)
        print("Paired. Device key saved in your system keychain.")
        return
    token = keyring.get_password(SERVICE, ACCOUNT)
    if not token:
        raise SystemExit("Run python atlas.py --pair first.")
    import sounddevice as sd
    from vosk import Model, KaldiRecognizer, SetLogLevel
    if not Path(args.model).is_dir():
        raise SystemExit("Recognition model missing. Run python setup_model.py first.")
    SetLogLevel(-1)
    model = Model(args.model)
    rate = int(sd.query_devices(kind="input")["default_samplerate"])
    recognizer = KaldiRecognizer(model, rate)
    audio_queue = queue.Queue(maxsize=100)
    state = VoiceState()
    lock = threading.Lock()
    busy = threading.Event()
    cancel = threading.Event()
    player = [None]
    reset = threading.Event()

    def stop():
        cancel.set()
        with lock:
            if player[0] and player[0].poll() is None:
                player[0].terminate()
        print("Stopped speaking. A submitted request may still finish; see ATLAS history.")

    def command(text):
        busy.set()
        cancel.clear()
        print("You:", text)
        try:
            turn_id = str(uuid.uuid4())
            request("turn", token, {"id": turn_id, "question": text})
            deadline = time.monotonic() + 180
            while time.monotonic() < deadline and not cancel.is_set():
                saved = request("state", token)
                turn = next((t for t in saved["turns"] if t["id"] == turn_id), None)
                if turn and turn["status"] in ("completed", "failed"):
                    answer = turn.get("answer") or "No answer was saved."
                    print("Atlas:", answer)
                    if cancel.is_set():
                        return
                    audio = request("speech", token, {"text": answer[:4000]}, binary=True)
                    if cancel.is_set():
                        return
                    with tempfile.NamedTemporaryFile(suffix=".mp3") as f:
                        f.write(audio)
                        f.flush()
                        with lock:
                            if cancel.is_set():
                                return
                            player[0] = subprocess.Popen(["/usr/bin/afplay", f.name])
                        player[0].wait()
                    return
                cancel.wait(2)
            if not cancel.is_set():
                print("Still pending. Check the ATLAS workspace; no duplicate was submitted.")
        except Exception as exc:
            print("ATLAS:", str(exc))
        finally:
            reset.set()
            busy.clear()
            print("Ready. Say Hey Atlas.")

    def keyboard():
        while True:
            try:
                line = input().strip().lower()
            except EOFError:
                return
            if line == "m":
                state.muted = not state.muted
                state.armed_until = 0
                stop()
                reset.set()
                print("MUTED — microphone samples are discarded." if state.muted else "Listening locally for Hey Atlas.")
            elif line == "s":
                stop()

    def callback(indata, frames, timing, status):
        if not state.muted:
            try:
                audio_queue.put_nowait(bytes(indata))
            except queue.Full:
                pass

    print("ATLAS · American male AI voice · Local wake-word listening")
    print("Say Hey Atlas, pause, then speak. Say Atlas stop to interrupt speech.")
    print("Type m + Enter to mute/unmute; s + Enter to stop speech; Ctrl+C to quit.")
    print("Ambient audio stays here. Woken command text is sent to your BEAST account and AI provider.")
    threading.Thread(target=keyboard, daemon=True).start()
    try:
        with sd.RawInputStream(samplerate=rate, blocksize=4000, dtype="int16", channels=1, callback=callback):
            while True:
                data = audio_queue.get()
                if reset.is_set():
                    recognizer.Reset()
                    while not audio_queue.empty():
                        audio_queue.get_nowait()
                    reset.clear()
                    continue
                if state.muted:
                    continue
                final = recognizer.AcceptWaveform(data)
                result = json.loads(recognizer.Result() if final else recognizer.PartialResult())
                text = result.get("text" if final else "partial", "")
                event, message = state.feed(text, time.monotonic(), final=bool(final), busy=busy.is_set())
                if event == "stop":
                    stop()
                    recognizer.Reset()
                elif event == "wake" and final:
                    print("Listening…")
                elif event == "command":
                    busy.set()
                    threading.Thread(target=command, args=(message,), daemon=True).start()
    except KeyboardInterrupt:
        stop()
        print("ATLAS closed. Microphone released.")

if __name__ == "__main__":
    main()
