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
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        throw error;
    }
};

const baseFilename = path.resolve(commonPaths.dirBuild, "API", serverDateYear, serverDateMonth);

const main = () => {
    makeDir(baseFilename);
    getApiData(baseFilename).then(() => {
        convertGenericPortData(baseFilename);
        convertServerSpecificPortData(baseFilename);
    });
};

main();
