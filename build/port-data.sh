#!/usr/bin/env bash

set -e

SERVER_BASE_NAME="cleanopenworldprod"
SOURCE_BASE_URL="http://storage.googleapis.com/nacleanopenworldprodshards/"
# http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
SERVER_NAMES=(eu1 eu2)
API_VARS=(ItemTemplates Ports Shops)
DATE=$(date +%Y-%m-%d)
LAST_UPDATE_FILE="build/.last-port-update"

function get_API_data () {
    SERVER_NAME="$1"
    OUT_FILE="$2"
    API_VAR="$3"
    URL="${SOURCE_BASE_URL}${API_VAR}_${SERVER_BASE_NAME}${SERVER_NAME}.json"
    if [ ! -f "${OUT_FILE}" ]; then
        curl --silent --output "${OUT_FILE}" "${URL}"
        sed -i -e "s/^var $API_VAR = //; s/\;$//" "${OUT_FILE}"
    fi
}

function get_git_update () {
    git pull
}

function update_yarn () {
    yarn --silent
}

function get_port_data () {
    API_BASE_FILE="$(pwd)/API"

    nodejs build/convert-pbZones.js "${API_BASE_FILE}-${SERVER_NAMES[0]}" "${DATE}"
    $(yarn bin local)/geo2topo -o src/pb.json pbZones.geojson towers.geojson forts.geojson
    rm *.geojson

    for SERVER_NAME in ${SERVER_NAMES[@]}; do
        PORT_FILE="$(pwd)/src/${SERVER_NAME}.json"
        TEMP_PORT_FILE="$(pwd)/ports.geojson"
        for API_VAR in ${API_VARS[@]}; do
            API_FILE="${API_BASE_FILE}-${SERVER_NAME}-${API_VAR}-${DATE}.json"
            get_API_data "${SERVER_NAME}" "${API_FILE}" "${API_VAR}"
        done
        nodejs build/convert-API-data.js "${API_BASE_FILE}-${SERVER_NAME}" "${TEMP_PORT_FILE}" "${DATE}"
        $(yarn bin local)/geo2topo -o "${PORT_FILE}" "${TEMP_PORT_FILE}"
        #rm "${BASE_FILE}*.json" "${TEMP_PORT_FILE}"
    done
}

function deploy_data () {
    yarn run deploy-netlify
}

#####
# Main functions

function change_data () {
    get_port_data
}

function push_data () {
    git add --ignore-errors .
    if [[ ! -z $(git status -s) ]]; then
        git commit -m "push"
        touch "${LAST_UPDATE_FILE}"
    fi
    git push gitlab --all
}

function update_data () {
    cd "/home/natopo/na-topo.git"
    echo "update port data"
    # If file not exists create it with date of last commit
    [[ ! -f "${LAST_UPDATE_FILE}" ]] && touch -d "$(git log -1 --format=%cI)" "${LAST_UPDATE_FILE}"
    LAST_UPDATE=$(date --reference="${LAST_UPDATE_FILE}" +%Y-%m-%d)
    if [ "${LAST_UPDATE}" != "${DATE}" ]; then
        update_yarn
        get_git_update
        get_port_data
        push_data
        deploy_data
    fi
}

case "$1" in
    change)
        change_data
        ;;
    push)
        push_data
        ;;
    update)
        update_data
        ;;
esac

