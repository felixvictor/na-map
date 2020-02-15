/**
 * This file is part of na-map.
 *
 * @file      Common data and functions for browser.
 * @module    src/node/common-browser
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection"
import Hashids from "hashids"
import { html, TemplateResult } from "lit-html"
import { default as Tablesort } from "tablesort"

import { degreesFullCircle } from "./common"

// noinspection SpellCheckingInspection
declare const CGREEN: string,
    CGREENDARK: string,
    CGREENLIGHT: string,
    CORANGE: string,
    CPRIMARY300: string,
    CRED: string,
    CREDDARK: string,
    CREDLIGHT: string,
    CWHITE: string,
    DESCRIPTION: string,
    NAME: string,
    TITLE: string,
    VERSION: string,
    ICONSMALL: string,
    REPAIR_ARMOR_PERCENT: string,
    REPAIR_ARMOR_TIME: string,
    REPAIR_ARMOR_VOLUME: string,
    REPAIR_CREW_PERCENT: string,
    REPAIR_CREW_VOLUME: string,
    REPAIR_SAIL_PERCENT: string,
    REPAIR_SAIL_VOLUME: string

export const Description = DESCRIPTION
export const Name = NAME
export const Title = TITLE
export const Version = VERSION
export const colourGreen = CGREEN
export const colourGreenDark = CGREENDARK
export const colourGreenLight = CGREENLIGHT
export const colourOrange = CORANGE
export const colourRed = CRED
export const colourRedDark = CREDDARK
export const colourRedLight = CREDLIGHT
export const colourWhite = CWHITE
export const hullRepairsPercent = REPAIR_ARMOR_PERCENT
export const hullRepairsVolume = REPAIR_ARMOR_VOLUME
export const iconSmallSrc = ICONSMALL
export const primary300 = CPRIMARY300
export const repairTime = REPAIR_ARMOR_TIME
export const rigRepairsPercent = REPAIR_SAIL_PERCENT
export const rigRepairsVolume = REPAIR_SAIL_VOLUME
export const rumRepairsPercent = REPAIR_CREW_PERCENT
export const rumRepairsVolume = REPAIR_CREW_VOLUME

export const hashids = new Hashids("My salt: Yet another Naval Action map")

export const circleRadiusFactor = 5
const secondsForFullCircle = 2935 // 48 * 60 + 55
export const degreesPerSecond = degreesFullCircle / secondsForFullCircle

// http://tools.medialab.sciences-po.fr/iwanthue/
// noinspection CssConvertColorToRgbInspection
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
]

/**
 * Insert bootstrap modal
 */
export const insertBaseModal = (
    id: string, // Modal id
    title: string, // Modal id
    size = "xl", // "lg" when modal should be large (default)
    buttonText = "Close" // button text (default "Close")
): void => {
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
        .attr("role", "document")

    const content = modal.append("div").attr("class", "modal-content")

    const header = content.append("header").attr("class", "modal-header")
    header
        .append("h5")
        .attr("class", "modal-title")
        .attr("id", `title-${id}`)
        .html(title)

    content.append("div").attr("class", "modal-body")

    const footer = content.append("footer").attr("class", "modal-footer")
    footer
        .append("button")
        .text(buttonText)
        .attr("type", "button")
        .attr("class", "btn btn-secondary")
        .attr("data-dismiss", "modal")
}

/**
 * Enable nested dropdowns in navbar
 * @link https://github.com/bootstrapthemesco/bootstrap-4-multi-dropdown-navbar
 */
export const initMultiDropdownNavbar = (
    id: string // nav-item id
): void => {
    $(`#${id} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click", event => {
        const element = $(event.currentTarget)
        element.next(".dropdown-menu").toggleClass("show")
        element.parent("li").toggleClass("show")
        element.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown", event2 => {
            $(event2.currentTarget)
                .find(".dropdown-menu.show")
                .not(".inner")
                .removeClass("show")
        })

        return false
    })

    $(`#${id} div.dropdown.bootstrap-select`).on("hidden", event => {
        // hide any open menus when parent closes
        $(event.currentTarget)
            .find(".dropdown-menu.show")
            .not(".inner")
            .removeClass("show")
    })
}

const cleanNumber = (i: string): string => i.replace(/[^\d-.?]/g, "")

const compareNumber = (a: string, b: string): number => {
    let aa = parseFloat(a)
    let bb = parseFloat(b)

    aa = Number.isNaN(aa) ? 0 : aa
    bb = Number.isNaN(bb) ? 0 : bb

    return aa - bb
}

export const initTablesort = (): void => {
    Tablesort.extend(
        "number",
        (item: string) =>
            item.match(/^[+-]?[$¢£´Û€]?\d+\s*([,.]\d{0,2})/) || // Prefixed currency
            item.match(/^[+-]?\d+\s*([,.]\d{0,2})?[$¢£´Û€]/) || // Suffixed currency
            item.match(/^[+-]?(\d)*-?([,.])?-?(\d)+([,Ee][+-]\d+)?%?$/), // Number
        (a: string, b: string) => {
            const aa = cleanNumber(a)
            const bb = cleanNumber(b)

            return compareNumber(bb, aa)
        }
    )
}

export const insertBaseModalHTML = ({
    id,
    title,
    size = "xl",
    body,
    footer
}: {
    id: string
    title: string
    size: string
    body: () => {}
    footer: () => {}
}): TemplateResult => {
    const modalSize = size === "xl" || size === "lg" || size === "sm" ? ` modal-${size}` : ""

    return html`
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
    `
}

/**
 * Get formatted currency string
 */
export const getCurrencyAmount = (amount: number | string): string =>
    `${amount}\u00A0real${Number(amount) > 1 ? "s" : ""}`
