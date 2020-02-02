/**
 * This file is part of na-map.
 *
 * @file      Common data and functions.
 * @module    common
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as fs, promises as pfs } from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

import dayjs from "dayjs"

import utc from "dayjs/plugin/utc.js"
dayjs.extend(utc)

// https://stackoverflow.com/a/50052194
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const serverMaintenanceHour = 10

export const timeFactor = 2.63
export const speedFactor = 390
export const speedConstA = 0.074465523706782
export const speedConstB = 0.00272175949231
export const defaultFontSize = 16
export const defaultCircleSize = 16

const degreesFullCircle = 360
export const degreesHalfCircle = 180
const degreesQuarterCircle = 90

const dirOut = path.resolve(__dirname, "..", "public", "data")
const dirBuild = path.resolve(__dirname, "..", "build")
const dirAPI = path.resolve(__dirname, "..", "build", "API")
const dirModules = path.resolve(__dirname, "..", "build", "Modules")
const dirSrc = path.resolve(__dirname, "..", "src")
const dirGenServer = path.resolve(dirSrc, "gen-server")
const dirGenGeneric = path.resolve(dirSrc, "gen-generic")

/**
 * Build common paths and file names
 * @return {Object} Paths
 */
export const commonPaths = {
    dirAPI,
    dirBuild,
    dirGenGeneric,
    dirGenServer,
    dirModules,
    dirOut,
    dirSrc,

    fileTwitterRefreshId: path.resolve(dirAPI, "response-id.txt"),

    filePbSheet: path.resolve(dirGenServer, "port-battle.xlsx"),

    fileBuilding: path.resolve(dirGenGeneric, "buildings.json"),
    fileCannon: path.resolve(dirGenGeneric, "cannons.json"),
    fileLoot: path.resolve(dirGenGeneric, "loot.json"),
    fileModules: path.resolve(dirGenGeneric, "modules.json"),
    fileNation: path.resolve(dirGenGeneric, "nations.json"),
    fileOwnership: path.resolve(dirGenGeneric, "ownership.json"),
    filePbZone: path.resolve(dirGenGeneric, "pb-zones.json"),
    filePort: path.resolve(dirGenGeneric, "ports.json"),
    filePrices: path.resolve(dirGenGeneric, "prices.json"),
    fileRecipe: path.resolve(dirGenGeneric, "recipes.json"),
    fileRepair: path.resolve(dirGenGeneric, "repairs.json"),
    fileShip: path.resolve(dirGenGeneric, "ships.json"),
    fileShipBlueprint: path.resolve(dirGenGeneric, "ship-blueprints.json"),
    fileWood: path.resolve(dirGenGeneric, "woods.json")
}

/**
 * Get server start (date and time)
 * @return {dayjs.Dayjs} Server start
 */
const getServerStartDateTime = () => {
    let serverStart = dayjs()
        .utc()
        .hour(serverMaintenanceHour)
        .minute(0)
        .second(0)

    // adjust reference server time if needed
    if (dayjs.utc().isBefore(serverStart)) {
        serverStart = dayjs.utc(serverStart).subtract(1, "day")
    }

    return serverStart
}

export const serverStartDateTime = getServerStartDateTime().format("YYYY-MM-DD HH:mm")
export const serverStartDate = getServerStartDateTime().format("YYYY-MM-DD")
export const serverNames = ["eu1", "eu2"]
export const apiBaseFiles = ["ItemTemplates", "Ports", "Shops"]
export const serverTwitterNames = ["eu1"]
const serverDateYear = String(dayjs(serverStartDate).year())
const serverDateMonth = String(dayjs(serverStartDate).month() + 1).padStart(2, "0")
export const baseAPIFilename = path.resolve(commonPaths.dirAPI, serverDateYear, serverDateMonth)

/* testbed
   server_base_name="clean"
   source_base_url="http://storage.googleapis.com/nacleandevshards/"
   server_names=(dev)
*/

export const distanceMapSize = 4096

// noinspection MagicNumberJS,DuplicatedCode
const transformMatrix = {
    A: -0.00499866779363828,
    B: -0.00000021464254980645,
    C: 4096.88635151897,
    D: 4096.90282787469
}

// noinspection MagicNumberJS,DuplicatedCode
const transformMatrixInv = {
    A: -200.053302087577,
    B: -0.00859027897636011,
    C: 819630.836437126,
    D: -819563.745651571
}

