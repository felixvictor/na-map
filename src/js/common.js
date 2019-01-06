/*
    common.js
 */

import { select as d3Select } from "d3-selection";
import { distancePoints } from "./util";

const transformMatrix = {
        A: -0.00499866779363828,
        B: -0.00000021464254980645,
        C: 4096.88635151897,
        D: 4096.90282787469
    },
    transformMatrixInv = {
        A: -200.053302087577,
        B: -0.00859027897636011,
        C: 819630.836437126,
        D: -819563.745651571
    };

// ShowF11 coord to svg coord
export const convertCoordX = (x, y) => transformMatrix.A * x + transformMatrix.B * y + transformMatrix.C;

// ShowF11 coord to svg coord
export const convertCoordY = (x, y) => transformMatrix.B * x - transformMatrix.A * y + transformMatrix.D;

// svg coord to ShowF11 coord
export const convertInvCoordX = (x, y) => transformMatrixInv.A * x + transformMatrixInv.B * y + transformMatrixInv.C;

// svg coord to ShowF11 coord
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
];

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
        },
        F11_1 = {
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
export function insertBaseModal(id, title, size = "lg", buttonText = "Close") {
    const modal = d3Select("#modal-section")
        .append("div")
        .attr("id", id)
        .attr("class", "modal")
        .attr("tabindex", "-1")
        .attr("role", "dialog")
        .attr("aria-labelledby", `title-${id}`)
        .attr("aria-hidden", "true")
        .append("div")
        .attr("class", `modal-dialog${size === "lg" || size === "sm" ? ` modal-${size}` : ""}`)
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
        const el$ = $(event.currentTarget);
        el$.next(".dropdown-menu").toggleClass("show");
        el$.parent("li").toggleClass("show");
        el$.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown", event2 => {
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

/**
 * Get currency
 * @param {int|string }amount - Amount
 * @return {string} Currency string
 */
export const getCurrencyAmount = amount => `${amount}\u00a0real${+amount > 1 ? "s" : ""}`;

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

export const colourGray200 = CGRAY200;
export const colourGray500 = CGRAY500;
export const colourGray700 = CGRAY700;
export const colourGreen = CGREEN;
export const colourGreenDark = CGREENDARK;
export const colourRed = CRED;
export const colourRedDark = CREDDARK;
export const colourWhite = CWHITE;
