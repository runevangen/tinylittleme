#!/usr/bin/env bash
# Setter sammen trailer-klipp til mp4 (se tools/trailer/README.md).
# Bruk: tools/trailer/build.sh [-f FRAMES_DIR] [-m MUSIKK.wav] [-e edit.json] [-o ut.mp4] [-w ARBEIDSMAPPE]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
FRAMES="frames"; MUSIC=""; EDIT="$HERE/edit.json"; OUT="trailer.mp4"; WORK=""
while getopts "f:m:e:o:w:" o; do
  case $o in f) FRAMES=$OPTARG;; m) MUSIC=$OPTARG;; e) EDIT=$OPTARG;; o) OUT=$OPTARG;; w) WORK=$OPTARG;; *) exit 2;; esac
done
for t in ffmpeg jq awk; do command -v $t >/dev/null || { echo "mangler $t" >&2; exit 1; }; done
[ -n "$WORK" ] || WORK="$(mktemp -d)"
mkdir -p "$WORK"
J() { jq -r "$1" "$EDIT"; }

W=$(J .out.w); H=$(J .out.h); FPS=$(J .out.fps); INFPS=$(J .out.in_fps); CRF=$(J .out.crf)
FONT=$(J .font); [ -f "$FONT" ] || { echo "skriftfil finnes ikke: $FONT" >&2; exit 1; }
INTERP=$(J '.interp // "minterpolate"')
SAT=$(J .grade.saturation); CON=$(J .grade.contrast); GAM=$(J .grade.gamma); WARM=$(J .grade.warm)
N=$(J '.clips|length')
CUTD=$(awk -v f="$FPS" 'BEGIN{printf "%.4f",1/f}')   # "hard klipp" = ett bildes kryssfade

# overlapp inn i klipp i (0 for første)
ov() {
  local i=$1 t d
  if [ "$i" -eq 0 ]; then echo 0; return; fi
  t=$(J ".clips[$i].into.type // \"cut\""); d=$(J ".clips[$i].into.dur // 0.5")
  if [ "$t" = cut ]; then echo "$CUTD"; else echo "$d"; fi
}

fade_expr() { # start slutt fade -> alpha-uttrykk (fade inn og ut)
  echo "if(lt(t,$1),0,if(lt(t,$1+$3),(t-$1)/$3,if(lt(t,$2-$3),1,if(lt(t,$2),($2-t)/$3,0))))"
}