// F11 coord to svg coord
export const convertCoordX = (x, y) => transformMatrix.A * x + transformMatrix.B * y + transformMatrix.C

// F11 coord to svg coord
export const convertCoordY = (x, y) => transformMatrix.B * x - transformMatrix.A * y + transformMatrix.D

// svg coord to F11 coord
export const convertInvCoordX = (x, y) => transformMatrixInv.A * x + transformMatrixInv.B * y + transformMatrixInv.C

// svg coord to F11 coord
export const convertInvCoordY = (x, y) => transformMatrixInv.B * x - transformMatrixInv.A * y + transformMatrixInv.D

/**
 * @typedef {Object} Nation
 * @property {number} id - Id
 * @property {string} short - Short name
 * @property {string} name - Name
 * @property {string} sortName - Name for sorting
 */

// noinspection DuplicatedCode,SpellCheckingInspection,JSValidateTypes
/**
 * @type {Array<Nation>}
 */
export const nations = [
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

export const fileExists = fileName => fs.existsSync(fileName)

/**
 * Make directories (recursive)
 * @param {string} dir - Directory path
 * @return {void}
 */
export const makeDirAsync = async dir => {
    try {
        await pfs.mkdir(dir, { recursive: true })
    } catch (error) {
        throw error
    }
}

export const saveJsonAsync = async (fileName, data) => {
    await makeDirAsync(path.dirname(fileName))
    try {
        await pfs.writeFile(fileName, JSON.stringify(data), { encoding: "utf8" })
    } catch (error) {
        throw error
    }
}

export const saveTextFile = (fileName, data) => {
    try {
        fs.writeFileSync(fileName, data, { encoding: "utf8" })
    } catch (error) {
        throw error
    }
}

export const readTextFile = fileName => {
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

export const readJson = fileName => JSON.parse(readTextFile(fileName))

/**
 * Check fetch status (see {@link https://developers.google.com/web/updates/2015/03/introduction-to-fetch})
 * @param {Object} response - fetch response
 * @return {Promise<Object>} Resolved or rejected promise
 */
export function checkFetchStatus(response) {
    // noinspection MagicNumberJS
    if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response)
    }

    return Promise.reject(new Error(response.statusText))
}

/**
 * Get json from fetch response
 * @function
 * @param {Object} response - fetch response
 * @return {Object} json
 */
export const getJsonFromFetch = response => response.json()

/**
 * Get text from fetch response
 * @function
 * @param {Object} response - fetch response
 * @return {Object} String
 */
export const getTextFromFetch = response => response.text()

/**
 * Write error to console
 * @function
 * @param {String} error - Error message
 * @return {void}
 */
export const putFetchError = error => {
    console.error("Request failed -->", error)
}

/**
 * Test if object is empty
 * @param {Object} obj - Object
 * @return {Boolean} True if object is empty
 */
export function isEmpty(obj) {
    return Object.getOwnPropertyNames(obj).length === 0 && obj.constructor === Object
}

/**
 * Convert radians to correctionValueDegrees (see {@link http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/})
 * @function
 * @param {Number} radians - Radians
 * @return {Number} Degrees
 */
Math.radiansToDegrees = radians => (radians * degreesHalfCircle) / Math.PI

/**
 * @typedef {number[]} Point
 * @property {number} 0 - X coordinate
 * @property {number} 1 - Y coordinate
 */

/**
 * Calculate the angle in correctionValueDegrees between two points
 * @see https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
 * @function
 * @param {Point} centerPt - Center point
 * @param {Point} targetPt - Target point
 * @return {Number} Degrees between centerPt and targetPt
 */
export const rotationAngleInDegrees = (centerPt, targetPt) => {
    let theta = Math.atan2(targetPt[1] - centerPt[1], targetPt[0] - centerPt[0])
    theta -= Math.PI / 2
    const degrees = Math.radiansToDegrees(theta)
    return (degrees + degreesFullCircle) % degreesFullCircle
}

/**
 * Calculate the angle in correctionValueDegrees between two points
 * @see https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
 * @function
 * @param {Point} centerPt - Center point
 * @param {Point} targetPt - Target point
 * @return {Number} Degrees between centerPt and targetPt
 */
