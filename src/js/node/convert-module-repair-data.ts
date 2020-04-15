/*!
 * This file is part of na-map.
 *
 * @file      Convert repair data from modules.
 * @module    src/node/convert-module-repair
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as path from "path"
import convert, { ElementCompact } from "xml-js"

import { commonPaths } from "../common/common-dir"
import { readTextFile, saveJsonAsync } from "../common/common-file"

import { Repair, RepairAmount } from "../common/gen-json"
import { TextEntity, XmlRepair } from "./xml"

/**
 * Change string from snake case to camelCase
 *
 * @param str - Input snake case string
 * @returns Output camel case string
 */
function toCamelCase(str: string): string {
    str = str.replace(/[\s-_]+(.)?/g, (_match, ch: string) => (ch ? ch.toUpperCase() : ""))

    // Ensure first char is always lowercase
    return str.slice(0, 1).toLowerCase() + str.slice(1)
}

const baseFileNames = ["armor repair", "sail repair", "crew repair"]

const getFileData = (baseFileName: string, ext: string): XmlRepair => {
    const fileName = path.resolve(commonPaths.dirModules, `${baseFileName} ${ext}.xml`)
    const fileXmlData = readTextFile(fileName)

    return (convert.xml2js(fileXmlData, { compact: true }) as ElementCompact).ModuleTemplate as XmlRepair
}

/**
 * Retrieve additional ship data from game files and add it to existing data from API
 */
export const convertRepairData = async (): Promise<void> => {
    const repairs = {} as Repair
    /*
    REPAIR_VOLUME_PER_ITEM / REPAIR_PERCENT
     */

    // Get all files without a master
    for (const baseFileName of baseFileNames) {
        const fileData = getFileData(baseFileName, "kit")
        const data = {} as RepairAmount

        fileData.Attributes.Pair.forEach((pair) => {
            if (pair.Key._text === "REPAIR_VOLUME_PER_ITEM") {
                data.volume = Number((pair.Value.Value as TextEntity)._text)
            }

            if (pair.Key._text === "REPAIR_PERCENT") {
                data.percent = Number((pair.Value.Value as TextEntity)._text)
            }

            if (pair.Key._text === "REPAIR_MODULE_TIME") {
                data.time = Number((pair.Value.Value as TextEntity)._text)
            }
        })

        repairs[toCamelCase(baseFileName)] = data
    }

    await saveJsonAsync(commonPaths.fileRepair, repairs)
}
