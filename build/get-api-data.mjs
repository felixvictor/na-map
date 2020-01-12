#!/usr/bin/env -S node --experimental-modules

/**
 * This file is part of na-map.
 *
 * @file      Get api data.
 * @module    get-api-data
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs";
import * as path from "path";

import convert from "xml-js";
import { getCommonPaths, getServerStartDate, readNAJson, saveJson } from "./common.mjs";

const serverBaseName = "cleanopenworldprod";
const sourceBaseUrl = "https://storage.googleapis.com/";
const sourceBaseDir = "nacleanopenworldprodshards";
// http://api.shipsofwar.net/servers?apikey=1ZptRtpXAyEaBe2SEp63To1aLmISuJj3Gxcl5ivl&callback=setActiveRealms
const serverNames = ["eu1", "eu2"];

/* testbed
   server_base_name="clean"
   source_base_url="http://storage.googleapis.com/nacleandevshards/"
   server_names=(dev)
*/

const serverTwitterNames = ["eu1"];
const apiBaseFiles = ["ItemTemplates", "Ports", "Shops"];

/*
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
    cmp "${new_file}" "${old_file}"
    cmp --silent "${new_file}" "${old_file}" && { rm "${new_file}"; return 1; }
    done

    return 0
}
*/

const getAPIDataAndSave = async (serverName, apiBaseFile, outFile) => {
    const url = new URL(`${sourceBaseUrl}${sourceBaseDir}/${apiBaseFile}_${serverBaseName}${serverName}.json`);
    const data = await readNAJson(url);
    console.log(data[0].Name);
    // saveJson(outFile, data);

};

const commonPaths = getCommonPaths();
console.log(commonPaths);

const serverStartDate = getServerStartDate();
console.log(serverStartDate);

getAPIDataAndSave("eu1", "Ports", "p.json");
