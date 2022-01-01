#!/usr/bin/env bash

env=.env

site_id=
site_key=
params=( "$@" )

function get_env() {
    set -a # automatically export all variables
    # shellcheck disable=SC1090
    source "${env}"
    set +a
}

function exit_with_error() {
    echo "Cannot get netlify site key: ${1}" >&2
    exit 1
}

function get_site_id() {
    if ! TEMP=$(getopt -o s: --long site: -- "$@"); then exit_with_error "wrong site parameter"; fi

    eval set -- "$TEMP"

    while true; do
        case "$1" in
            -s | --site)
                site_id="$2"
                shift 2
                ;;
            --)
                shift
                break
                ;;
            *) break ;;
        esac
    done
}

function get_site_key() {
    case "${site_id}" in
        regular) site_key="${KEY_NETLIFY}" ;;
        test1) site_key="${KEY_NETLIFY_TEST}" ;;
        test2) site_key="${KEY_NETLIFY_TEST2}" ;;
        *) exit_with_error "wrong site id" ;;
    esac
}

get_env
get_site_id "${params[@]}"
get_site_key

yarn netlify deploy --prod --dir public --site "${site_key}"
