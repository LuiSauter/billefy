#!/usr/bin/env sh
exec "$(dirname "$0")/mobile/gradlew" -p "$(dirname "$0")/mobile" "$@"
