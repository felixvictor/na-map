#!/usr/bin/env bash

set -e
trap on_exit EXIT

command_jq="$(command -v jq)"
command_nodejs="$(command -v node) --experimental-modules --no-warnings"
command_twurl="$(command -v twurl)"
command_xz="$(command -v xz)"
module="main"
server_base_name="cleanopenworldprod"
source_base_url="http://storage.googleapis.com/nacleanopenworldprodshards/"
# http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
server_names=(eu1 eu2)

## testbed
#SERVER_BASE_NAME="clean"
#SOURCE_BASE_URL="http://storage.googleapis.com/nacleandevshards/"
#SERVER_NAMES=(dev)

server_twiter_names=(eu1)
api_vars=(ItemTemplates Ports Shops)
server_maintenance_hour=10
#header_date=$(LC_TIME="en" date -u +"%a, %d %b %Y 10:00:00 GMT" -d "+1 day")
# Set server date
if [ "$(date -u '+%H')" -lt "${server_maintenance_hour}" ]; then
    date=$(date -u '+%Y-%m-%d' --date "-1 day")
    last_date=$(date -u '+%Y-%m-%d' --date "-2 day")
else
    date=$(date -u '+%Y-%m-%d')
    last_date=$(date -u '+%Y-%m-%d' --date "-1 day")
fi
last_function=""

function get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

function git_push_all () {
    git pull --quiet gitlab --all
}

function git_pull_all () {
    git pull --all
}

function pull_all () {
    local branch
    branch=$(get_current_branch)

    git checkout master
    git_pull_all
    git checkout "${branch}"
}

function on_exit () {
    # If git push fails, git pull first
    if [ "${last_function}" == "push_data" ]; then
        pull_all
        git_push_all
        exit 0
    fi
}

function change_var () {
    base_dir="$(pwd)"
    common_var
}

function update_var () {
    base_dir="/home/natopo/na-topo.git"
    common_var
}

function common_var () {
    build_dir="${base_dir}/build"
    tweets_json="${build_dir}/API/tweets.json"
    last_update_file="${build_dir}/.last-port-update"
    [[ ! -d "${base_dir}/public" ]] && yarn run prod
    css_file=$(find "${base_dir}/public/" -type f -regextype posix-extended -regex "${base_dir}/public/${module}(\.[[:alnum:]]+)?\.css$")

    src_dir="${base_dir}/src"
    src_gen_dir="${base_dir}/src/gen"
    ship_file="${src_gen_dir}/ships.json"
    cannon_file="${src_gen_dir}/cannons.json"
    building_file="${src_gen_dir}/buildings.json"
    recipe_file="${src_gen_dir}/recipes.json"
    ownership_json="${src_gen_dir}/ownership.json"
    nation_file="${src_gen_dir}/nations.json"
    loot_file="${src_gen_dir}/loot.json"
    excel_file="${src_gen_dir}/port-battle.xlsx"
}

function get_API_data () {
    local server_name
    server_name="$1"
    local out_file
    out_file="$2"
    local api_var
    api_var="$3"
    local url
    url="${source_base_url}${api_var}_${server_base_name}${server_name}.json"

    if [[ ! -f "${out_file}" ]]; then
        curl --silent --output "${out_file}" "${url}"
        sed -i -e "s/^var $api_var = //; s/\\;$//" "${out_file}"
    fi
}

function get_git_update () {
    # pull if needed
    # https://stackoverflow.com/questions/3258243/check-if-pull-needed-in-git/25109122
    git remote update &> /dev/null

    local local
    local=$(git rev-parse @)
    local base
    base=$(git merge-base @ "@{u}")

    if [ "${local}" == "${base}" ]; then
        git pull
    fi
}

function update_yarn () {
    yarn --silent
}

function test_for_update () {
    local api_base_file
    api_base_file="$1"

	for api_var in "${api_vars[@]}"; do
        local new_file
	    new_file="${api_base_file}-${server_names[0]}-${api_var}-${date}.json"
	    local old_file
		old_file="${api_base_file}-${server_names[0]}-${api_var}-${last_date}.json"

		# If old file does not exist create it
		[[ ! -f "${old_file}" ]] && touch "${old_file}"

		# Get new file
		get_API_data "${server_names[0]}" "${new_file}" "${api_var}"

		# Exit if $API_VAR file has not been updated yet
		cmp --silent "${new_file}" "${old_file}" && { rm "${new_file}"; return 1; }
	done
    return 0
}


