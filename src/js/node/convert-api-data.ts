/**
 * This file is part of na-map.
 *
 * @file      Convert API data.
 * @module    convert-api-data
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import * as path from "path"
import { execSync } from "child_process"

import { convertBuildingData } from "./convert-buildings"
import { convertCannons } from "./convert-cannons"
/*
import { convertGenericPortData } from "./convert-generic-port-data"
import { convertLootData } from "./convert-loot"
import { convertModules } from "./convert-modules"
import { convertRecipeData } from "./convert-recipes"
import { convertRepairData } from "./convert-module-repair-data"
import { convertServerPortData } from "./convert-server-port-data"
import { convertShipData } from "./convert-ship-data"
import { convertOwnershipData } from "./convert-ownership"
import { createPortBattleSheet } from "./create-pb-sheets"
*/
import { apiBaseFiles, serverNames } from "../common"
import { baseAPIFilename, serverStartDate as serverDate } from "./common-node"

const runType = process.argv[2] || "client"

const xz = (command: string, fileName: string): void => {
    if (fs.existsSync(fileName)) {
        execSync(`${command} ${fileName}`)
    }
}

const loopApiFiles = (command: string): void => {
    const ext = command === "xz" ? "json" : "json.xz"

    for (const serverName of serverNames) {
        for (const apiBaseFile of apiBaseFiles) {
            const fileName = path.resolve(baseAPIFilename, `${serverName}-${apiBaseFile}-${serverDate}.${ext}`)
            xz(command, fileName)
        }
    }
}

const compressApiData = () => {
    loopApiFiles("xz")
}

const uncompressApiData = () => {
    loopApiFiles("unxz")
}

const convertApiData = async (): Promise<void> => {
    convertBuildingData()
    convertCannons()
    convertGenericPortData()
    convertLootData()
    convertModules()
    convertRecipeData()
    convertRepairData()
    convertServerPortData()
    await convertShipData()
    if (runType.endsWith("server")) {
        convertOwnershipData()
    }
}

uncompressApiData()
// noinspection JSIgnoredPromiseFromCall
convertApiData()
createPortBattleSheet()
compressApiData()
