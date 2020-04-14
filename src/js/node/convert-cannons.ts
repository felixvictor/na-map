/*!
 * This file is part of na-map.
 *
 * @file      Cannon data.
 * @module    convert-cannons
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import * as fs from "fs"
import * as path from "path"

import convert, { ElementCompact } from "xml-js"

import { commonPaths } from "../common/common-dir"
import { readTextFile, saveJsonAsync } from "../common/common-file"
import { round } from "../common/common-math"

import { cannonEntityType, CannonEntityType, CannonType, cannonType } from "../common/common"
import { Cannon, CannonEntity, CannonPenetration, CannonValue } from "../common/gen-json"
import { PairEntity, TangentEntity, TextEntity, XmlGeneric } from "./xml"

// noinspection MagicNumberJS
const peneDistances = [50, 100, 250, 500, 750, 1000]

const countDecimals = (value: number | undefined): number => {
    if (value === undefined) {
        return 0
    }

    if (Math.floor(value) === value) {
        return 0
    }

    return value.toString().split(".")[1].length ?? 0
}

/**
 * Get content of XML file in json format
 * @param baseFileName - Base file name
 * @returns File content in json format
 */
const getFileData = (baseFileName: string): XmlGeneric => {
    const fileName = path.resolve(commonPaths.dirModules, baseFileName)
    const fileXmlData = readTextFile(fileName)

    return (convert.xml2js(fileXmlData, { compact: true }) as ElementCompact).ModuleTemplate as XmlGeneric
}

/**
 * List of file names to be read
 */
const fileNames: Set<string> = new Set()

/**
 * Gets all files from directory <directory> and stores valid cannon/carronade file names in <fileNames>
 */
const getBaseFileNames = (directory: string): void => {
    for (const fileName of fs.readdirSync(directory)) {
        /**
         * First part of the file name containing the type
         */
        const fileNameFirstPart = fileName.slice(0, fileName.indexOf(" "))
        // noinspection OverlyComplexBooleanExpressionJS
        if (
            (fileNameFirstPart === "cannon" && fileName !== "cannon repair kit.xml") ||
            fileNameFirstPart === "carronade" ||
            fileName.startsWith("tower cannon")
        ) {
            fileNames.add(fileName)
        }
    }
}

/**
 * Data mapping for content of the individual files.
 */
const dataMapping: Map<string, { group: CannonEntityType; element: string }> = new Map([
    // ["CANNON_BLOW_CHANCE", { group: "generic", element: "blow chance" }],
    // ["HIT_PROBABILITY", { group: "damage", element: "hit probability" }],
    // ["DAMAGE_MULTIPLIER", { group: "damage", element: "multiplier" }],
    ["CANNON_BASIC_DAMAGE", { group: "damage", element: "basic" }],
    // ["CANNON_FIREPOWER", { group: "damage", element: "firepower" }],
    ["CANNON_MIN_ANGLE", { group: "traverse", element: "up" }],
    ["CANNON_MAX_ANGLE", { group: "traverse", element: "down" }],
    ["CANNON_DISPERSION_PER100M", { group: "dispersion", element: "horizontal" }],
    ["CANNON_DISPERSION_VERTICAL_PER100M", { group: "dispersion", element: "vertical" }],
    // ["CANNON_DISPERSION_REDUCTION_SPEED", { group: "dispersion", element: "reduction speed" }],
    ["CANNON_RELOAD_TIME", { group: "damage", element: "reload time" }],
    ["CANNON_MASS", { group: "generic", element: "weight" }],
    // ["DAMAGE_TYPE", { group: "damage", element: "type" }],
    // ["MODULE_BASE_HP", { group: "strength", element: "base" }],
    ["CANNON_BASIC_PENETRATION", { group: "damage", element: "penetration" }],
    // ["FIRE_PROBABILITY", { group: "generic", element: "fire probability" }],
    // ["CANNON_MASS", { group: "generic", element: "mass" }],
    // ["CANNON_BALL_RADIUS", { group: "generic", element: "ball radius" }],
    // ["CANNON_FIREZONE_HORIZONTAL_ROTATION_SPEED", { group: "dispersion", element: "horizontal rotation speed" }],
    // ["CANNON_BULLETS_PER_SHOT", { group: "generic", element: "bullets per shot" }],
    // ["CANNON_DISPERSION_REDUCTION_ANGLE_CHANGE_MULTIPLIER", { group: "dispersion", element: "reduction angle change modifier" }],
    // ["CANNON_DISPERSION_SHIP_PITCHING_MODIFIER", { group: "dispersion", element: "shi pitching modifier" }],
    // ["CANNON_FORWARD_FLY_TIME", { group: "generic", element: "forward fly time" }],
    // ["CANNON_FORWARD_FIREPOWER_LOSS", { group: "generic", element: "firepower loss" }],
    // ["CANNON_GRAVITY_MULTIPLIER", { group: "generic", element: "gravity multiplier" }],
    // ["CANNON_TYPE", { group: "generic", element: "type" }],
    // ["CANNON_CLASS", { group: "generic", element: "class" }],
    // ["ARMOR_DAMAGE_ABSORB_MULTIPLIER", { group: "strength", element: "damage absorb multiplier" }],
    ["CANNON_CREW_REQUIRED", { group: "generic", element: "crew" }],
    // ["ARMOR_THICKNESS", { group: "strength", element: "thickness" }],
    ["CANNON_BALL_ARMOR_SPLINTERS_DAMAGE_FOR_CREW", { group: "damage", element: "splinter" }],
])

