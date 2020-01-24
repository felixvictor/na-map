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

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

import { convertBuildingData } from "./convert-buildings.mjs";
import { convertCannons } from "./convert-cannons.mjs";
import { convertGenericPortData } from "./convert-generic-port-data.mjs";
import { convertLootData } from "./convert-loot.mjs";
import { convertModules } from "./convert-modules.mjs";
import { convertRecipeData } from "./convert-recipes.mjs";
import { convertRepairData } from "./convert-module-repair-data.mjs";
import { convertServerPortData } from "./convert-server-port-data.mjs";
import { convertShipData } from "./convert-ship-data.mjs";
import { convertOwnershipData } from "./convert-ownership.mjs";
import { createPortBattleSheet } from "./create-pb-sheets.mjs";

import { apiBaseFiles, baseAPIFilename, serverNames, serverStartDate as serverDate } from "./common.mjs";

const runType = process.argv[2] || "client";

const xz = (command, fileName) => {
    if (fs.existsSync(fileName)) {
        execSync(`${command} ${fileName}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`error: ${error.message}`);
                return;
            }

            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
        });
    }
};

const loopApiFiles = command => {
    const ext = command === "xz" ? "json" : "json.xz";

    for (const serverName of serverNames) {
        for (const apiBaseFile of apiBaseFiles) {
            const fileName = path.resolve(baseAPIFilename, `${serverName}-${apiBaseFile}-${serverDate}.${ext}`);
            xz(command, fileName);
        }
    }
};

const compressApiData = () => {
    loopApiFiles("xz");
};

const uncompressApiData = () => {
    loopApiFiles("unxz");
};

const convertApiData = async () => {
    convertBuildingData();
    convertCannons();
    convertGenericPortData();
    convertLootData();
    convertModules();
    convertRecipeData();
    convertRepairData();
    convertServerPortData();
    await convertShipData();
    if (runType === "server") {
        convertOwnershipData();
    }
};

uncompressApiData();
convertApiData();
createPortBattleSheet();
compressApiData();
