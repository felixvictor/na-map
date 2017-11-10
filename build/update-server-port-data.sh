#!/usr/bin/env bash

cd "/home/natopo/na-topo.git"

. "build/common.sh"

LAST_UPDATE=$(date --reference="${LAST_UPDATE_FILE}" +%Y-%m-%d)

function get-git-update () {
    git pull
}

echo 'change server port data'

if [ "${LAST_UPDATE}" != "${DATE}" ]; then
    yarn --silent
    get-git-update
    change-port-data
    yarn run deploy-update
fi
