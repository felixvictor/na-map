#!/usr/bin/env bash

cd "/home/natopo/na-topo.git"

. "build/common.sh"

LAST_UPDATE=$(date --reference="${LAST_UPDATE_FILE}" +%Y-%m-%d)

function get-git-update () {
    git pull
}

function push-git-update-deploy () {
    yarn run prod
    git add --ignore-errors .
    if [[ ! -z $(git status -s) ]]; then
        git commit -m "change server port data"
        touch "${LAST_UPDATE_FILE}"
	    git push
	    yarn run deploy-netlify
    fi
}

echo 'change server port data'

if [ "${LAST_UPDATE}" != "${DATE}" ]; then
    yarn --silent
    get-git-update
    change-port-data
    yarn run deploy-update
fi
