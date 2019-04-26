/**
 * This file is part of na-map.
 *
 * @file      Common data and functions.
 * @module    common
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";
import { html } from "lit-html";
import Hashids from "hashids";
import { default as Tablesort } from "tablesort";

import { distancePoints, sortBy } from "./util";

const transformMatrix = {
    A: -0.00499866779363828,
    B: -0.00000021464254980645,
    C: 4096.88635151897,
    D: 4096.90282787469
};
const transformMatrixInv = {
    A: -200.053302087577,
    B: -0.00859027897636011,
    C: 819630.836437126,
    D: -819563.745651571
};

// F11 coord to svg coord
export const convertCoordX = (x, y) => transformMatrix.A * x + transformMatrix.B * y + transformMatrix.C;

// F11 coord to svg coord
export const convertCoordY = (x, y) => transformMatrix.B * x - transformMatrix.A * y + transformMatrix.D;

// svg coord to F11 coord
export const convertInvCoordX = (x, y) => transformMatrixInv.A * x + transformMatrixInv.B * y + transformMatrixInv.C;

// svg coord to F11 coord
export const convertInvCoordY = (x, y) => transformMatrixInv.B * x - transformMatrixInv.A * y + transformMatrixInv.D;

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
].sort(sortBy(["sortName"]));

export const defaultFontSize = 16;
export const defaultCircleSize = 16;
export const speedFactor = 390;

/**
 * Calculate the k distance between two svg coordinates
 * @function
 * @param {Point} pt0 - First point
 * @param {Point} pt1 - Second point
 * @return {Number} Distance between Pt0 and Pt1 in k
 */
export function getDistance(pt0, pt1) {
    const F11_0 = {
        x: convertInvCoordX(pt0.x, pt0.y),
        y: convertInvCoordY(pt0.x, pt0.y)
    };
    const F11_1 = {
        x: convertInvCoordX(pt1.x, pt1.y),
        y: convertInvCoordY(pt1.x, pt1.y)
    };

    return distancePoints(F11_0, F11_1) / (2.63 * speedFactor);
}

/**
 * Insert bootstrap modal
 * @function
 * @param {string} id - Modal id
 * @param {string} title - Modal title
 * @param {string} size - "lg" when modal should be large (default)
 * @param {string} buttonText - button text (default "Close")
 * @return {void}
 */
export function insertBaseModal(id, title, size = "xl", buttonText = "Close") {
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
    header
        .append("h5")
        .attr("class", "modal-title")
        .attr("id", `title-${id}`)
        .html(title);

    content.append("div").attr("class", "modal-body");

    const footer = content.append("footer").attr("class", "modal-footer");
    footer
        .append("button")
        .text(buttonText)
        .attr("type", "button")
        .attr("class", "btn btn-secondary")
        .attr("data-dismiss", "modal");
}

/**
 * Enable nested dropdowns in navbar
 * @link https://github.com/bootstrapthemesco/bootstrap-4-multi-dropdown-navbar
 * @param {string} id - nav-item id
 * @return {void}
 */
export function initMultiDropdownNavbar(id) {
    $(`#${id} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click", event => {
        const element = $(event.currentTarget);
        element.next(".dropdown-menu").toggleClass("show");
        element.parent("li").toggleClass("show");
        element.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown", event2 => {
            $(event2.currentTarget)
                .find(".dropdown-menu.show")
                .not(".inner")
                .removeClass("show");
        });

        return false;
    });

    $(`#${id} div.dropdown.bootstrap-select`).on("hidden", event => {
        // hide any open menus when parent closes
        $(event.currentTarget)
            .find(".dropdown-menu.show")
            .not(".inner")
            .removeClass("show");
    });
}

