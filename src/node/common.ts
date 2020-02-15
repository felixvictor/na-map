/**
 * This file is part of na-map.
 *
 * @file      Common data and functions.
 * @module    src/node/common
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as fs, promises as pfs } from "fs"
import * as path from "path"

export const timeFactor = 2.63
export const speedFactor = 390
export const speedConstA = 0.074465523706782
export const speedConstB = 0.00272175949231
export const defaultFontSize = 16
export const defaultCircleSize = 16

export const degreesFullCircle = 360
export const degreesHalfCircle = 180
const degreesQuarterCircle = 90

export const serverNames = ["eu1", "eu2"]
export const apiBaseFiles = ["ItemTemplates", "Ports", "Shops"]
export const serverTwitterNames = ["eu1"]

/* testbed
   server_base_name="clean"
   source_base_url="http://storage.googleapis.com/nacleandevshards/"
   server_names=(dev)
*/

// noinspection MagicNumberJS
const transformMatrix = {
    A: -0.00499866779363828,
    B: -0.00000021464254980645,
    C: 4096.88635151897,
    D: 4096.90282787469
}

// noinspection MagicNumberJS
const transformMatrixInv = {
    A: -200.053302087577,
    B: -0.00859027897636011,
    C: 819630.836437126,
    D: -819563.745651571
}

// F11 coord to svg coord
export const convertCoordX = (x: number, y: number): number =>
    transformMatrix.A * x + transformMatrix.B * y + transformMatrix.C

// F11 coord to svg coord
export const convertCoordY = (x: number, y: number): number =>
    transformMatrix.B * x - transformMatrix.A * y + transformMatrix.D

// svg coord to F11 coord
export const convertInvCoordX = (x: number, y: number): number =>
    transformMatrixInv.A * x + transformMatrixInv.B * y + transformMatrixInv.C

// svg coord to F11 coord
export const convertInvCoordY = (x: number, y: number): number =>
    transformMatrixInv.B * x - transformMatrixInv.A * y + transformMatrixInv.D

interface Nation {
    id: number
    short: string // Short name
    name: string // Name
    sortName: string // Name for sorting
}

// noinspection DuplicatedCode,SpellCheckingInspection,JSValidateTypes
export const nations: Array<Nation> = [
    { id: 0, short: "NT", name: "Neutral", sortName: "Neutral" },
    { id: 1, short: "PR", name: "Pirates", sortName: "Pirates" },
    { id: 2, short: "ES", name: "España", sortName: "España" },
    { id: 3, short: "FR", name: "France", sortName: "France" },
    { id: 4, short: "GB", name: "Great Britain", sortName: "Great Britain" },
    { id: 5, short: "VP", name: "Verenigde Provinciën", sortName: "Verenigde Provinciën" },
    { id: 6, short: "DK", name: "Danmark-Norge", sortName: "Danmark-Norge" },
    { id: 7, short: "SE", name: "Sverige", sortName: "Sverige" },
    { id: 8, short: "US", name: "United States", sortName: "United States" },
    { id: 9, short: "FT", name: "Free Town", sortName: "Free Town" },
    { id: 10, short: "RU", name: "Russian Empire", sortName: "Russian Empire" },
    { id: 11, short: "DE", name: "Kingdom of Prussia", sortName: "Prussia" },
    { id: 12, short: "PL", name: "Commonwealth of Poland", sortName: "Poland" }
]

