#!/usr/bin/env bash

set -e

JQ="$(command -v jq)"
NODE="$(command -v node) --experimental-modules --no-warnings"
TWURL="$(command -v twurl)"
SERVER_BASE_NAME="cleanopenworldprod"
SOURCE_BASE_URL="http://storage.googleapis.com/nacleanopenworldprodshards/"
# http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
SERVER_NAMES=(eu1 eu2)
API_VARS=(ItemTemplates Ports Shops)
DATE=$(date +%Y-%m-%d)
LAST_DATE=$(date +%Y-%m-%d --date "-1 day")

function get_API_data () {
    SERVER_NAME="$1"
    OUT_FILE="$2"
    API_VAR="$3"
    URL="${SOURCE_BASE_URL}${API_VAR}_${SERVER_BASE_NAME}${SERVER_NAME}.json"
    if [ ! -f "${OUT_FILE}" ]; then
        curl --silent --output "${OUT_FILE}" "${URL}"
        sed -i -e "s/^var $API_VAR = //; s/\\;$//" "${OUT_FILE}"
    fi
}

function get_git_update () {
    git pull
}

function update_yarn () {
    yarn --silent
}

function test_for_update () {
    API_BASE_FILE="$1"

    NEW_FILE="${API_BASE_FILE}-${SERVER_NAMES[0]}-Shops-${DATE}.json"
    OLD_FILE="${API_BASE_FILE}-${SERVER_NAMES[0]}-Shops-${LAST_DATE}.json"

    get_API_data "${SERVER_NAMES[0]}" "${NEW_FILE}" Shops

    # If old file not exists create it
    [[ ! -f "${OLD_FILE}" ]] && touch "${OLD_FILE}"

    # Exit if API has not been updated yet
    cmp --silent "${NEW_FILE}" "${OLD_FILE}" && { rm "${NEW_FILE}"; return 1; }
    return 0
}

function get_port_data () {
    API_DIR="${BUILD_DIR}/API"
    API_BASE_FILE="${API_DIR}/api"
    SHIP_FILE="${SRC_DIR}/ships.json"
    EXCEL_FILE="${SRC_DIR}/port-battle.xlsx"

    mkdir -p "${API_DIR}"
    if test_for_update "${API_BASE_FILE}"; then
        for SERVER_NAME in "${SERVER_NAMES[@]}"; do
            PORT_FILE="${SRC_DIR}/${SERVER_NAME}.json"
            TEMP_PORT_FILE="${BUILD_DIR}/ports.geojson"
            for API_VAR in "${API_VARS[@]}"; do
                API_FILE="${API_BASE_FILE}-${SERVER_NAME}-${API_VAR}-${DATE}.json"
                get_API_data "${SERVER_NAME}" "${API_FILE}" "${API_VAR}"
            done

            ${NODE} build/convert-API-data.mjs "${API_BASE_FILE}-${SERVER_NAME}" "${TEMP_PORT_FILE}" "${DATE}"
            yarn geo2topo -o "${PORT_FILE}" "${TEMP_PORT_FILE}"
            rm "${TEMP_PORT_FILE}"
        done

        ${NODE} build/convert-pbZones.mjs "${API_BASE_FILE}-${SERVER_NAMES[0]}" "${BUILD_DIR}" "${DATE}"
        yarn geo2topo -o "${SRC_DIR}/pb.json" \
            "${BUILD_DIR}/pbZones.geojson" "${BUILD_DIR}/towers.geojson" "${BUILD_DIR}/forts.geojson"
        rm "${BUILD_DIR}"/*.geojson

        ${NODE} build/convert-ships.mjs "${API_BASE_FILE}-${SERVER_NAMES[0]}" "${SHIP_FILE}" "${DATE}"

        ${NODE} build/create-xlsx.mjs "${SHIP_FILE}" "${EXCEL_FILE}"
    fi
}

function deploy_data () {
    yarn run deploy-update
}

function update_twitter_data () {
    TWEETS_JSON="${BUILD_DIR}/API/tweets.json"
    PORT_FILE="${SRC_DIR}/eu1.json"
    QUERY="/1.1/search/tweets.json?q=from:zz569k&tweet_mode=extended&count=100&result_type=recent"
    JQ_FORMAT="{ tweets: [ .statuses[] | { id: .id_str, text: .full_text } ], refresh: .search_metadata.max_id_str }"

    if [ -f "${TWEETS_JSON}" ]; then
        SINCE=$(${NODE} -pe 'JSON.parse(process.argv[1]).refresh' "$(cat "${TWEETS_JSON}")")
        #QUERY+="&since_id=${SINCE}"
    fi
    echo "${QUERY}"
    ${TWURL} "${QUERY}" | ${JQ} "${JQ_FORMAT}" > "${TWEETS_JSON}"
    ${NODE} build/update-ports.mjs "${PORT_FILE}" "${TWEETS_JSON}"
}

function change_var () {
    BASE_DIR="$(pwd)"
    export BASE_DIR
    export BUILD_DIR="${BASE_DIR}/build"
    export SRC_DIR="${BASE_DIR}/src"
    export LAST_UPDATE_FILE="${BUILD_DIR}/.last-port-update"
}

function update_var () {
    export BASE_DIR="/home/natopo/na-topo.git"
    export BUILD_DIR="${BASE_DIR}/build"
    export SRC_DIR="${BASE_DIR}/src"
    export LAST_UPDATE_FILE="${BUILD_DIR}/.last-port-update"
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
    cd ${BASE_DIR}
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
        change_var
        change_data
        ;;
    push-change)
        change_var
        push_data
        ;;
    push-update)
        update_var
        push_data
        ;;
    update)
        update_var
        update_data
        ;;
    twitter-update)
        update_var
        update_twitter_data
        ;;
    twitter-change)
        change_var
        update_twitter_data
        ;;
esac
