#!/usr/bin/env bash

. "build/common.sh"

git add --ignore-errors .
if [[ ! -z $(git status -s) ]]; then
    git commit -m "push"
    touch "${LAST_UPDATE_FILE}"
    git push
fi