// noinspection SpellCheckingInspection
export const capitalToCounty = new Map([
    ["Arenas", "Cayos del Golfo"],
    ["Ays", "Costa del Fuego"],
    ["Baracoa", "Baracoa"],
    ["Basse-Terre", "Basse-Terre"],
    ["Belize", "Belize"],
    ["Black River", "North Mosquito"],
    ["Bluefields", "South Mosquito"],
    ["Brangman’s Bluff", "Royal Mosquito"],
    ["Bridgetown", "Windward Isles"],
    ["Calobelo", "Portobelo"],
    ["Campeche", "Campeche"],
    ["Cap-Français", "Cap-Français"],
    ["Caracas", "Caracas"],
    ["Cartagena de Indias", "Cartagena"],
    ["Castries", "Sainte-Lucie"],
    ["Caymans", "George Town"],
    ["Charleston", "South Carolina"],
    ["Christiansted", "Vestindiske Øer"],
    ["Cumaná", "Cumaná"],
    ["Fort-Royal", "Martinique"],
    ["Gasparilla", "Costa de los Calos"],
    ["George Town", "Caymans"],
    ["George’s Town", "Exuma"],
    ["Gibraltar", "Lago de Maracaibo"],
    ["Grand Turk", "Turks and Caicos"],
    ["Gustavia", "Gustavia"],
    ["Islamorada", "Los Martires"],
    ["Kidd’s Harbour", "Kidd’s Island"],
    ["Kingston / Port Royal", "Surrey"],
    ["La Bahía", "Texas"],
    ["La Habana", "La Habana"],
    ["Les Cayes", "Les Cayes"],
    ["Maracaibo", "Golfo de Maracaibo"],
    ["Marsh Harbour", "Abaco"],
    ["Matina", "Costa Rica"],
    ["Morgan’s Bluff", "Andros"],
    ["Mortimer Town", "Inagua"],
    ["Nassau", "New Providence"],
    ["Nouvelle-Orléans", "Louisiane"],
    ["Nuevitas", "Nuevitas del Principe"],
    ["Old Providence", "Providencia"],
    ["Omoa", "Comayaqua"],
    ["Oranjestad", "Bovenwinds"],
    ["Pampatar", "Margarita"],
    ["Pedro Cay", "South Cays"],
    ["Penzacola", "Florida Occidental"],
    ["Pinar del Río", "Filipina"],
    ["Pitt’s Town", "Crooked"],
    ["Pointe-à-Pitre", "Grande-Terre"],
    ["Ponce", "Ponce"],
    ["Port-au-Prince", "Port-au-Prince"],
    ["Portobelo", "Portobelo"],
    ["Puerto de España", "Trinidad"],
    ["Puerto Plata", "La Vega"],
    ["Remedios", "Los Llanos"],
    ["Roseau", "Dominica"],
    ["Saint George’s Town", "Bermuda"],
    ["Saint John’s", "Leeward Islands"],
    ["Salamanca", "Bacalar"],
    ["San Agustín", "Timucua"],
    ["San Juan", "San Juan"],
    ["San Marcos", "Apalache"],
    ["Santa Fe", "Isla de Pinos"],
    ["Santa Marta", "Santa Marta"],
    ["Santiago de Cuba", "Cuidad de Cuba"],
    ["Santo Domingo", "Santo Domingo"],
    ["Santo Tomé de Guayana", "Orinoco"],
    ["Savanna la Mar", "Cornwall"],
    ["Savannah", "Georgia"],
    ["Sisal", "Mérida"],
    ["Soto La Marina", "Nuevo Santander"],
    ["Spanish Town", "Virgin Islands"],
    ["Trinidad", "Quatro Villas"],
    ["Vera Cruz", "Vera Cruz"],
    ["West End", "Grand Bahama"],
    ["Willemstad", "Benedenwinds"],
    ["Wilmington", "North Carolina"]
])

export const fileExists = (fileName: string): boolean => fs.existsSync(fileName)

/**
 * Make directories (recursive)
 */
export const makeDirAsync = async (dir: string): Promise<void> => {
    try {
        await pfs.mkdir(dir, { recursive: true })
    } catch (error) {
        throw error
    }
}

export const saveJsonAsync = async (fileName: string, data: object): Promise<void> => {
    await makeDirAsync(path.dirname(fileName))
    try {
        await pfs.writeFile(fileName, JSON.stringify(data), { encoding: "utf8" })
    } catch (error) {
        throw error
    }
}

export const saveTextFile = (fileName: string, data: object): void => {
    try {
        fs.writeFileSync(fileName, data, { encoding: "utf8" })
    } catch (error) {
        throw error
    }
}

export const readTextFile = (fileName: string): string => {
    let data = ""
    try {
        // noinspection JSCheckFunctionSignatures
        data = fs.readFileSync(fileName, { encoding: "utf8" })
    } catch (error) {
        if (error.code === "ENOENT") {
            console.error("File", fileName, "not found")
        } else {
            throw error
        }
    }

    return data
}

// export const readJson = (fileName: string): Record<string, string | number>[] => JSON.parse(readTextFile(fileName))
export const readJson = (fileName: string): StringIdedObject[] => JSON.parse(readTextFile(fileName))

/**
 * Check fetch status (see {@link https://developers.google.com/web/updates/2015/03/introduction-to-fetch})
 */
export const checkFetchStatus = (response: Response): Promise<object> => {
    // noinspection MagicNumberJS
    if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response)
    }

    return Promise.reject(new Error(response.statusText))
}

/**
 * Get json from fetch response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getJsonFromFetch = (response: Response): Promise<any> => response.json()

/**
 * Get text from fetch response
 */
export const getTextFromFetch = (response: Response): Promise<string> => response.text()

/**
 * Write error to console
 */
export const putFetchError = (error: string): void => {
    console.error("Request failed -->", error)
}

/**
 * Test if object is empty
 */
export const isEmpty = (obj: object): boolean =>
    Object.getOwnPropertyNames(obj).length === 0 && obj.constructor === Object

/**
 * Convert radians to correctionValueDegrees (see {@link http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/})
 */
const radiansToDegrees = (radians: number): number => (radians * degreesHalfCircle) / Math.PI

export interface Point extends Array<number> {
    0: number // X coordinate
    1: number // Y coordinate
}

/**
 * Calculate the angle in correctionValueDegrees between two points
 * @see https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
 */
export const rotationAngleInDegrees = (centerPt: Point, targetPt: Point): number => {
    let theta = Math.atan2(targetPt[1] - centerPt[1], targetPt[0] - centerPt[0])
    theta -= Math.PI / 2
    const degrees = radiansToDegrees(theta)
    return (degrees + degreesFullCircle) % degreesFullCircle
}

