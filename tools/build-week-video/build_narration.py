#!/usr/bin/env python3
"""Generate Japanese narration, an exact timeline, and English SRT captions."""

from __future__ import annotations

import argparse
import json
import subprocess
import wave
from pathlib import Path


def srt_time(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenes", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--voice", default="Kyoko")
    parser.add_argument("--rate", type=int, default=205)
    args = parser.parse_args()

    scenes = json.loads(args.scenes.read_text(encoding="utf-8"))
    args.output.mkdir(parents=True, exist_ok=True)
    clips_dir = args.output / "narration-clips"
    clips_dir.mkdir(exist_ok=True)

    rendered: list[dict] = []
    wav_paths: list[Path] = []
    for index, scene in enumerate(scenes, start=1):
        stem = f"{index:02d}-{scene['id']}"
        aiff_path = clips_dir / f"{stem}.aiff"
        wav_path = clips_dir / f"{stem}.wav"
        subprocess.run(
            ["/usr/bin/say", "-v", args.voice, "-r", str(args.rate), "-o", str(aiff_path), scene["narration"]],
            check=True,
        )
        subprocess.run(
            ["/usr/bin/afconvert", "-f", "WAVE", "-d", "LEI16@44100", str(aiff_path), str(wav_path)],
            check=True,
        )
        wav_paths.append(wav_path)

    narration_path = args.output / "narration.wav"
    current_time = 0.0
    output_params = None
    with wave.open(str(narration_path), "wb") as destination:
        if len(scenes) != len(wav_paths):
            raise RuntimeError("Every scene must have exactly one narration clip")
        for scene, wav_path in zip(scenes, wav_paths):
            with wave.open(str(wav_path), "rb") as source:
                params = source.getparams()
                comparable = (params.nchannels, params.sampwidth, params.framerate, params.comptype)
                if output_params is None:
                    output_params = comparable
                    destination.setnchannels(params.nchannels)
                    destination.setsampwidth(params.sampwidth)
                    destination.setframerate(params.framerate)
                    destination.setcomptype(params.comptype, params.compname)
                elif comparable != output_params:
                    raise RuntimeError(f"Narration format mismatch: {wav_path}")
                frames = source.readframes(params.nframes)
                speech_duration = params.nframes / params.framerate
                destination.writeframes(frames)

                pause = float(scene.get("pauseAfter", 0.25))
                silence_frames = round(params.framerate * pause)
                destination.writeframes(b"\x00" * silence_frames * params.nchannels * params.sampwidth)

                rendered.append(
                    {
                        **scene,
                        "start": round(current_time, 3),
                        "speechDuration": round(speech_duration, 3),
                        "duration": round(speech_duration + pause, 3),
                        "end": round(current_time + speech_duration + pause, 3),
                    }
                )
                current_time += speech_duration + pause

    timeline = {
        "width": 1280,
        "height": 720,
        "duration": round(current_time, 3),
        "voice": args.voice,
        "rate": args.rate,
        "scenes": rendered,
    }
    (args.output / "timeline.json").write_text(
        json.dumps(timeline, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    srt_lines: list[str] = []
    for index, scene in enumerate(rendered, start=1):
        caption_end = scene["start"] + scene["speechDuration"]
        srt_lines.extend(
            [
                str(index),
                f"{srt_time(scene['start'])} --> {srt_time(caption_end)}",
                scene.get("translation", scene["subtitle"]),
                "",
            ]
        )
    (args.output / "ensemble-ai-en.srt").write_text("\n".join(srt_lines), encoding="utf-8")
    (args.output / "narration-ja.txt").write_text(
        "\n\n".join(scene["narration"] for scene in scenes) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"duration": round(current_time, 3), "scenes": len(rendered)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
