/**
 * This file is part of na-map.
 *
 * @file      Convert API data.
 * @module    convert-api-data
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { compressApiData, uncompressApiData } from "./common-node"

import { convertBuildingData } from "./convert-buildings"
import { convertCannons } from "./convert-cannons"
import { convertGenericPortData } from "./convert-generic-port-data"
import { convertLootData } from "./convert-loot"
import { convertModules } from "./convert-modules"
import { convertRepairData } from "./convert-module-repair-data"
/*
import { convertRecipeData } from "./convert-recipes"
import { convertServerPortData } from "./convert-server-port-data"
import { convertShipData } from "./convert-ship-data"
import { convertOwnershipData } from "./convert-ownership"
import { createPortBattleSheet } from "./create-pb-sheets"
 */

// const runType = process.argv[2] || "client"

const convertApiData = async (): Promise<void> => {
    convertBuildingData()
    convertCannons()
    convertGenericPortData()
    convertLootData()
    convertModules()
    convertRepairData()
    /*
    convertRecipeData()
    convertServerPortData()
    await convertShipData()
    if (runType.endsWith("server")) {
        convertOwnershipData()
    }
    */
}

uncompressApiData()
// noinspection JSIgnoredPromiseFromCall
convertApiData()
//createPortBattleSheet()
compressApiData()
