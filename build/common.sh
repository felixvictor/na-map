#!/usr/bin/env bash

SERVER_BASE_NAME="cleanopenworldprod"
SOURCE_BASE_URL="http://storage.googleapis.com/nacleanopenworldprodshards/"
DATE=$(date +%Y-%m-%d)
LAST_UPDATE_FILE="build/.last-port-update"

# If file not exists create it with date of last commit
[[ ! -f "${LAST_UPDATE_FILE}" ]] && touch -d "$(git log -1 --format=%cI)" "${LAST_UPDATE_FILE}"

function change-port-data () {
    GIT_DIR="$1"

    # http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
    for SERVER_NAME in "eu1" "eu2" "us2"; do
        GIT_FILE="public/${SERVER_NAME}.json"
        API_FILE="$(pwd)/API-${SERVER_NAME}-${DATE}.json"
        get-file "${SERVER_NAME}" "${API_FILE}"
        nodejs build/change-port-data.js "${GIT_FILE}" "${API_FILE}"
        rm "${API_FILE}"
    done
}

function get-file () {
    SERVER_NAME="$1"
    OUT_FILE="$2"
    URL="${SOURCE_BASE_URL}Ports_${SERVER_BASE_NAME}${SERVER_NAME}.json"
    if [ ! -f "${OUT_FILE}" ]; then
        curl --silent --output "${OUT_FILE}" "${URL}"
        sed -i -e "s/^var Ports = //; s/\;$//" "${OUT_FILE}"
    fi
}
