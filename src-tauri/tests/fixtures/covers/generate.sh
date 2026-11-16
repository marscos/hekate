#!/usr/bin/env bash
# Regenerates the cover test files used by src/covers (cover-art spec).
# Needs ffmpeg (with libmp3lame) and python3. Run from anywhere:
#   src-tauri/tests/fixtures/covers/generate.sh
#
#   cover.png      300x200 PNG, the picture embedded below
#   folder.jpg     200x300 JPEG, a cover image file next to a track
#   embedded.mp3   0.2 s of silence, ID3v2 front cover = cover.png
#   embedded.flac  0.2 s of silence, FLAC picture block = cover.png
#   corrupt.mp3    embedded.mp3 with the picture's image data overwritten
set -euo pipefail
cd "$(dirname "$0")"
ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

ff -f lavfi -i "color=c=0x3366cc:s=300x200" -frames:v 1 cover.png
ff -f lavfi -i "color=c=0xcc6633:s=200x300" -frames:v 1 -q:v 4 folder.jpg

silence=(-f lavfi -t 0.2 -i "anullsrc=r=22050:cl=mono")
ff "${silence[@]}" -i cover.png -map 0:a -map 1:v -c:a libmp3lame -b:a 32k -c:v copy \
  -id3v2_version 3 -metadata:s:v comment="Cover (front)" -disposition:v attached_pic embedded.mp3
ff "${silence[@]}" -i cover.png -map 0:a -map 1:v -c:a flac -c:v copy \
  -metadata:s:v comment="Cover (front)" -disposition:v attached_pic embedded.flac

# Keep the tag intact but break the PNG's compressed pixel data, so tags parse
# and the image doesn't decode.
python3 - <<'PY'
data = bytearray(open("embedded.mp3", "rb").read())
start = data.index(b"IDAT") + 4
data[start:start + 32] = b"\xff" * 32
open("corrupt.mp3", "wb").write(data)
PY
