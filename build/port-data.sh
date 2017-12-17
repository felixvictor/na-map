#!/usr/bin/env bash

SERVER_BASE_NAME="cleanopenworldprod"
SOURCE_BASE_URL="http://storage.googleapis.com/nacleanopenworldprodshards/"
# http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
SERVER_NAMES=(eu1 eu2 us2)
DATE=$(date +%Y-%m-%d)
LAST_UPDATE_FILE="build/.last-port-update"

function get_port_data () {
    SERVER_NAME="$1"
    OUT_FILE="$2"
    URL="${SOURCE_BASE_URL}Ports_${SERVER_BASE_NAME}${SERVER_NAME}.json"
    if [ ! -f "${OUT_FILE}" ]; then
        curl --silent --output "${OUT_FILE}" "${URL}"
        sed -i -e "s/^var Ports = //; s/\;$//" "${OUT_FILE}"
    fi
}

function get_git_update () {
    git pull
}

function update_yarn () {
    yarn --silent
}

function change_port_data () {
    GIT_DIR="$1"

    for SERVER_NAME in ${SERVER_NAMES[@]}; do
        GIT_FILE="$(pwd)/public/${SERVER_NAME}.json"
        API_FILE="$(pwd)/API-${SERVER_NAME}-${DATE}.json"
        get_port_data "${SERVER_NAME}" "${API_FILE}"
        nodejs build/change-port-data.js "${GIT_FILE}" "${API_FILE}"
        rm "${API_FILE}"
    done
}

function deploy_data () {
    yarn run deploy-netlify
}

#####
# Main functions

function change_data () {
    change_port_data
}

function push_data () {
    git add --ignore-errors .
    if [[ ! -z $(git status -s) ]]; then
        git commit -m "push"
        touch "${LAST_UPDATE_FILE}"
    fi
    git push gitlab
}

function update_data () {
    #cd "/home/natopo/na-topo.git"
    echo 'update port data'
    # If file not exists create it with date of last commit
    [[ ! -f "${LAST_UPDATE_FILE}" ]] && touch -d "$(git log -1 --format=%cI)" "${LAST_UPDATE_FILE}"
    LAST_UPDATE=$(date --reference="${LAST_UPDATE_FILE}" +%Y-%m-%d)
    if [ "${LAST_UPDATE}" != "${DATE}" ]; then
        update_yarn
        get_git_update
        change_port_data
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

