/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-node
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import path from "path";
import { getCommonPaths } from "./common-dir";
import { capitalizeFirstLetter, currentServerDateMonth, currentServerDateYear } from "./common";
export const cleanName = (name) => name
    .replace(/u([\da-f]{4})/gi, (match) => String.fromCharCode(Number.parseInt(match.replace(/u/g, ""), 16)))
    .replace(/'/g, "’")
    .replace(" oak", " Oak")
    .replace(" (S)", "\u202F(S)")
    .trim();
export const cleanItemName = (name) => capitalizeFirstLetter(cleanName(name).toLocaleLowerCase().replace("east indian", "East Indian"));
export const simpleNumberSort = (a, b) => (a && b ? a - b : 0);
export const baseAPIFilename = path.resolve(getCommonPaths().dirAPI, currentServerDateYear, currentServerDateMonth);
//# sourceMappingURL=common-node.js.map