export const rotationAngleInRadians = (centerPt, targetPt) =>
    Math.atan2(centerPt[1], centerPt[0]) - Math.atan2(targetPt[1], targetPt[0])

/**
 * Calculate the distance between two points
 * @see https://www.mathsisfun.com/algebra/distance-2-points.html
 * @function
 * @param {Point} centerPt - Center point
 * @param {Point} targetPt - Target point
 * @return {Number} Distance between centerPt and targetPt
 */
export const distancePoints = (centerPt, targetPt) =>
    Math.sqrt((centerPt.x - targetPt.x) ** 2 + (centerPt.y - targetPt.y) ** 2)

/**
 * Convert correctionValueDegrees to radians
 * @function
 * @param {Number} degrees - Degrees
 * @return {Number} Radians
 */
export const degreesToRadians = degrees => (Math.PI / degreesHalfCircle) * (degrees - degreesQuarterCircle)

/**
 * {@link https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript}
 * @param {string} string - String
 * @return {string} Uppercased string
 */
export const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1)

/**
 * {@link https://github.com/30-seconds/30-seconds-of-code#round}
 * @param {number} n - number
 * @param {number} d - decimals
 * @return {number} Rounded number
 */
export const round = (n, d = 0) => Number(Math.round(n * 10 ** d) / 10 ** d)

/**
 * Round to thousands* @param {Number} x - Integer
 * @return {Number} Rounded input
 */
export const roundToThousands = x => round(x, 3)

/**
 * Group by
 * {@link https://stackoverflow.com/a/38327540
 * @param {*} list - list
 * @param {*} keyGetter - key getter
 * @return {Map<any, any>} Map
 */
export function groupToMap(list, keyGetter) {
    const map = new Map()
    list.forEach(item => {
        const key = keyGetter(item)
        const collection = map.get(key)
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
 * @param {Number} start - Start index
 * @param {Number} end - End index
 * @returns {Number[]} Result
 */
export const range = (start, end) => [...new Array(1 + end - start).keys()].map(v => start + v)

/**
 * Calculate the k distance between two svg coordinates
 * @function
 * @param {Point} pt0 - First point
 * @param {Point} pt1 - Second point
 * @return {Number} Distance between Pt0 and Pt1 in k
 */
export function getDistance(pt0, pt1) {
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
 * @param {string} a - String a
 * @param {string} b - String b
 * @return {number} Sort result
 */
export const simpleSort = (a, b) => a.localeCompare(b)

/**
 * Sort of Id a and b as numbers
 * @param {string} a - String a
 * @param {string} b - String b
 * @return {number} Sort result
 */
export const sortId = ({ Id: a }, { Id: b }) => Number(a) - Number(b)

/**
 * Sort by a list of properties (in left-to-right order)
 * @param {string[]} properties - Sort properties
 * @return {function(*, *): number} Sort function
 */
export const sortBy = properties => (a, b) => {
    let r = 0
    properties.some(property => {
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
 * @param {number} n - Integer
 * @param {boolean} sup - True if superscript tags needed
 * @return {String} Formatted Ordinal
 */
export function getOrdinal(n, sup = true) {
    const s = ["th", "st", "nd", "rd"]
    // noinspection MagicNumberJS
    const v = n % 100
    // noinspection MagicNumberJS
    const text = s[(v - 20) % 10] || s[v] || s[0]
    return n + (sup ? `<span class="super">${text}</span>` : `${text}`)
}

/**
 * Clean API name
 * @param {string} name - Name
 * @return {string} Cleaned name
 */
export const cleanName = name =>
    name
        .replace(/u([\da-f]{4})/gi, match => String.fromCharCode(parseInt(match.replace(/u/g, ""), 16)))
        .replace(/'/g, "’")
        .replace(" oak", " Oak")
        .replace(" (S)", "\u202F(S)")
        .trim()

/**
 * Find Nation object based on nation name
 * @param {string} nationName
 * @return {Nation}
 */
export const findNationByName = nationName => nations.find(nation => nationName === nation.name)

/**
 * Find Nation object based on nation short name
 * @param {string} nationShortName
 * @return {Nation}
 */
export const findNationByNationShortName = nationShortName => nations.find(nation => nation.short === nationShortName)

/**
 * Find Nation object based on nation id
 * @param {number} nationId
 * @return {Nation}
 */
export const findNationById = nationId => nations.find(nation => nationId === nation.id)
