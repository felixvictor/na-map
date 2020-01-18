#!/usr/bin/env -S node --experimental-modules

/**
 * This file is part of na-map.
 *
 * @file      Main.
 * @module    main
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path";
import * as fs from "fs";

import { getApiData } from "./get-api-data.mjs";
import { convertGenericPortData } from "./convert-generic-port-data.mjs";
import { convertServerSpecificPortData } from "./convert-server-specific-port-data.mjs";

import { commonPaths, serverDateMonth, serverDateYear } from "./common.mjs";

const makeDir = dir => {
    console.log("makeDir", dir);
    fs.mkdir(dir, { recursive: true }, error => {
        if (error) {
            throw error;
        }
    });
};

const baseFilename = path.resolve(commonPaths.dirBuild, "APIx", serverDateYear, serverDateMonth);

const main = async () => {
    await makeDir(baseFilename);
    console.log(await getApiData(baseFilename));
    console.log("nach getApiData");
    console.log("vor convertGenericPortData");
    console.log(await convertGenericPortData(baseFilename));
    console.log("vor convertServerSpecificPortData");
    console.log(await convertServerSpecificPortData(baseFilename));
};

main();
