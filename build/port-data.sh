#!/usr/bin/env bash

set -e
trap on_exit EXIT

command_jq="$(command -v jq)"
command_nodejs="$(command -v node) --experimental-modules --no-warnings"
command_twurl="$(command -v twurl)"
command_xz="$(command -v xz)"
server_base_name="cleanopenworldprod"
source_base_url="http://storage.googleapis.com/nacleanopenworldprodshards/"
# http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
server_names=(eu1 eu2)

## testbed
#server_base_name="clean"
#source_base_url="http://storage.googleapis.com/nacleandevshards/"
#server_names=(dev)

server_twitter_names=(eu1)
api_vars=(ItemTemplates Ports Shops)
server_maintenance_hour=10
# Set server date
if [ "$(date -u '+%H')" -lt "${server_maintenance_hour}" ]; then
    server_date=$(date -u '+%Y-%m-%d' --date "- 1 day")
    server_last_date=$(date -u '+%Y-%m-%d' --date "- 2 days")
else
    server_date=$(date -u '+%Y-%m-%d')
    server_last_date=$(date -u '+%Y-%m-%d' --date "- 1 day")
fi
last_function=""
is_updated=false

function get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

function git_push () {
    git push --quiet gitlab
}

function git_pull () {
    git pull --quiet
}

function pull_master () {
    local branch
    branch=$(get_current_branch)

    git checkout master
    git_pull
    git checkout "${branch}"
}

function on_exit () {
    # If git push fails, git pull first
    if [ "${last_function}" == "push_data" ]; then
        pull_master
        git_push
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

    src_dir="${base_dir}/src"
    data_dir="${src_dir}/data"
    gen_dir="${src_dir}/gen"
    data_out_dir="${base_dir}/public/data"

    excel_file="${data_dir}/port-battle.xlsx"

    building_file="${gen_dir}/buildings.json"
    cannon_file="${gen_dir}/cannons.json"
    loot_file="${gen_dir}/loot.json"
    nation_file="${gen_dir}/nations.json"
    ownership_file="${gen_dir}/ownership.json"
    port_file="${gen_dir}/ports.json"
    prices_file="${gen_dir}/prices.json"
    recipe_file="${gen_dir}/recipes.json"
    repair_file="${gen_dir}/repairs.json"
    ship_blueprint_file="${gen_dir}/ship-blueprints.json"
    ship_file="${gen_dir}/ships.json"
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
        if curl --fail --silent --output "${out_file}" "${url}"; then
            sed -i -e "s/^var $api_var = //; s/\\;$//" "${out_file}"
        else
            exit $?
        fi
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

    local new_file
    local old_file

	  for api_var in "${api_vars[@]}"; do
        new_file="${api_base_file}-${server_names[0]}-${api_var}-${server_date}.json"
        old_file="${api_base_file}-${server_names[0]}-${api_var}-${server_last_date}.json"

        # If old file does not exist test succeeded
        [[ ! -f "${old_file}" ]] && return 0;

        # Get new file
        get_API_data "${server_names[0]}" "${new_file}" "${api_var}"

        # Exit if $API_VAR file has not been updated yet
        cmp --silent "${new_file}" "${old_file}" && { rm "${new_file}"; return 1; }
    done

    return 0
}