DURS=()
for ((i=0;i<N;i++)); do
  id=$(J ".clips[$i].id"); type=$(J ".clips[$i].type // \"frames\""); dur=$(J ".clips[$i].dur")
  next=0; if [ $((i+1)) -lt "$N" ]; then next=$(ov $((i+1))); fi
  len=$(awk -v a="$dur" -v b="$next" 'BEGIN{printf "%.4f",a+b+0.05}')
  DURS+=("$dur")
  if [ "$type" = black ]; then
    inputs=(-f lavfi -i "color=c=black:s=${W}x${H}:r=$FPS")
    chain="[0:v]format=yuv420p"
  else
    dir="$FRAMES/$id"; [ -d "$dir" ] || { echo "mangler bildemappe $dir" >&2; exit 1; }
    inputs=(-framerate "$INFPS" -i "$dir/%04d.png")
    ip=$(J ".clips[$i].interp // \"$INTERP\"")
    case $ip in
      minterpolate) up="minterpolate=fps=$FPS:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1";;
      blend)        up="framerate=fps=$FPS:interp_start=0:interp_end=255:scene=100";;
      *)            up="fps=$FPS";;
    esac
    # lanczos, letterbox hvis formatet ikke er 16:9, hold siste bilde om klippet er for kort
    chain="[0:v]$up,scale=${W}:${H}:flags=lanczos:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
    chain="$chain,format=yuv420p,tpad=stop_mode=clone:stop_duration=20"
    # lett fargekorrigering: mettet, varm (litt mer rødt, litt mindre blått)
    chain="$chain,eq=saturation=$SAT:contrast=$CON:gamma=$GAM,colorbalance=rs=$WARM:gs=0.01:bs=-$WARM:rm=$WARM:bm=-$WARM"
  fi
  fg="$chain[base]"; last="base"
  nc=$(J ".clips[$i].cards|length")
  for ((c=0;c<nc;c++)); do
    txt="$WORK/t_${i}_$c.txt"; jq -j ".clips[$i].cards[$c].text" "$EDIT" > "$txt"
    s=$(J ".clips[$i].cards[$c].at"); e=$(J ".clips[$i].cards[$c].to"); f=$(J ".clips[$i].cards[$c].fade // 0.5")
    sz=$(J ".clips[$i].cards[$c].size // 56"); pos=$(J ".clips[$i].cards[$c].pos // \"bottom\"")
    yo=$(J ".clips[$i].cards[$c].y_off // 0")
    if [ "$pos" = center ]; then y="(h-th)/2+($yo)"; else y="h-th-96+($yo)"; fi
    a=$(fade_expr "$s" "$e" "$f")
    common="fontfile=$FONT:textfile=$txt:fontsize=$sz"
    # myk skygge: svart tekst på gjennomsiktig lag, gaussisk uskarphet, legges under hvit tekst
    fg="$fg;color=c=black@0:s=${W}x${H}:r=$FPS,format=yuva420p,drawtext=$common:fontcolor=black@0.85:alpha='$a':x=(w-tw)/2+3:y=$y+4,gblur=sigma=7[sh$c]"
    fg="$fg;[$last][sh$c]overlay=shortest=1:format=auto[s$c]"
    fg="$fg;[s$c]drawtext=$common:x=(w-tw)/2:y=$y:fontcolor=white:alpha='$a':shadowcolor=black@0.55:shadowx=1:shadowy=2[t$c]"
    last="t$c"
  done
  fg="$fg;[$last]null[out]"
  printf '%s\n' "$fg" > "$WORK/fg_$i.txt"
  echo "== klipp $((i+1))/$N: $id (${dur}s + ${next}s overlapp)"
  ffmpeg -nostdin -hide_banner -loglevel error -y "${inputs[@]}" -filter_complex_script "$WORK/fg_$i.txt" -map "[out]" \
    -t "$len" -r "$FPS" -c:v libx264 -preset medium -crf "$CRF" -pix_fmt yuv420p "$WORK/c_$i.mp4"
done

# sett sammen med xfade-kjede; offset = kumulativ synlig lengde
in_args=(); graph=""; cum=0
for ((i=0;i<N;i++)); do in_args+=(-i "$WORK/c_$i.mp4"); done
prev="0:v"
for ((i=1;i<N;i++)); do
  cum=$(awk -v a="$cum" -v b="${DURS[$((i-1))]}" 'BEGIN{printf "%.4f",a+b}')
  d=$(ov $i)
  graph="$graph[$prev][$i:v]xfade=transition=fade:duration=$d:offset=$cum[x$i];"
  prev="x$i"
done
TOTAL=$(printf '%s\n' "${DURS[@]}" | awk '{t+=$1} END{printf "%.3f",t}')
fadeout=$(J .audio.fade_out); fadein=$(J .audio.fade_in); vol=$(J .audio.volume)
afs=$(awk -v t="$TOTAL" -v f="$fadeout" 'BEGIN{printf "%.3f",t-f}')
amap=(); ain=()
if [ -n "$MUSIC" ]; then
  ain=(-i "$MUSIC")
  graph="${graph}[$N:a]atrim=0:$TOTAL,asetpts=PTS-STARTPTS,volume=$vol,afade=t=in:st=0:d=$fadein,afade=t=out:st=$afs:d=$fadeout[aout]"
  amap=(-map "[aout]" -c:a aac -b:a 192k)
else
  graph="${graph%;}"
fi
printf '%s\n' "$graph" > "$WORK/final_graph.txt"
echo "== setter sammen ($TOTAL s)"
ffmpeg -nostdin -hide_banner -loglevel error -y "${in_args[@]}" "${ain[@]}" -filter_complex_script "$WORK/final_graph.txt" \
  -map "[$prev]" "${amap[@]}" -t "$TOTAL" -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p -movflags +faststart "$OUT"
echo "ferdig: $OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
