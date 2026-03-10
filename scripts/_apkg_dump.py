"""Dumps all note fields from an .apkg file as JSON lines to stdout."""
import zipfile, sqlite3, tempfile, os, json, sys

path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    with tempfile.TemporaryDirectory() as tmpdir:
        z.extract("collection.anki2", tmpdir)
        db = sqlite3.connect(os.path.join(tmpdir, "collection.anki2"))
        for (flds,) in db.execute("SELECT flds FROM notes"):
            print(json.dumps(flds.split("\x1f")))