function get_port_data () {
    local api_dir
    local api_base_file
    api_dir="${build_dir}/API"
    api_base_file="${api_dir}/api"

    mkdir -p "${api_dir}"
    if test_for_update "${api_base_file}"; then
        for JSON in "${api_dir}"/*.json; do
            if [ "${JSON}" != "${tweets_json}" ]; then
                ${command_xz} -9ef "${JSON}"
            fi
        done

        for server_name in "${server_names[@]}"; do
            local port_file
            port_file="${src_dir}/${server_name}.json"
            local pb_file
            pb_file="${src_dir}/${server_name}-pb.json"
            local temp_port_file
            temp_port_file="${build_dir}/ports.geojson"
            for api_var in "${api_vars[@]}"; do
                local API_FILE
                API_FILE="${api_base_file}-${server_name}-${api_var}-${date}.json"
                get_API_data "${server_name}" "${API_FILE}" "${api_var}"
            done

            ${command_nodejs} build/convert-API-data.mjs "${api_base_file}-${server_name}" "${temp_port_file}" "${src_dir}" "${date}"
            yarn geo2topo -o "${port_file}" "${temp_port_file}"
            rm "${temp_port_file}"

            ${command_nodejs} build/convert-API-pb-data.mjs "${api_base_file}-${server_name}" "${pb_file}" "${date}"
        done


        ${command_nodejs} build/convert-pbZones.mjs "${api_base_file}-${server_names[0]}" "${build_dir}" "${date}"
        yarn geo2topo -o "${src_dir}/pb.json" \
            "${build_dir}/pbCircles.geojson" "${build_dir}/forts.geojson" \
            "${build_dir}/towers.geojson" "${build_dir}/joinCircles.geojson"
        rm "${build_dir}"/*.geojson

        ${command_nodejs} build/convert-ships.mjs "${api_base_file}-${server_names[0]}" "${ship_file}" "${date}"
        ${command_nodejs} build/convert-additional-ship-data.mjs "${build_dir}/Modules" "${ship_file}"
        ${command_nodejs} build/convert-cannons.mjs "${build_dir}/Modules" "${cannon_file}"
        ${command_nodejs} build/convert-modules.mjs "${api_base_file}-${server_names[0]}" "${src_dir}" "${date}"
        ${command_nodejs} build/convert-buildings.mjs "${api_base_file}-${server_names[0]}" "${building_file}" "${date}"
        ${command_nodejs} build/convert-loot.mjs "${api_base_file}-${server_names[0]}" "${loot_file}" "${date}"
        ${command_nodejs} build/convert-recipes.mjs "${api_base_file}-${server_names[0]}" "${recipe_file}" "${date}"
        if [ "${script_run_type}" == "update" ]; then
            ${command_nodejs} build/convert-ownership.mjs "${api_dir}" "${ownership_json}" "${nation_file}"
        fi

        ${command_nodejs} build/create-xlsx.mjs "${ship_file}" "${src_dir}/${server_names[0]}.json" "${css_file}" "${excel_file}"

        return 0
    else
        return 1
    fi
}

function copy_data () {
    public_dir="${base_dir}/public"

    cp --update "${src_dir}"/*.json "${excel_file}" "${public_dir}"/
}

function deploy_data () {
    yarn run deploy-netlify
}

function remove_tweets () {
    rm -f "${tweets_json}"
}

function get_tweets () {
    QUERY="/1.1/search/tweets.json?q=from:zz569k&tweet_mode=extended&count=100&result_type=recent"
    JQ_FORMAT="{ tweets: [ .statuses[] | { id: .id_str, text: .full_text } ], refresh: .search_metadata.max_id_str }"

    if [[ -f "${tweets_json}" ]]; then
        SINCE=$(${command_nodejs} -pe 'JSON.parse(process.argv[1]).refresh' "$(cat "${tweets_json}")")
        QUERY+="&since_id=${SINCE}"
    fi
    ${command_twurl} "${QUERY}" | ${command_jq} "${JQ_FORMAT}" > "${tweets_json}"
}

function update_ports () {
    for server_name in "${server_twiter_names[@]}"; do
        pb_file="${src_dir}/${server_name}-pb.json"
        ${command_nodejs} build/update-ports.mjs "${pb_file}" "${tweets_json}"
    done

    return $?
}


###########################################
# Main functions

function log_date () {
    echo -e "\n\n*****************************\n${date}\n"
}

function update_tweets () {
    cd ${base_dir}
    get_git_update
    get_tweets
    if update_ports; then
        copy_data
        push_data
        deploy_data
    fi
}

function change_tweets () {
    get_tweets
    update_ports
}

function change_data () {
    get_port_data
}

function push_data () {
    git add --ignore-errors .
    if [[ -n $(git status -s) ]]; then
        local git_message
        git_message=""

        if [ "${script_run_type}" == "update" ]; then
            git_message+="squash! "
            touch "${last_update_file}"
        fi
        git_message+="push ${script_run_type}"
        git commit -m "${git_message}"
    fi
    # Status for on_exit trap
    last_function="push_data"
    git_push_all
    last_function=""
}

function update_data () {
    cd ${base_dir}
    # If file not exists create it with date of last commit
    if [[ ! -f "${last_update_file}" ]]; then
        touch -d "$(git log -1 --format=%cI)" "${last_update_file}"
    fi
    local last_update_date
    last_update_date=$(date --reference="${last_update_file}" +%Y-%m-%d)
    # Test if already updated today
    if [ "${last_update_date}" != "${date}" ]; then
        update_yarn
        get_git_update
        # Test if new API data available
        if get_port_data; then
            remove_tweets
            get_tweets
            update_ports

            copy_data
            push_data
            deploy_data
        fi
    fi
}

case "$1" in
    change)
        change_var
        change_data
        ;;
    push-change)
        script_run_type="change"
        change_var
        push_data
        ;;
    push-update)
        script_run_type="update"
        update_var
        log_date
        push_data
        ;;
    update)
        script_run_type="update"
        update_var
        log_date
        update_data
        ;;
    twitter-update)
        script_run_type="update-tweets"
        update_var
        update_tweets
        ;;
    twitter-change)
        change_var
        remove_tweets
        change_tweets
        ;;
esac
