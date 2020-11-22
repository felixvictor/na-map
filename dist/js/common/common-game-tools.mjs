/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for browser.
 * @module    src/node/common-browser
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { color as d3Color, rgb as d3Rgb } from "d3-color";
import Hashids from "hashids";
import htm from "htm";
import { h } from "preact";
import { colourWhite } from "./common-browser";
import { formatInt, formatLocale } from "./common-format";
const html = htm.bind(h);
export const hullRepairsPercent = Number(REPAIR_ARMOR_PERCENT);
export const hullRepairsVolume = Number(REPAIR_ARMOR_VOLUME);
export const repairTime = Number(REPAIR_ARMOR_TIME);
export const rigRepairsPercent = Number(REPAIR_SAIL_PERCENT);
export const rigRepairsVolume = Number(REPAIR_SAIL_VOLUME);
export const rumRepairsPercent = Number(REPAIR_CREW_PERCENT);
export const rumRepairsVolume = Number(REPAIR_CREW_VOLUME);
export const rumRepairsFactor = Number(rumRepairsPercent) / Number(rumRepairsVolume);
export const repairsSetSize = 5;
export const hashids = new Hashids("My salt: Yet another Naval Action map");
const importedFlag = " (i)";
export const isImported = (name) => name.includes(importedFlag);
export const stripShipName = (name) => name.replace(importedFlag, "");
export const beautifyShipName = (name) => stripShipName(name) + (isImported(name) ? ' <span class="caps small">imported</span>' : "");
export const beautifyShipNameHTML = (name) => html `${stripShipName(name)} ${isImported(name) ? html `<span class="caps small">imported</span>` : html ``}`;
export const formatFloatFixedHTML = (x, f = 2) => {
    const [number, decimals] = formatLocale.format(`.${f}f`)(x).split(".");
    let formattedFloat = html `${decimals}`;
    if (decimals) {
        if (decimals === "0" || decimals === "00") {
            formattedFloat = html `<span class="hidden">.${decimals}</span>`;
        }
        else if (decimals.endsWith("0")) {
            formattedFloat = html `.${decimals.replace("0", "")}<span class="hidden">0</span>`;
        }
        else {
            formattedFloat = html `.${decimals}`;
        }
    }
    return html `${number}${formattedFloat}`;
};
export const getBaseModalHTML = ({ id, title, size = "modal-xl", body, footer }) => {
    return html `
        <div id="${id}" class="modal" tabindex="-1" role="dialog" aria-labelledby="title-${id}" aria-hidden="true">
            <div class="modal-dialog ${size}" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 id="title-${id}" class="modal-title">${title}</h5>
                    </div>
                    <div class="modal-body">${body()}</div>
                    <div class="modal-footer">${footer()}</div>
                </div>
            </div>
        </div>
    `;
};
export const getCurrencyAmount = (amount) => `${formatInt(Number(amount))}\u00A0real${Number(amount) > 1 ? "es" : ""}`;
export const getContrastColour = (colour) => {
    const { r, g, b } = d3Rgb(colour);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? d3Color(colourWhite)?.darker(5).toString() ?? "#111" : colourWhite;
};
export const displayClanLitHtml = (clan) => html `<span class="caps">${clan}</span>`;
//# sourceMappingURL=common-game-tools.js.map