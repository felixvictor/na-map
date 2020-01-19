#!/usr/bin/env -S node --experimental-modules

/**
 * This file is part of na-map.
 *
 * @file      Convert API data.
 * @module    convert-api-data
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { convertGenericPortData } from "./convert-generic-port-data.mjs";
import { convertServerPortData } from "./convert-server-port-data.mjs";

// import {} from "./common.mjs";

const convertApiData = async () => {
    console.log("vor convertGenericPortData");
    convertGenericPortData();
    console.log("vor convertServerPortData");
    convertServerPortData();
};

convertApiData();
