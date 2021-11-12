/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions.
 * @module    src/node/common
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
dayjs.extend(customParseFormat);
dayjs.extend(utc);
import { serverMaintenanceHour } from "./common-var";
export const cannonType = ["medium", "long", "carronade"];
export const cannonFamilyList = {
    medium: ["regular", "congreve", "defense", "edinorog"],
    long: ["regular", "navy", "blomefield"],
    carronade: ["regular", "obusiers"],
};
export const cannonEntityType = ["name", "family", "damage", "generic", "penetration"];
export const peneDistance = [50, 100, 200, 300, 400, 500, 750, 1000, 1250, 1500];
export const nationShortName = ["CN", "DE", "DK", "ES", "FR", "FT", "GB", "NT", "PL", "PR", "RU", "SE", "US", "VP"];
const portBattleNationShortName = [...nationShortName, ""];
const attackerNationShortName = [...portBattleNationShortName, "n/a"];
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
];
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
];
export const nations = [
    { id: 0, short: "NT", name: "Neutral", sortName: "Neutral", colours: ["#cec1c1"] },
    { id: 1, short: "PR", name: "Pirates", sortName: "Pirates", colours: ["#352828", "#cec1c1"] },
    { id: 2, short: "ES", name: "España", sortName: "España", colours: ["#9b3438", "#c5a528"] },
    { id: 3, short: "FR", name: "France", sortName: "France", colours: ["#284e98", "#b5423a", "#cec1c1"] },
    {
        id: 4,
        short: "GB",
        name: "Great Britain",
        sortName: "Great Britain",
        colours: ["#284180", "#cec1c1", "#b13443"],
    },
    {
        id: 5,
        short: "VP",
        name: "Verenigde Provinciën",
        sortName: "Verenigde Provinciën",
        colours: ["#9d3841", "#3b5688", "#cec1c1"],
    },
    { id: 6, short: "DK", name: "Danmark-Norge", sortName: "Danmark-Norge", colours: ["#9c294b", "#cec1c1"] },
    { id: 7, short: "SE", name: "Sverige", sortName: "Sverige", colours: ["#287099", "#cdad28"] },
    {
        id: 8,
        short: "US",
        name: "United States",
        sortName: "United States",
        colours: ["#282873", "#cec1c1", "#a72e47"],
    },
    { id: 9, short: "FT", name: "Free Town", sortName: "Free Town", colours: ["#cec1c1"] },
    { id: 10, short: "RU", name: "Russian Empire", sortName: "Russian Empire", colours: ["#284e98", "#cec1c1"] },
    { id: 11, short: "DE", name: "Kingdom of Prussia", sortName: "Prussia", colours: ["#352828", "#cec1c1"] },
    { id: 12, short: "PL", name: "Commonwealth of Poland", sortName: "Poland", colours: ["#c22839", "#cec1c1"] },
    { id: 13, short: "CN", name: "China", sortName: "China", colours: ["#cdad3b", "#ce2828"] },
];
export const nationColourList = [];
const nationMap = new Map(nations.map((nation) => [nation.id, nation]));
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
]);
export const validNationShortName = (nationShortName) => nations.some((nation) => nation.short === nationShortName);
export const isEmpty = (object) => object !== undefined && Object.getOwnPropertyNames(object).length === 0;
export const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);
export const range = (start, end) => Array.from({ length: 1 + end - start }, (_, i) => start + i);
export const findNationByName = (nationName) => nations.find((nation) => nationName === nation.name);
export const findNationByNationShortName = (nationShortName) => nations.find((nation) => nation.short === nationShortName);
export const findNationById = (nationId) => nationMap.get(nationId);
export const putImportError = (error) => {
    console.error("Import request failed -->", error);
};
export class TupleKeyMap extends Map {
    map = new Map();
    set(key, value) {
        this.map.set(JSON.stringify(key), value);
        return this;
    }
    get(key) {
        return this.map.get(JSON.stringify(key));
    }
    clear() {
        this.map.clear();
    }
    delete(key) {
        return this.map.delete(JSON.stringify(key));
    }
    has(key) {
        return this.map.has(JSON.stringify(key));
    }
    get size() {
        return this.map.size;
    }
    forEach(callbackfn, thisArg) {
        for (const [key, value] of this.map.entries()) {
            callbackfn.call(thisArg, value, JSON.parse(key), this);
        }
    }
}
export const sleep = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
const getServerStartDateTime = (day) => {
    let serverStart = dayjs().utc().hour(serverMaintenanceHour).minute(0).second(0);
    const now = dayjs().utc();
    if ((day < 0 && now.isBefore(serverStart)) || (day > 0 && now.isAfter(serverStart))) {
        serverStart = dayjs.utc(serverStart).add(day, "day");
    }
    return serverStart;
};
export const getCurrentServerStart = () => getServerStartDateTime(-1);
export const getNextServerStart = () => getServerStartDateTime(1);
export const currentServerStartDateTime = getCurrentServerStart().format("YYYY-MM-DD HH:mm");
export const currentServerStartDate = getCurrentServerStart().format("YYYY-MM-DD");
export const currentServerDateYear = String(dayjs(currentServerStartDate).year());
export const currentServerDateMonth = String(dayjs(currentServerStartDate).month() + 1).padStart(2, "0");
export const getBaseId = (title) => title.toLocaleLowerCase().replaceAll(" ", "-").replaceAll("’", "");
export const sortBy = (propertyNames) => (a, b) => {
    let r = 0;
    propertyNames.some((propertyName) => {
        let sign = 1;
        if (String(propertyName).startsWith("-")) {
            sign = -1;
            propertyName = String(propertyName).slice(1);
        }
        if (Number.isNaN(Number(a[propertyName])) && Number.isNaN(Number(b[propertyName]))) {
            r = String(a[propertyName]).localeCompare(String(b[propertyName])) * sign;
        }
        else {
            r = (Number(a[propertyName]) - Number(b[propertyName])) * sign;
        }
        return r !== 0;
    });
    return r;
};
export const simpleStringSort = (a, b) => a && b ? a.localeCompare(b) : 0;
//# sourceMappingURL=common.js.map