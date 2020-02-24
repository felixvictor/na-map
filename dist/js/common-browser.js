import { select as d3Select } from "d3-selection";
import Hashids from "hashids";
import { html } from "lit-html";
import { default as Tablesort } from "tablesort";
import { degreesFullCircle } from "./common";
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
export const hullRepairsPercent = REPAIR_ARMOR_PERCENT;
export const hullRepairsVolume = REPAIR_ARMOR_VOLUME;
export const iconSmallSrc = ICONSMALL;
export const primary300 = CPRIMARY300;
export const repairTime = REPAIR_ARMOR_TIME;
export const rigRepairsPercent = REPAIR_SAIL_PERCENT;
export const rigRepairsVolume = REPAIR_SAIL_VOLUME;
export const rumRepairsPercent = REPAIR_CREW_PERCENT;
export const rumRepairsVolume = REPAIR_CREW_VOLUME;
export const hashids = new Hashids("My salt: Yet another Naval Action map");
export const numberSegments = 24;
export const segmentRadians = (2 * Math.PI) / numberSegments;
export const rumRepairsFactor = Number(rumRepairsPercent) / Number(rumRepairsVolume);
export const repairsSetSize = 5;
export const circleRadiusFactor = 5;
const secondsForFullCircle = 2935;
export const degreesPerSecond = degreesFullCircle / secondsForFullCircle;
export const colourList = [
    "#48355d",
    "#8bcb19",
    "#003dc5",
    "#01c071",
    "#ff12c8",
    "#93c590",
    "#000776",
    "#b66e00",
    "#63a6ff",
    "#984b00",
    "#acb7ea",
    "#99001b",
    "#dfb16a",
    "#4f0017",
    "#ff7a6b",
    "#422b00",
    "#6f2400"
];
export const insertBaseModal = (id, title, size = "xl", buttonText = "Close") => {
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
};
export const initMultiDropdownNavbar = (id) => {
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
        $(event.currentTarget)
            .find(".dropdown-menu.show")
            .not(".inner")
            .removeClass("show");
    });
};
const cleanNumber = (i) => i.replace(/[^\d-.?]/g, "");
const compareNumber = (a, b) => {
    let aa = parseFloat(a);
    let bb = parseFloat(b);
    aa = Number.isNaN(aa) ? 0 : aa;
    bb = Number.isNaN(bb) ? 0 : bb;
    return aa - bb;
};
export const initTablesort = () => {
    Tablesort.extend("number", (item) => item.match(/^[+-]?[$¢£´Û€]?\d+\s*([,.]\d{0,2})/) ||
        item.match(/^[+-]?\d+\s*([,.]\d{0,2})?[$¢£´Û€]/) ||
        item.match(/^[+-]?(\d)*-?([,.])?-?(\d)+([,Ee][+-]\d+)?%?$/), (a, b) => {
        const aa = cleanNumber(a);
        const bb = cleanNumber(b);
        return compareNumber(bb, aa);
    });
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
