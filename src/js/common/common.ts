/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions.
 * @module    src/node/common
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { ArrayIndex } from "./interface"

export const woodFamily = ["regular", "seasoned", "exceptional"]!
export type WoodFamily = typeof woodFamily[number]

export const woodType = ["frame", "trim"]!
export type WoodType = typeof woodType[number]
export type WoodTypeList<T> = {
    [K in WoodType]: T
}
export type WoodTypeArray<T> = {
    [K in WoodType]: T[]
}
export type WoodTypeNestedArray<T> = {
    [K1 in WoodType]: ArrayIndex<T>
}

export const cannonType = ["medium", "long", "carronade"]!
export type CannonType = typeof cannonType[number]
export type CannonTypeList<T> = {
    [K in CannonType]: T
}
export type CannonFamily = string
export const cannonFamilyList: Record<CannonType, CannonFamily[]> = {
    medium: ["regular", "congreve", "defense", "edinorog"],
    long: ["regular", "navy", "blomefield"],
    carronade: ["regular", "obusiers"],
}
export const cannonEntityType = ["name", "family", "damage", "generic", "penetration"]!
export type CannonEntityType = typeof cannonEntityType[number]
export const peneDistance = [50, 100, 200, 300, 400, 500, 750, 1000, 1250, 1500]
export type PeneDistance = typeof peneDistance[number]

export interface Nation {
    id: number
    short: NationShortName // Short name
    name: NationFullName // Name
    sortName: string // Name for sorting
}

export const nationShortName = ["CN", "DE", "DK", "ES", "FR", "FT", "GB", "NT", "PL", "PR", "RU", "SE", "US", "VP"]!
export type NationShortName = typeof nationShortName[number]
export const nationShortNameAlternative = [
    "CNa",
    "DEa",
    "DKa",
    "ESa",
    "FRa",
    "FTa",
    "GBa",
    "NTa",
    "PLa",
    "PRa",
    "RUa",
    "SEa",
    "USa",
    "VPa",
]!
export type NationShortNameAlternative = typeof nationShortNameAlternative[number]

export const nationFullName = [
    "China",
    "Commonwealth of Poland",
    "Danmark-Norge",
    "España",
    "France",
    "Free Town",
    "Great Britain",
    "Kingdom of Prussia",
    "Neutral",
    "Pirates",
    "Russian Empire",
    "Sverige",
    "United States",
    "Verenigde Provinciën",
]!
export type NationFullName = typeof nationFullName[number]
export const nations: Nation[] = [
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
    { id: 12, short: "PL", name: "Commonwealth of Poland", sortName: "Poland" },
    { id: 13, short: "CN", name: "China", sortName: "China" },
]
const nationMap = new Map<number, Nation>(nations.map((nation) => [nation.id, nation]))

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
    ["Santiago de Cuba", "Ciudad de Cuba"],
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
    ["Wilmington", "North Carolina"],
])

export const validNationShortName = (nationShortName: string): boolean =>
    nations.some((nation) => nation.short === nationShortName)

/**
 * Test if object is empty
 * {@link https://stackoverflow.com/a/32108184}
 * @param   object - Object
 * @returns True if object is empty
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const isEmpty = (object: object): boolean =>
    Object.getOwnPropertyNames(object).length === 0 && object.constructor === Object

/**
 * {@link https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript}
 * @param   string - String
 * @returns Uppercased string
 */
export const capitalizeFirstLetter = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1)

/**
 * Create array with numbers ranging from start to end
 * {@link https://stackoverflow.com/questions/36947847/how-to-generate-range-of-numbers-from-0-to-n-in-es2015-only/36953272}
 */
export const range = (
    start: number, // Start index
    end: number // End index
): number[] => [...new Array(1 + end - start).keys()].map((v) => start + v)

/**
 * Find Nation object based on nation name
 */
export const findNationByName = (nationName: string): Nation | undefined =>
    nations.find((nation) => nationName === nation.name)

/**
 * Find Nation object based on nation short name
 */
export const findNationByNationShortName = (nationShortName: string): Nation | undefined =>
    nations.find((nation) => nation.short === nationShortName)

/**
 * Find Nation object based on nation id
 */
export const findNationById = (nationId: number): Nation => nationMap.get(nationId)!

/**
 * Write fetch error to console
 * @param error - Error message
 */
export const putImportError = (error: string): void => {
    console.error("Import request failed -->", error)
}
