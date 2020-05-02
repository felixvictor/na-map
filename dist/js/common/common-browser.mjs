/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for browser.
 * @module    src/node/common-browser
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { select as d3Select } from "d3-selection";
import Hashids from "hashids";
import { html } from "lit-html";
import { default as Tablesort } from "tablesort";
import { degreesFullCircle } from "./common-math";
export const appDescription = DESCRIPTION;
export const appName = NAME;
export const appTitle = TITLE;
export const appVersion = VERSION;
export const colourGreen = CGREEN;
export const colourGreenDark = CGREENDARK;
export const colourGreenLight = CGREENLIGHT;
export const colourOrange = CORANGE;
export const colourRed = CRED;
export const colourRedDark = CREDDARK;
export const colourRedLight = CREDLIGHT;
export const colourWhite = CWHITE;
export const hullRepairsPercent = Number(REPAIR_ARMOR_PERCENT);
export const hullRepairsVolume = Number(REPAIR_ARMOR_VOLUME);
export const iconSmallSrc = ICONSMALL;
export const primary300 = CPRIMARY300;
export const repairTime = Number(REPAIR_ARMOR_TIME);
export const rigRepairsPercent = Number(REPAIR_SAIL_PERCENT);
export const rigRepairsVolume = Number(REPAIR_SAIL_VOLUME);
export const rumRepairsPercent = Number(REPAIR_CREW_PERCENT);
export const rumRepairsVolume = Number(REPAIR_CREW_VOLUME);
export const hashids = new Hashids("My salt: Yet another Naval Action map");
export const numberSegments = 24;
export const segmentRadians = (2 * Math.PI) / numberSegments;
export const rumRepairsFactor = Number(rumRepairsPercent) / Number(rumRepairsVolume);
export const repairsSetSize = 5;
export const circleRadiusFactor = 5;
const secondsForFullCircle = 2935;
export const degreesPerSecond = degreesFullCircle / secondsForFullCircle;
export const colourList = [
    "#f23d3d",
    "#806060",
    "#8c3f23",
    "#f2c6b6",
    "#bf7c30",
    "#ffd580",
    "#403a30",
    "#73621d",
    "#9da67c",
    "#ace639",
    "#165916",
    "#b6f2be",
    "#39e67e",
    "#30bfb6",
    "#0d3330",
    "#5395a6",
    "#3db6f2",
    "#397ee6",
    "#334766",
    "#404080",
    "#c6b6f2",
    "#7033cc",
    "#39134d",
    "#e63df2",
    "#40303d",
    "#f279ca",
    "#802053",
    "#d93662",
    "#330d12",
    "#f2b6be",
];
export const initMultiDropdownNavbar = (id) => {
    $(`#${id} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click", (event) => {
        const element = $(event.currentTarget);
        element.next(".dropdown-menu").toggleClass("show");
        element.parent("li").toggleClass("show");
        element.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown", (event2) => {
            $(event2.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show");
        });
        return false;
    });
    $(`#${id} div.dropdown.bootstrap-select`).on("hidden", (event) => {
        $(event.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show");
    });
};
const cleanNumber = (i) => i.replace(/[^\d-.?]/g, "");
const compareNumber = (a, b) => {
    let aa = Number.parseFloat(a);
    let bb = Number.parseFloat(b);
    aa = Number.isNaN(aa) ? 0 : aa;
    bb = Number.isNaN(bb) ? 0 : bb;
    return aa - bb;
};
export const initTablesort = () => {
    Tablesort.extend("number", (item) => { var _a, _b; return (_b = (_a = /^[+-]?[$¢£´Û€]?\d+\s*([,.]\d{0,2})/.exec(item)) !== null && _a !== void 0 ? _a : /^[+-]?\d+\s*([,.]\d{0,2})?[$¢£´Û€]/.exec(item)) !== null && _b !== void 0 ? _b : /^[+-]?(\d)*-?([,.])?-?(\d)+([,Ee][+-]\d+)?%?$/.exec(item); }, (a, b) => {
        const aa = cleanNumber(a);
        const bb = cleanNumber(b);
        return compareNumber(bb, aa);
    });
};
export const insertBaseModal = ({ id, title, size = "xl", buttonText = "Close" }) => {
    const modal = d3Select("#modal-section")
        .append("div")
        .attr("id", id)
        .attr("class", "modal")
        .attr("tabindex", "-1")
        .attr("role", "dialog")
        .attr("aria-labelledby", `title-${id}`)
        .attr("aria-hidden", "true")
        .append("div")
        .attr("class", `modal-dialog${size === "xl" || size === "lg" || size === "sm" ? ` modal-${size}` : ""}`)
        .attr("role", "document");
    const content = modal.append("div").attr("class", "modal-content");
    const header = content.append("header").attr("class", "modal-header");
    header.append("h5").attr("class", "modal-title").attr("id", `title-${id}`).html(title);
    content.append("div").attr("class", "modal-body");
    const footer = content.append("footer").attr("class", "modal-footer");
    footer
        .append("button")
        .text(buttonText)
        .attr("type", "button")
        .attr("class", "btn btn-secondary")
        .attr("data-dismiss", "modal");
};
export const insertBaseModalHTML = ({ id, title, size = "xl", body, footer }) => {
    const modalSize = size === "xl" || size === "lg" || size === "sm" ? ` modal-${size}` : "";
    return html `
        <div id="${id}" class="modal" tabindex="-1" role="dialog" aria-labelledby="title-${id}" aria-hidden="true">
            <div class="modal-dialog${modalSize}" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 id="title-${id}" class="modal-title">
                            ${title}
                        </h5>
                    </div>
                    <div class="modal-body">${body()}</div>
                    <div class="modal-footer">
                        ${footer()}
                    </div>
                </div>
            </div>
        </div>
    `;
};
export const getCurrencyAmount = (amount) => `${amount}\u00A0real${Number(amount) > 1 ? "s" : ""}`;
//# sourceMappingURL=common-browser.js.map