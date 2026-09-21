"""Local wake-word state machine; no network or microphone dependencies."""
import re

class VoiceState:
    def __init__(self):
        self.armed_until = 0.0
        self.muted = False

    def feed(self, text, now, final=True, busy=False):
        words = re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()
        if self.muted:
            return None, None
        if re.search(r"\b(?:hey )?atlas stop\b", words):
            self.armed_until = 0
            return "stop", None
        wake = re.search(r"\bhey atlas\b", words)
        if busy:
            return None, None
        if wake:
            self.armed_until = now + 12
            rest = words[wake.end():].strip()
            if final and rest:
                self.armed_until = 0
                return "command", rest
            return "wake", None
        if final and words and now < self.armed_until:
            self.armed_until = 0
            return "command", words
        return None, None
