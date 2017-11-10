#!/usr/bin/env bash

. "build/common.sh"

function copy-geojson() {
    for SERVER_NAME in "eu1" "eu2" "us2"; do
        cp --update "topojson/${SERVER_NAME}.json" public/
    done
}

copy-geojson
change-port-data
