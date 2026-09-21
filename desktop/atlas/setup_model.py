"""Download the small US English Vosk model from its official publisher."""
from pathlib import Path
import shutil
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"

def main():
    destination = ROOT / "model"
    if destination.exists():
        print("Model already present.")
        return
    with tempfile.TemporaryDirectory() as temporary:
        archive = Path(temporary) / "model.zip"
        print("Downloading the offline English model from alphacephei.com…")
        urllib.request.urlretrieve(URL, archive)
        with zipfile.ZipFile(archive) as z:
            for item in z.infolist():
                target = (Path(temporary) / item.filename).resolve()
                if not target.is_relative_to(Path(temporary).resolve()):
                    raise RuntimeError("Unsafe archive path.")
            z.extractall(temporary)
        shutil.move(str(Path(temporary) / "vosk-model-small-en-us-0.15"), destination)
    print("Local model ready.")

if __name__ == "__main__":
    main()
