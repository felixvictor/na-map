/*!
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

import { degreesFullCircle } from "./common-math"

// noinspection SpellCheckingInspection
// eslint-disable-next-line one-var
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

export const appDescription = DESCRIPTION
export const appName = NAME
export const appTitle = TITLE
export const appVersion = VERSION
export const colourGreen = CGREEN
export const colourGreenDark = CGREENDARK
export const colourGreenLight = CGREENLIGHT
export const colourOrange = CORANGE
export const colourRed = CRED
export const colourRedDark = CREDDARK
export const colourRedLight = CREDLIGHT
export const colourWhite = CWHITE
export const hullRepairsPercent = Number(REPAIR_ARMOR_PERCENT)
export const hullRepairsVolume = Number(REPAIR_ARMOR_VOLUME)
export const iconSmallSrc = ICONSMALL
export const primary300 = CPRIMARY300
export const repairTime = Number(REPAIR_ARMOR_TIME)
export const rigRepairsPercent = Number(REPAIR_SAIL_PERCENT)
export const rigRepairsVolume = Number(REPAIR_SAIL_VOLUME)
export const rumRepairsPercent = Number(REPAIR_CREW_PERCENT)
export const rumRepairsVolume = Number(REPAIR_CREW_VOLUME)

export const hashids = new Hashids("My salt: Yet another Naval Action map")

export const numberSegments = 24
export const segmentRadians = (2 * Math.PI) / numberSegments

export const rumRepairsFactor = Number(rumRepairsPercent) / Number(rumRepairsVolume)
export const repairsSetSize = 5
export const circleRadiusFactor = 5
const secondsForFullCircle = 2935 // 48 * 60 + 55
export const degreesPerSecond = degreesFullCircle / secondsForFullCircle

// old: http://tools.medialab.sciences-po.fr/iwanthue/
// new: http://phrogz.net/css/distinct-colors.html
// noinspection CssConvertColorToRgbInspection
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
]

/**
 * Enable nested dropdowns in navbar
 * @link https://github.com/bootstrapthemesco/bootstrap-4-multi-dropdown-navbar
 * @param id - nav-item id
 */
export const initMultiDropdownNavbar = (id: string): void => {
    $(`#${id} .dropdown-menu .bootstrap-select .dropdown-toggle`).on("click", (event) => {
        const element = $(event.currentTarget)
        element.next(".dropdown-menu").toggleClass("show")
        element.parent("li").toggleClass("show")
        element.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown", (event2) => {
            $(event2.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")
        })

        return false
    })

    $(`#${id} div.dropdown.bootstrap-select`).on("hidden", (event) => {
        // hide any open menus when parent closes
        $(event.currentTarget).find(".dropdown-menu.show").not(".inner").removeClass("show")
    })
}

const cleanNumber = (i: string): string => i.replace(/[^\d-.?]/g, "")

const compareNumber = (a: string, b: string): number => {
    let aa = Number.parseFloat(a)
    let bb = Number.parseFloat(b)

    aa = Number.isNaN(aa) ? 0 : aa
    bb = Number.isNaN(bb) ? 0 : bb

    return aa - bb
}

export const initTablesort = (): void => {
    Tablesort.extend(
        "number",
        (item: string) =>
            /^[+-]?[$¢£´Û€]?\d+\s*([,.]\d{0,2})/.exec(item) ?? // Prefixed currency
            /^[+-]?\d+\s*([,.]\d{0,2})?[$¢£´Û€]/.exec(item) ?? // Suffixed currency
            /^[+-]?(\d)*-?([,.])?-?(\d)+([,Ee][+-]\d+)?%?$/.exec(item), // Number
        (a: string, b: string) => {
            const aa = cleanNumber(a)
            const bb = cleanNumber(b)

            return compareNumber(bb, aa)
        }
    )
}

export type HtmlString = string
export interface BaseModal {
    id: HtmlString
    title: HtmlString
    size?: string
}
export interface BaseModalPure extends BaseModal {
    buttonText?: HtmlString
}
export interface BaseModalHtml extends BaseModal {
    body: () => TemplateResult
    footer: () => TemplateResult
}

/**
 * Insert bootstrap modal
 * @param id - Modal id
 * @param title - Modal title
 * @param size - Modal size, "xl" (default)
 * @param buttonText - Button text, "Close" (default)
 */
export const insertBaseModal = ({ id, title, size = "xl", buttonText = "Close" }: BaseModalPure): void => {
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
    header.append("h5").attr("class", "modal-title").attr("id", `title-${id}`).html(title)

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
 * Insert bootstrap modal with html-lit
 * @param id - Modal id
 * @param title - Modal title
 * @param size - Modal size, "xl" (default)
 * @param body - Body content
 * @param footer - Footer content
 */
export const insertBaseModalHTML = ({ id, title, size = "xl", body, footer }: BaseModalHtml): TemplateResult => {
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

/**
 * Lower or upper bound coordinates
 */
export type Bound = [number, number]
