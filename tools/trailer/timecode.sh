#!/bin/bash
# Bruk: timecode.sh inn.mp4 ut.mp4  (brenner inn tidskode tt:mm:ss.mmm øverst til venstre; lyden beholdes)
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
ffmpeg -v error -y -i "$1" -vf "drawtext=fontfile=$FONT:text='%{pts\:hms}':x=24:y=20:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8" -c:v libx264 -crf 20 -preset veryfast -c:a copy -pix_fmt yuv420p -movflags +faststart "$2"
