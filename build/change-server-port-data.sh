#!/usr/bin/env bash

SERVER_BASE_NAME="cleanopenworldprod"
SOURCE_BASE_URL="http://storage.googleapis.com/nacleanopenworldprodshards/"
DATE=$(date +%Y-%m-%d)

function get-git-update () {
    git pull
}

function push-git-update () {
    git add --ignore-errors "${GIT_DIR}"
    git diff-index --quiet HEAD || git commit -m "change server port data"
    git push
}

function copy-geojson() {
    for SERVER_NAME in "eu1" "eu2" "us2"; do
        cp --update "topojson/${SERVER_NAME}.json" public/
    done
}
function change-port-data () {
    # http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
    for SERVER_NAME in "eu1" "eu2" "us2"; do
        GIT_FILE="${GIT_DIR}/public/${SERVER_NAME}.json"
        API_FILE="$(pwd)/API-${SERVER_NAME}-${DATE}.json"
        get-file "${SERVER_NAME}" "${API_FILE}"
        nodejs build/change-port-data.js "${GIT_FILE}" "${API_FILE}"
        rm "${API_FILE}"
    done
}

function get-file () {
    SERVER_NAME=$1
    OUT_FILE=$2
    URL="${SOURCE_BASE_URL}Ports_${SERVER_BASE_NAME}${SERVER_NAME}.json"
    if [ ! -f "${OUT_FILE}" ]; then
        curl --silent --output "${OUT_FILE}" "${URL}"
        sed -i -e "s/^var Ports = //; s/\;$//" "${OUT_FILE}"
    fi
}

if [ "$1" == "update" ]; then
    GIT_DIR="$HOME/na-topo.git"
    cd "${GIT_DIR}"
    yarn --silent
    get-git-update
else
    GIT_DIR=$(pwd)
    copy-geojson
fi

change-port-data

if [ "$1" == "update" ]; then
    push-git-update
    yarn run deploy
fi

