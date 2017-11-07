#!/usr/bin/env bash

set -e

if [ "$1" == "update" ]; then
    GIT_DIR="/home/natopo/na-topo.git"
else
    GIT_DIR=$(pwd)
fi
cd "${GIT_DIR}"

SERVER_BASE_NAME="cleanopenworldprod"
SOURCE_BASE_URL="http://storage.googleapis.com/nacleanopenworldprodshards/"
DATE=$(date +%Y-%m-%d)
LAST_UPDATE_FILE="${GIT_DIR}/build/.last-port-update"

# If file not exists create it with date of last commit
[[ ! -f "${LAST_UPDATE_FILE}" ]] && touch -d "$(git log -1 --format=%cI)" "${LAST_UPDATE_FILE}"
LAST_UPDATE=$(date --reference="${LAST_UPDATE_FILE}" +%Y-%m-%d)

function get-git-update () {
    git pull
}

function push-git-update-deploy () {
    git add --ignore-errors "${GIT_DIR}"
    if [[ -z $(git status -s) ]]; then
        git commit -m "change server port data"
        touch "${LAST_UPDATE_FILE}"
	    git push
	    yarn run deploy-netlify
    fi
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

if [ "$1" != "update" ]; then
    LAST_UPDATE=""
fi

if [ "${LAST_UPDATE}" != "${DATE}" ]; then
    if [ "$1" == "update" ]; then
        cd "${GIT_DIR}"
        yarn --silent
        get-git-update
    else
        copy-geojson
    fi
    
    change-port-data
    
    if [ "$1" == "update" ]; then
        push-git-update-deploy
    fi
fi
