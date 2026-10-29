#!/usr/bin/env python3
"""Install official MS-Human-700 assets and generate a verified browser manifest."""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile

REPO = "https://github.com/google-deepmind/mujoco_menagerie.git"
SUBTREE = "ms_human_700"
ENTRIES = [
    "MS-Human-700.xml",
    "MS-Human-700-Locomotion.xml",
    "MS-Human-700-Manipulation.xml",
    "scene.xml",
    "scene_locomotion.xml",
    "scene_manipulation.xml",
]

def install(destination):
    destination = pathlib.Path(destination).resolve()
    if destination.exists() and any(destination.iterdir()):
        raise RuntimeError(f"Refusing to overwrite existing assets at {destination}")
    with tempfile.TemporaryDirectory(prefix="ms-human-700-") as temporary:
        subprocess.run(["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", REPO, temporary], check=True)
        subprocess.run(["git", "sparse-checkout", "set", SUBTREE], cwd=temporary, check=True)
        commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=temporary, text=True).strip()
        source = pathlib.Path(temporary) / SUBTREE
        missing = [name for name in ENTRIES if not (source / name).is_file()]
        if missing:
            raise RuntimeError(f"Missing upstream model entries: {missing}")
        files = sorted(p for p in source.rglob("*") if p.is_file())
        if len(files) < 200:
            raise RuntimeError(f"Incomplete anatomy bundle: only {len(files)} files")
        manifest = {
            "id": "ms-human-700",
            "upstream": REPO,
            "commit": commit,
            "entry": ENTRIES[0],
            "variants": ENTRIES[:3],
            "files": [],
            "sha256": {},
        }
        for file in files:
            name = file.relative_to(source).as_posix()
            manifest["files"].append(name)
            manifest["sha256"][name] = hashlib.sha256(file.read_bytes()).hexdigest()
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, destination)
        (destination / "model-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        for name, expected in manifest["sha256"].items():
            if hashlib.sha256((destination / name).read_bytes()).hexdigest() != expected:
                raise RuntimeError(f"Asset verification failed: {name}")
        print(f"Installed {len(files)} model files from {commit} at {destination}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--destination", default="assets/models/ms-human-700")
    install(parser.parse_args().destination)