/**
 * Calculate the angle in correctionValueDegrees between two points
 * @see https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
 */
export const rotationAngleInRadians = (centerPt: Point, targetPt: Point): number =>
    Math.atan2(centerPt[1], centerPt[0]) - Math.atan2(targetPt[1], targetPt[0])

export interface Coordinate {
    x: number // X coordinate
    y: number // Y coordinate
}

/**
 * Calculate the distance between two points
 * @see https://www.mathsisfun.com/algebra/distance-2-points.html
 */
export const distancePoints = (centerPt: Coordinate, targetPt: Coordinate): number =>
    Math.sqrt((centerPt.x - targetPt.x) ** 2 + (centerPt.y - targetPt.y) ** 2)

/**
 * Convert correctionValueDegrees to radians
 */
export const degreesToRadians = (degrees: number): number =>
    (Math.PI / degreesHalfCircle) * (degrees - degreesQuarterCircle)

/**
 * {@link https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript}
 */
export const capitalizeFirstLetter = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1)

/**
 * Round to <d> digits
 * {@link https://github.com/30-seconds/30-seconds-of-code#round}
 */
export const round = (n: number, d = 0): number => Number(Math.round(n * 10 ** d) / 10 ** d)

/**
 * Round to thousands
 */
export const roundToThousands = (x: number): number => round(x, 3)

/**
 * Group by
 * {@link https://stackoverflow.com/a/38327540
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const groupToMap = (list: any, keyGetter: any): Map<any, any> => {
    const map = new Map()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list.forEach((item: any) => {
        const key = keyGetter(item)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const collection: any = map.get(key)
        if (collection) {
            collection.push(item)
        } else {
            map.set(key, [item])
        }
    })
    return map
}

/**
 * Create array with numbers ranging from start to end
 * {@link https://stackoverflow.com/questions/36947847/how-to-generate-range-of-numbers-from-0-to-n-in-es2015-only/36953272}
 */
export const range = (
    start: number, // Start index
    end: number // End index
): number[] => [...new Array(1 + end - start).keys()].map(v => start + v)

/**
 * Calculate the k distance between two svg coordinates
 */
export const getDistance = (pt0: Coordinate, pt1: Coordinate): number => {
    const fromF11 = {
        x: convertInvCoordX(pt0.x, pt0.y),
        y: convertInvCoordY(pt0.x, pt0.y)
    }
    const toF11 = {
        x: convertInvCoordX(pt1.x, pt1.y),
        y: convertInvCoordY(pt1.x, pt1.y)
    }

    return distancePoints(fromF11, toF11) / (timeFactor * speedFactor)
}

/**
 * Simple sort of strings a and b
 */
export const simpleSort = (a: string, b: string): number => a.localeCompare(b)

export interface StringIdedObject {
    Id: string
    [key: string]: string | number | object | []
}

/**
 * Sort of Id a and b as numbers
 */

export const sortId = ({ Id: a }: StringIdedObject, { Id: b }: StringIdedObject): number => Number(a) - Number(b)

/**
 * Sort by a list of properties (in left-to-right order)
 */
export const sortBy = (properties: string[]) => (
    a: { [index: string]: string | number },
    b: { [index: string]: string | number }
): number => {
    let r = 0
    properties.some((property: string) => {
        let sign = 1

        // property starts with '-' when sort is descending
        if (property.startsWith("-")) {
            sign = -1
            property = property.slice(1)
        }

        if (a[property] < b[property]) {
            r = -sign
        } else if (a[property] > b[property]) {
            r = sign
        }

        return r !== 0
    })

    return r
}

/**
 * Format ordinal
 */
export const getOrdinal = (
    n: number,
    sup = true // True if superscript tags needed
): string => {
    const s = ["th", "st", "nd", "rd"]
    // noinspection MagicNumberJS
    const v = n % 100
    // noinspection MagicNumberJS
    const text = s[(v - 20) % 10] || s[v] || s[0]
    return n + (sup ? `<span class="super">${text}</span>` : `${text}`)
}

/**
 * Clean API name
 */
export const cleanName = (name: string): string =>
    name
        .replace(/u([\da-f]{4})/gi, match => String.fromCharCode(parseInt(match.replace(/u/g, ""), 16)))
        .replace(/'/g, "’")
        .replace(" oak", " Oak")
        .replace(" (S)", "\u202F(S)")
        .trim()

/**
 * Find Nation object based on nation name
 */
export const findNationByName = (nationName: string): Nation | undefined =>
    nations.find(nation => nationName === nation.name)

/**
 * Find Nation object based on nation short name
 */
export const findNationByNationShortName = (nationShortName: string): Nation | undefined =>
    nations.find(nation => nation.short === nationShortName)

/**
 * Find Nation object based on nation id
 */
export const findNationById = (nationId: number): Nation | undefined => nations.find(nation => nationId === nation.id)
