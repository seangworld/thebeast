import unittest
from voice_state import VoiceState

class VoiceTests(unittest.TestCase):
    def test_ambient_never_submits(self):
        s=VoiceState()
        self.assertEqual(s.feed('remember my password', 10), (None,None))
    def test_wake_then_command(self):
        s=VoiceState()
        self.assertEqual(s.feed('hey atlas', 10), ('wake',None))
        self.assertEqual(s.feed('check my sites', 11), ('command','check my sites'))
        self.assertEqual(s.feed('add task something', 12), (None,None))
    def test_same_sentence(self):
        self.assertEqual(VoiceState().feed('Hey Atlas, check my sites', 10), ('command','check my sites'))
    def test_timeout(self):
        s=VoiceState();s.feed('hey atlas',10)
        self.assertEqual(s.feed('check my sites',23),(None,None))
    def test_busy_and_stop(self):
        s=VoiceState()
        self.assertEqual(s.feed('hey atlas add task trouble',10,busy=True),(None,None))
        self.assertEqual(s.feed('atlas stop',10,final=False,busy=True),('stop',None))
    def test_muted(self):
        s=VoiceState();s.muted=True
        self.assertEqual(s.feed('hey atlas check my sites',10),(None,None))
    def test_partial_does_not_submit(self):
        self.assertEqual(VoiceState().feed('hey atlas check my sites',10,final=False),('wake',None))

if __name__=='__main__':unittest.main()