const cannons = {} as Cannon
for (const type of cannonType) {
    cannons[type] = []
}

/**
 * Add data
 * @param fileData - File data per cannon
 */
const addData = (fileData: XmlGeneric): void => {
    let type: CannonType = "medium"

    if (fileData._attributes.Name.includes("Carronade")) {
        type = "carronade"
    } else if (fileData._attributes.Name.includes("Long")) {
        type = "long"
    }

    const name = fileData._attributes.Name.replace("Cannon ", "")
        .replace("Carronade ", "")
        .replace(" pd", "")
        .replace(" Long", "")
        .replace("Salvaged ", "")
        .replace("0.5 E", "E")
        .replace(/^(\d+) - (.+)$/g, "$1 ($2)")
        .replace(/^Tower (\d+)$/g, "$1 (Tower)")
        .replace("Blomfield", "Blomefield")
        .replace(" Gun", "")
        // Edinorog are 18lb now
        .replace("24 (Edinorog)", "18 (Edinorog)")

    const cannon = {
        name,
    } as CannonEntity
    for (const [value, { group, element }] of dataMapping) {
        if (!cannon[group]) {
            // @ts-ignore
            cannon[group] = {}
        }

        cannon[group][element] = {
            value: Number(
                (fileData.Attributes.Pair.find((pair) => pair.Key._text === value)?.Value.Value as TextEntity)._text ??
                    0
            ),
            digits: 0,
        } as CannonValue
    }

    // Calculate penetrations
    const penetrations: Map<number, number> = new Map(
        (fileData.Attributes.Pair.find((pair: PairEntity) => pair.Key._text === "CANNON_PENETRATION_DEGRADATION")?.Value
            .Value as TangentEntity[])
            .filter((penetration) => Number(penetration.Time._text) > 0)
            .map((penetration) => [Number(penetration.Time._text) * 1000, Number(penetration.Value._text)])
    )

    // noinspection MagicNumberJS
    penetrations.set(250, ((penetrations.get(200) ?? 0) + (penetrations.get(300) ?? 0)) / 2)
    // noinspection MagicNumberJS
    penetrations.set(500, ((penetrations.get(400) ?? 0) + (penetrations.get(600) ?? 0)) / 2)
    // noinspection MagicNumberJS
    penetrations.set(
        750,
        (penetrations.get(800) ?? 0) + ((penetrations.get(600) ?? 0) - (penetrations.get(800) ?? 0)) * 0.25
    )

    cannon.penetration = {} as CannonPenetration
    for (const distance of peneDistances) {
        cannon.penetration[distance] = {
            value: Math.trunc((penetrations.get(distance) ?? 0) * (cannon.damage.penetration?.value ?? 0)),
            digits: 0,
        }
    }

    delete cannon.damage.penetration

    // Calculate damage per second
    cannon.damage["per second"] = {
        value: round(cannon.damage.basic.value / cannon.damage["reload time"].value, 2),
        digits: 0,
    }

    cannons[type].push(cannon)
}

/**
 * Retrieve cannon data from game files and store it
 */
export const convertCannons = async (): Promise<void> => {
    getBaseFileNames(commonPaths.dirModules)

    // Get all files without a master
    for (const baseFileName of [...fileNames]) {
        const fileData = getFileData(baseFileName)
        addData(fileData)
    }

    // Set maximum digits after decimal point
    const maxDigits = new Map<[CannonType, CannonEntityType, string], number>()
    for (const type of cannonType) {
        for (const cannon of cannons[type]) {
            for (const group of cannonEntityType) {
                // @ts-ignore
                for (const [elementKey, elementValue] of Object.entries<CannonValue>(cannon[group])) {
                    maxDigits.set(
                        [type, group, elementKey],
                        Math.max(maxDigits.get([type, group, elementKey]) ?? 0, countDecimals(elementValue?.value))
                    )
                }
            }
        }
    }

    for (const [key, value] of maxDigits) {
        for (const cannon of cannons[key[0]]) {
            cannon[key[1]][key[2]]!.digits = value
        }
    }

    for (const type of cannonType) {
        cannons[type].sort(({ name: a }, { name: b }) => {
            // Sort either by lb numeral value when values are different
            if (Number.parseInt(a, 10) !== Number.parseInt(b, 10)) {
                return Number.parseInt(a, 10) - Number.parseInt(b, 10)
            }

            // Or sort by string
            return a.localeCompare(b)
        })
    }

    await saveJsonAsync(commonPaths.fileCannon, cannons)
}