export const initTablesort = () => {
    const cleanNumber = i => i.replace(/[^\-?0-9.]/g, "");
    const compareNumber = (a, b) => {
        let aa = parseFloat(a);
        let bb = parseFloat(b);

        aa = Number.isNaN(aa) ? 0 : aa;
        bb = Number.isNaN(bb) ? 0 : bb;

        return aa - bb;
    };

    Tablesort.extend(
        "number",
        item =>
            item.match(/^[-+]?[£\u0024Û¢´€]?\d+\s*([,.]\d{0,2})/) || // Prefixed currency
            item.match(/^[-+]?\d+\s*([,.]\d{0,2})?[£\u0024Û¢´€]/) || // Suffixed currency
            item.match(/^[-+]?(\d)*-?([,.])?-?(\d)+([E,e][-+][\d]+)?%?$/), // Number
        (a, b) => {
            const aa = cleanNumber(a);
            const bb = cleanNumber(b);

            return compareNumber(bb, aa);
        }
    );
};

export const insertBaseModalHTML = (id, title, getModalBody, size = "xl", buttonText = "Close") => {
    const modalSize = size === "xl" || size === "lg" || size === "sm" ? ` modal-${size}` : "";

    return html`
        <div id="${id}" class="modal" tabindex="-1" role="dialog" aria-labelledby="title-${id}" aria-hidden="true">
            <div class="modal-dialog${modalSize}" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 id="title-${id}" class="modal-title">
                            ${title}
                        </h5>
                    </div>
                    <div class="modal-body">${getModalBody()}</div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const colourList = [
    "#e7a800",
    "#e621dd",
    "#d3e700",
    "#de78ff",
    "#01d36b",
    "#ff3205",
    "#4df3ff",
    "#910016",
    "#01caf0",
    "#ad0054",
    "#c8ff9f",
    "#0143a8",
    "#00a97f",
    "#70a4ff",
    "#312800",
    "#ffa29f"
];

/**
 * Get currency
 * @param {int|string} amount - Amount
 * @return {string} Currency string
 */
export const getCurrencyAmount = amount => `${amount}\u00A0real${Number(amount) > 1 ? "s" : ""}`;

export const hashids = new Hashids("My salt: Yet another Naval Action map");

// eslint-disable-next-line no-undef
export const appName = NAME;
// eslint-disable-next-line no-undef
export const appDescription = DESCRIPTION;
// eslint-disable-next-line no-undef
export const appTitle = TITLE;
// eslint-disable-next-line no-undef
export const appVersion = VERSION;

export const speedConstA = 0.074465523706782;
export const speedConstB = 0.00272175949231;

export const circleRadiusFactor = 5;

const secondsForFullCircle = 48 * 60 + 55;
export const fullCircle = 360;
export const degreesPerSecond = fullCircle / secondsForFullCircle;

// eslint-disable-next-line no-undef
export const colourGreen = CGREEN;
// eslint-disable-next-line no-undef
export const colourGreenLight = CGREENLIGHT;
// eslint-disable-next-line no-undef
export const colourGreenDark = CGREENDARK;
// eslint-disable-next-line no-undef
export const colourRed = CRED;
// eslint-disable-next-line no-undef
export const colourRedLight = CREDLIGHT;
// eslint-disable-next-line no-undef
export const colourRedDark = CREDDARK;
// eslint-disable-next-line no-undef
export const colourWhite = CWHITE;
// eslint-disable-next-line no-undef
export const primary300 = CPRIMARY300;
// eslint-disable-next-line no-undef
export const iconSmallSrc = ICONSMALL;

// eslint-disable-next-line no-undef
export const hullRepairsFactor = REPAIR_ARMOR_VOLUME / REPAIR_ARMOR_PERCENT;
// eslint-disable-next-line no-undef
export const hullRepairsPercent = REPAIR_ARMOR_PERCENT;
// eslint-disable-next-line no-undef
export const rigRepairsFactor = REPAIR_SAIL_VOLUME / REPAIR_SAIL_PERCENT;
// eslint-disable-next-line no-undef
export const rigRepairsPercent = REPAIR_SAIL_PERCENT;
// eslint-disable-next-line no-undef
export const rumRepairsFactor = REPAIR_CREW_VOLUME / REPAIR_CREW_PERCENT;
// eslint-disable-next-line no-undef
export const rumRepairsPercent = REPAIR_CREW_PERCENT;
