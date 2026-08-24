#!/usr/bin/env bash
# Extrae frames de un video fuente a public/frames/<id>/frame_0001.webp...
# Calcula fps de extracción automáticamente según la duración (regla de la
# skill video-to-website: <10s → fps original tope 300 frames; 10-30s →
# 10-15fps; 30s+ → 5-10fps), así que sirve para cualquier video sin editar.
#
# Uso: scripts/extract-frames.sh <video-fuente> <id-de-salida>
# Ej:  scripts/extract-frames.sh assets/source/hero-vuelo.mp4 vuelo
set -euo pipefail

SOURCE="${1:?Uso: extract-frames.sh <video-fuente> <id-de-salida>}"
ID="${2:?Uso: extract-frames.sh <video-fuente> <id-de-salida>}"
OUT_DIR="public/frames/${ID}"
TMP_DIR="$(mktemp -d)"

DURATION="$(ffprobe -v error -select_streams v:0 -show_entries format=duration -of default=nk=1:nw=1 "$SOURCE")"
SRC_FPS="$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=nk=1:nw=1 "$SOURCE")"
SRC_FPS_DEC=$(python3 -c "print(eval('$SRC_FPS'))" 2>/dev/null || echo "$SRC_FPS")

# Regla real: tope de 300 frames totales, no un corte estricto de duración —
# así un video de 10.01s no cae de golpe a fps bajo por unos milisegundos.
TARGET_FRAMES_AT_SRC=$(echo "$DURATION * $SRC_FPS_DEC" | bc -l)

if (( $(echo "$TARGET_FRAMES_AT_SRC <= 300" | bc -l) )); then
  FPS=$(python3 -c "print(min($SRC_FPS_DEC, 30))")
elif (( $(echo "$DURATION < 30" | bc -l) )); then
  FPS=12
else
  FPS=7
fi

echo "Video: ${SOURCE} — duración ${DURATION}s, fps fuente ${SRC_FPS_DEC} → extrayendo a ${FPS}fps"

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/frame_*.webp

ffmpeg -y -i "$SOURCE" -vf "fps=${FPS},scale='min(1920,iw)':-2" "$TMP_DIR/frame_%04d.png"

for png in "$TMP_DIR"/frame_*.png; do
  base="$(basename "$png" .png)"
  cwebp -quiet -q 80 "$png" -o "$OUT_DIR/$base.webp"
done

rm -rf "$TMP_DIR"

COUNT=$(ls "$OUT_DIR" | wc -l | tr -d ' ')
echo "Frames extraídos en ${OUT_DIR}: ${COUNT}"