function get_port_data () {
    local api_dir
    api_dir="${build_dir}/API"
    local api_base_file
    api_base_file="${api_dir}/api"

    mkdir -p "${api_dir}"
    if test_for_update "${api_base_file}"; then
        for JSON in "${api_dir}"/*.json; do
            if [ "${JSON}" != "${tweets_json}" ]; then
                ${command_xz} --extreme --force "${JSON}"
            fi
        done

        local pb_file
        local api_file
        for server_name in "${server_names[@]}"; do
            pb_file="${data_dir}/${server_name}-pb.json"
            for api_var in "${api_vars[@]}"; do
                api_file="${api_base_file}-${server_name}-${api_var}-${server_date}.json"
                get_API_data "${server_name}" "${api_file}" "${api_var}"
            done

            ${command_nodejs} build/convert-API-data.mjs "${api_base_file}-${server_name}" "${server_name}" "${gen_dir}" "${data_dir}" "${server_date}"
            ${command_nodejs} build/convert-API-pb-data.mjs "${api_base_file}-${server_name}" "${pb_file}" "${server_date}"
        done


        ${command_nodejs} build/convert-pbZones.mjs "${api_base_file}-${server_names[0]}" "${pb_zone_file}" "${server_date}"
        ${command_nodejs} build/convert-ports.mjs "${api_base_file}-${server_names[0]}" "${port_file}" "${server_date}"
        ${command_nodejs} build/convert-ships.mjs "${api_base_file}-${server_names[0]}" "${ship_file}" "${server_date}"
        ${command_nodejs} build/convert-additional-ship-data.mjs "${build_dir}/Modules" "${ship_file}"
        ${command_nodejs} build/convert-cannons.mjs "${build_dir}/Modules" "${cannon_file}"
        ${command_nodejs} build/convert-module-repair-data.mjs "${build_dir}/Modules" "${repair_file}"
        ${command_nodejs} build/convert-modules.mjs "${api_base_file}-${server_names[0]}" "${gen_dir}" "${server_date}"
        ${command_nodejs} build/convert-buildings.mjs "${api_base_file}-${server_names[0]}" "${building_file}" "${prices_file}" "${server_date}"
        ${command_nodejs} build/convert-loot.mjs "${api_base_file}-${server_names[0]}" "${loot_file}" "${server_date}"
        ${command_nodejs} build/convert-recipes.mjs "${api_base_file}-${server_names[0]}" "${recipe_file}" "${server_date}"
        ${command_nodejs} build/convert-ship-blueprints.mjs "${api_base_file}-${server_names[0]}" "${ship_blueprint_file}" "${server_date}"

        if [ "${script_run_type}" == "update" ] || [ ! -f "${ownership_file}" ] || [ ! -f "${nation_file}" ]; then
            ${command_nodejs} build/convert-ownership.mjs "${api_dir}" "api-${server_names[0]}-Ports" "${ownership_file}" "${nation_file}"
        fi

        ${command_nodejs} build/create-xlsx.mjs "${ship_file}" "${port_file}" "${excel_file}"

        return 0
    else
        return 1
    fi
}

function copy_data () {
    cp --update "${data_dir}"/*.json "${excel_file}" "${data_out_dir}"/
}

function deploy_data () {
    yarn run deploy-netlify
}

function remove_tweets () {
    rm -f "${tweets_json}"
}

function get_tweets_in_range () {
    local query_date
    query_date="$1"
    local query_hour
    query_hour="$2"

    local url_start
    url_start="/1.1/search/tweets.json?tweet_mode=extended&count=100&result_type=recent"
    local query_end
    query_end=":\"%20from:zz569k"
    local jq_format
    jq_format="{ tweets: [ .statuses[] | { id: .id_str, text: .full_text } ], refresh: .search_metadata.max_id_str }"
    local query_start
    query_start="&q=\"[${query_date} ${query_hour}"

    ${command_twurl} "${url_start}${query_start}${query_end}" | ${command_jq} "${jq_format}" >> "${tweets_json}"
    echo "," >> "${tweets_json}"
}

function get_tweets_change () {
    local time_of_day

    # Empty file
    echo "[" > "${tweets_json}"

    time_of_day=$(date '+%d-%m-%Y' -d "${server_date} - 2 day")
    for query_hour in $(seq 0 23); do
        get_tweets_in_range "${time_of_day}" "$(printf "%02d\n" "${query_hour}")"
    done

    time_of_day=$(date '+%d-%m-%Y' -d "${server_date} - 1 day")
    for query_hour in $(seq 0 23); do
        get_tweets_in_range "${time_of_day}" "$(printf "%02d\n" "${query_hour}")"
    done

    time_of_day=$(date '+%d-%m-%Y' -d "${server_date}")
    for query_hour in $(seq 0 23); do
        get_tweets_in_range "${time_of_day}" "$(printf "%02d\n" "${query_hour}")"
    done

    time_of_day=$(date '+%d-%m-%Y' -d "${server_date} + 1 day")
    for query_hour in $(seq 0 ${server_maintenance_hour}); do
        get_tweets_in_range "${time_of_day}" "$(printf "%02d\n" "${query_hour}")"
    done

    # Remove trailing comma
    sed -i '$s/,$//' "${tweets_json}"
    echo "]" >> "${tweets_json}"
}

function get_tweets_update () {
    local query
    query="/1.1/search/tweets.json?q=from:zz569k&tweet_mode=extended&count=100&result_type=recent"
    local jq_format
    jq_format="{ tweets: [ .statuses[] | { id: .id_str, text: .full_text } ], refresh: .search_metadata.max_id_str }"
    local since

    if [[ -f "${tweets_json}" ]]; then
        since=$(${command_nodejs} -pe 'JSON.parse(process.argv[1]).refresh' "$(cat "${tweets_json}")")
        query+="&since_id=${since}"
    fi
    ${command_twurl} "${query}" | ${command_jq} "${jq_format}" > "${tweets_json}"
}


function update_ports () {
    local pb_file

    for server_name in "${server_twitter_names[@]}"; do
        pb_file="${data_dir}/${server_name}-pb.json"
        ${command_nodejs} build/update-ports.mjs "${pb_file}" "${tweets_json}"
    done

    return $?
}


###########################################
# Main functions

function log_date () {
    echo -e "\n\n*****************************\n${server_date}\n"
}

function update_tweets () {
    cd ${base_dir}
    get_git_update
    get_tweets_update
    if update_ports; then
        copy_data
        push_data
        if [ "${is_updated}" = true ] ; then
          deploy_data
        fi
    fi
}

function change_tweets () {
    get_tweets_change
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
        is_updated=true
    fi
    # Status for on_exit trap
    last_function="push_data"
    git_push
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
    if [ "${last_update_date}" != "${server_date}" ]; then
        update_yarn
        get_git_update
        # Test if new API data available
        if get_port_data; then
            remove_tweets
            get_tweets_update
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
