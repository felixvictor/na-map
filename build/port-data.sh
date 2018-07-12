#!/usr/bin/env bash

set -e

JQ="$(command -v jq)"
NODE="$(command -v node) --experimental-modules --no-warnings"
TWURL="$(command -v twurl)"
XZ="$(command -v xz)"
MODULE="na-map"
SERVER_BASE_NAME="cleanopenworldprod"
SOURCE_BASE_URL="http://storage.googleapis.com/nacleanopenworldprodshards/"
# http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
SERVER_NAMES=(eu1 eu2)
SERVER_TWITTER_NAMES=(eu1)
API_VARS=(ItemTemplates Ports Shops)
DATE=$(date +%Y-%m-%d)
LAST_DATE=$(date '+%Y-%m-%d' --date "-1 day")

function change_var () {
    BASE_DIR="$(pwd)"
    export BASE_DIR
    export UPDATE_FILE="${BASE_DIR}/src/update.txt"
    common_var
}

function update_var () {
    export BASE_DIR="/home/natopo/na-topo.git"
    export UPDATE_FILE="${BASE_DIR}/public/update.txt"
    common_var
}

function common_var () {
    export BUILD_DIR="${BASE_DIR}/build"
    export SRC_DIR="${BASE_DIR}/src"
    export LAST_UPDATE_FILE="${BUILD_DIR}/.last-port-update"
    export SHIP_FILE="${SRC_DIR}/ships.json"
    export BUILDING_FILE="${SRC_DIR}/buildings.json"
    export RECIPE_FILE="${SRC_DIR}/recipes.json"
    export EXCEL_FILE="${SRC_DIR}/port-battle.xlsx"
    export TWEETS_JSON="${BUILD_DIR}/API/tweets.json"
}

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
    # pull if needed
    # https://stackoverflow.com/questions/3258243/check-if-pull-needed-in-git/25109122
    git remote update &> /dev/null
    LOCAL=$(git rev-parse @)
    BASE=$(git merge-base @ "@{u}")

    if [ "${LOCAL}" == "${BASE}" ]; then
        git pull --quiet
    fi
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

    mkdir -p "${API_DIR}"
    if test_for_update "${API_BASE_FILE}"; then
        for JSON in "${API_DIR}"/*.json; do
            if [ "${JSON}" != "${TWEETS_JSON}" ]; then
                ${XZ} -9ef "${JSON}"
            fi
        done

        for SERVER_NAME in "${SERVER_NAMES[@]}"; do
            PORT_FILE="${SRC_DIR}/${SERVER_NAME}.json"
            PB_FILE="${SRC_DIR}/${SERVER_NAME}-pb.json"
            TEMP_PORT_FILE="${BUILD_DIR}/ports.geojson"
            for API_VAR in "${API_VARS[@]}"; do
                API_FILE="${API_BASE_FILE}-${SERVER_NAME}-${API_VAR}-${DATE}.json"
                get_API_data "${SERVER_NAME}" "${API_FILE}" "${API_VAR}"
            done

            ${NODE} build/convert-API-data.mjs "${API_BASE_FILE}-${SERVER_NAME}" "${TEMP_PORT_FILE}" "${SRC_DIR}" "${DATE}"
            yarn geo2topo -o "${PORT_FILE}" "${TEMP_PORT_FILE}"
            rm "${TEMP_PORT_FILE}"

            ${NODE} build/convert-API-pb-data.mjs "${API_BASE_FILE}-${SERVER_NAME}" "${PB_FILE}" "${DATE}"
        done


        ${NODE} build/convert-pbZones.mjs "${API_BASE_FILE}-${SERVER_NAMES[0]}" "${BUILD_DIR}" "${DATE}"
        yarn geo2topo -o "${SRC_DIR}/pb.json" \
            "${BUILD_DIR}/pbZones.geojson" "${BUILD_DIR}/towers.geojson" "${BUILD_DIR}/forts.geojson"
        rm "${BUILD_DIR}"/*.geojson

        ${NODE} build/convert-ships.mjs "${API_BASE_FILE}-${SERVER_NAMES[0]}" "${SHIP_FILE}" "${DATE}"
        ${NODE} build/convert-modules.mjs "${API_BASE_FILE}-${SERVER_NAMES[0]}" "${SRC_DIR}" "${DATE}"
        ${NODE} build/convert-buildings.mjs "${API_BASE_FILE}-${SERVER_NAMES[0]}" "${BUILDING_FILE}" "${DATE}"
        ${NODE} build/convert-recipes.mjs "${API_BASE_FILE}-${SERVER_NAMES[0]}" "${RECIPE_FILE}" "${DATE}"

        ${NODE} build/create-xlsx.mjs "${SHIP_FILE}" "${SRC_DIR}/${SERVER_NAMES[0]}.json" "${BASE_DIR}/public/${MODULE}.min.css" "${EXCEL_FILE}"
    fi
}

function copy_data () {
    PUBLIC_DIR="${BASE_DIR}/public"

    cp --update "${SRC_DIR}"/*.json "${EXCEL_FILE}" "${PUBLIC_DIR}"/
}

function deploy_data () {
    yarn run deploy-netlify
}

function remove_tweets () {
    rm -f "${TWEETS_JSON}"
}

function get_tweets () {
    QUERY="/1.1/search/tweets.json?q=from:zz569k&tweet_mode=extended&count=100&result_type=recent"
    JQ_FORMAT="{ tweets: [ .statuses[] | { id: .id_str, text: .full_text } ], refresh: .search_metadata.max_id_str }"

    if [ -f "${TWEETS_JSON}" ]; then
        SINCE=$(${NODE} -pe 'JSON.parse(process.argv[1]).refresh' "$(cat "${TWEETS_JSON}")")
        QUERY+="&since_id=${SINCE}"
    fi
    ${TWURL} "${QUERY}" | ${JQ} "${JQ_FORMAT}" > "${TWEETS_JSON}"
}

function update_ports () {
    for SERVER_NAME in "${SERVER_TWITTER_NAMES[@]}"; do
        PB_FILE="${SRC_DIR}/${SERVER_NAME}-pb.json"
        ${NODE} build/update-ports.mjs "${PB_FILE}" "${TWEETS_JSON}"
    done

    return $?
}


###########################################
# Main functions

function log_date () {
    echo -e "\n\n*****************************\n${DATE}\n"
}

function update_tweets () {
    get_git_update
    cd ${BASE_DIR}
    get_tweets
    if update_ports; then
        copy_data
        push_data tweets
        deploy_data
    fi
}

function change_tweets () {
    get_tweets
    update_ports
}

function change_data () {
    get_port_data
    touch_update
}

function touch_update () {
    echo "$(date --utc '+%Y-%m-%d %H.%M')" > "${UPDATE_FILE}"
}

function push_data () {
    TYPE="$1"

    git add --ignore-errors .
    if [[ ! -z $(git status -s) ]]; then
        git commit -m "squash! push"
        if [ "${TYPE}" == "update" ]; then
            touch "${LAST_UPDATE_FILE}"
        fi
    fi
    git push --quiet gitlab --all
}

function update_data () {
    cd ${BASE_DIR}
    # If file not exists create it with date of last commit
    if [[ ! -f "${LAST_UPDATE_FILE}" ]]; then
        touch -d "$(git log -1 --format=%cI)" "${LAST_UPDATE_FILE}"
    fi
    LAST_UPDATE=$(date --reference="${LAST_UPDATE_FILE}" +%Y-%m-%d)
    if [ "${LAST_UPDATE}" != "${DATE}" ]; then
        update_yarn
        get_git_update
        get_port_data

        remove_tweets
        get_tweets
        update_ports

        copy_data
        touch_update
        push_data update
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
        push_data change
        ;;
    push-update)
        update_var
        log_date
        push_data update
        ;;
    update)
        update_var
        log_date
        update_data
        ;;
    twitter-update)
        update_var
        update_tweets
        ;;
    twitter-change)
        change_var
        remove_tweets
        change_tweets
        ;;
esac
