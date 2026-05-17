import runpod
import subprocess
import os
import sys
import requests
import tempfile
import boto3
import uuid
from pathlib import Path
from datetime import datetime

# ── R2 config (match web app env var names exactly) ───────────────────────────
_account_id = os.environ.get("R2_ACCOUNT_ID", "")
R2_ENDPOINT  = os.environ.get("R2_ENDPOINT") or f"https://{_account_id}.r2.cloudflarestorage.com"
R2_BUCKET    = os.environ.get("R2_BUCKET", "avatarlab")
R2_KEY_ID    = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET    = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_PUBLIC    = os.environ.get("R2_PUBLIC_BASE_URL", "").rstrip("/")

def log(msg: str):
    print(f"[{datetime.utcnow().isoformat()}] {msg}", flush=True)

def upload_to_r2(local_path: str, key: str) -> str:
    log(f"Uploading {local_path} → R2:{key}")
    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_KEY_ID,
        aws_secret_access_key=R2_SECRET,
    )
    s3.upload_file(local_path, R2_BUCKET, key, ExtraArgs={"ContentType": "video/mp4"})
    url = f"{R2_PUBLIC}/{key}"
    log(f"Upload complete → {url}")
    return url

def download_file(url: str, dest: str, label: str):
    log(f"Downloading {label}: {url}")
    r = requests.get(url, timeout=120, stream=True)
    r.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
    size_mb = os.path.getsize(dest) / 1_048_576
    log(f"Downloaded {label}: {size_mb:.1f} MB → {dest}")

def handler(job):
    job_id    = job.get("id", "unknown")
    job_input = job["input"]
    photo_url = job_input.get("photo_url")
    audio_url = job_input.get("audio_url")
    enhance   = job_input.get("enhance", True)

    log(f"Job {job_id} started — enhance={enhance}")

    if not photo_url or not audio_url:
        return {"error": "photo_url and audio_url are required"}

    if not R2_KEY_ID or not R2_SECRET:
        return {"error": "R2 credentials not configured (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)"}

    with tempfile.TemporaryDirectory() as tmpdir:
        # Preserve original extension for photo (SadTalker is picky about image format)
        photo_ext  = Path(photo_url.split("?")[0]).suffix or ".jpg"
        photo_path = os.path.join(tmpdir, f"photo{photo_ext}")
        audio_path = os.path.join(tmpdir, "audio.wav")
        output_dir = os.path.join(tmpdir, "output")
        os.makedirs(output_dir)

        # Download inputs
        try:
            download_file(photo_url, photo_path, "photo")
            download_file(audio_url, audio_path, "audio")
        except Exception as e:
            return {"error": f"Download failed: {e}"}

        # Run SadTalker
        cmd = [
            sys.executable, "inference.py",
            "--driven_audio", audio_path,
            "--source_image", photo_path,
            "--result_dir",   output_dir,
            "--still",
            "--preprocess",   "full",
            "--size",         "256",
        ]
        if enhance:
            cmd += ["--enhancer", "gfpgan"]

        log(f"Running SadTalker: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, cwd="/app/SadTalker")

        if result.stdout:
            log(f"SadTalker stdout:\n{result.stdout[-1000:]}")
        if result.stderr:
            log(f"SadTalker stderr:\n{result.stderr[-1000:]}")

        if result.returncode != 0:
            return {"error": f"SadTalker failed (exit {result.returncode}): {result.stderr[-1500:]}"}

        # Find output video
        videos = list(Path(output_dir).rglob("*.mp4"))
        if not videos:
            return {"error": "SadTalker produced no output video"}

        video_path = str(sorted(videos)[-1])
        size_mb    = os.path.getsize(video_path) / 1_048_576
        log(f"Output video: {video_path} ({size_mb:.1f} MB)")

        # Upload to R2
        key = f"outputs/{uuid.uuid4()}.mp4"
        try:
            video_url = upload_to_r2(video_path, key)
        except Exception as e:
            return {"error": f"R2 upload failed: {e}"}

        log(f"Job {job_id} complete → {video_url}")
        return {"status": "completed", "video_url": video_url}

runpod.serverless.start({"handler": handler})
