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
import { degreesFullCircle } from "./common-math";
export const appDescription = DESCRIPTION;
export const appName = NAME;
export const appTitle = TITLE;
export const appVersion = VERSION;
export const colourGreen = CGREEN;
export const colourGreenDark = CGREENDARK;
export const colourGreenLight = CGREENLIGHT;
export const colourRed = CRED;
export const colourRedDark = CREDDARK;
export const colourRedLight = CREDLIGHT;
export const colourWhite = CWHITE;
export const iconSmallSrc = ICONSMALL;
export const primary300 = CPRIMARY300;
export const numberSegments = 24;
export const segmentRadians = (2 * Math.PI) / numberSegments;
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
export const insertBaseModal = ({ id, title, size = "modal-xl", buttonText = "Close" }) => {
    const modal = d3Select("#modal-section")
        .append("div")
        .attr("id", id)
        .attr("class", "modal")
        .attr("tabindex", "-1")
        .attr("role", "dialog")
        .attr("aria-labelledby", `title-${id}`)
        .attr("aria-hidden", "true")
        .append("div")
        .attr("class", `modal-dialog ${size}`)
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
export const pluralise = (number, word) => `${number} ${word + (number === 1 ? "" : "s")}`;
export const loadJsonFiles = async (dataSources, readData) => {
    for await (const dataSource of dataSources) {
        readData[dataSource.name] = await loadJsonFile(dataSource.fileName);
    }
};
class FetchError extends Error {
    constructor(response) {
        super(`${response.url} ${response.statusText} (status ${response.status})`);
        this.name = "Fetch error";
        this.response = response;
    }
}
const dataDirectory = "data";
export const loadJsonFile = async (fileName) => {
    const response = await fetch(`${dataDirectory}/${fileName}`);
    if (!response.ok) {
        throw new FetchError(response);
    }
    return response.json();
};
//# sourceMappingURL=common-browser.js.map