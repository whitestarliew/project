#!/bin/sh
if command -v node >/dev/null 2>&1; then
  node server.js
else
  xdg-open "$(dirname "$0")/index.html" || open "$(dirname "$0")/index.html" || start "$(dirname "$0")/index.html"
fi
