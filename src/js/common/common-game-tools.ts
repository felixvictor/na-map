/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for browser.
 * @module    src/node/common-browser
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { color as d3Color, rgb as d3Rgb } from "d3-color"
import Hashids from "hashids"
import htm from "htm"
import { h } from "preact"

import { colourWhite } from "./common-browser"
import { formatInt, formatLocale } from "./common-format"
import { BaseModalHtml, HtmlResult, HtmlString } from "./interface"

const html = htm.bind(h)

// eslint-disable-next-line one-var
declare const REPAIR_ARMOR_PERCENT: string,
    REPAIR_ARMOR_TIME: string,
    REPAIR_ARMOR_VOLUME: string,
    REPAIR_CREW_PERCENT: string,
    REPAIR_CREW_VOLUME: string,
    REPAIR_SAIL_PERCENT: string,
    REPAIR_SAIL_VOLUME: string

export const hullRepairsPercent = Number(REPAIR_ARMOR_PERCENT)
export const hullRepairsVolume = Number(REPAIR_ARMOR_VOLUME)
export const repairTime = Number(REPAIR_ARMOR_TIME)
export const rigRepairsPercent = Number(REPAIR_SAIL_PERCENT)
export const rigRepairsVolume = Number(REPAIR_SAIL_VOLUME)
export const rumRepairsPercent = Number(REPAIR_CREW_PERCENT)
export const rumRepairsVolume = Number(REPAIR_CREW_VOLUME)

export const rumRepairsFactor = Number(rumRepairsPercent) / Number(rumRepairsVolume)
export const repairsSetSize = 5

export const hashids = new Hashids("My salt: Yet another Naval Action map")

const importedFlag = " (i)"
export const isImported = (name: string): boolean => name.includes(importedFlag)
export const stripShipName = (name: string): string => name.replace(importedFlag, "")

export const beautifyShipName = (name: string): HtmlString =>
    stripShipName(name) + (isImported(name) ? ' <span class="caps small">imported</span>' : "")

export const beautifyShipNameHTML = (name: string): HtmlResult =>
    html`${stripShipName(name)} ${isImported(name) ? html`<span class="caps small">imported</span>` : html``}`

/**
 * Format float for htm
 * @param   x - Float
 * @param   f - digits following decimal point
 * @returns Formatted float
 */
export const formatFloatFixedHTML = (x: number, f = 2): HtmlResult => {
    const [number, decimals] = formatLocale.format(`.${f}f`)(x).split(".")
    let formattedFloat: HtmlResult = html`${decimals}`

    if (decimals) {
        if (decimals === "0" || decimals === "00") {
            formattedFloat = html`<span class="hidden">.${decimals}</span>`
        } else if (decimals.endsWith("0")) {
            formattedFloat = html`.${decimals.replace("0", "")}<span class="hidden">0</span>`
        } else {
            formattedFloat = html`.${decimals}`
        }
    }

    return html`${number}${formattedFloat}`
}

/**
 * Insert bootstrap modal with htm
 * @param id - Modal id
 * @param title - Modal title
 * @param size - Modal size, "xl" (default)
 * @param body - Body content
 * @param footer - Footer content
 */
export const getBaseModalHTML = ({ id, title, size = "modal-xl", body, footer }: BaseModalHtml): HtmlResult => {
    return html`
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
    `
}

/**
 * Get formatted currency string
 */
export const getCurrencyAmount = (amount: number | string): string =>
    `${formatInt(Number(amount))}\u00A0real${Number(amount) > 1 ? "es" : ""}`

export const getContrastColour = (colour: string): string => {
    const { r, g, b } = d3Rgb(colour)
    const yiq = (r * 299 + g * 587 + b * 114) / 1000

    return yiq >= 128 ? d3Color(colourWhite)?.darker(5).toString() ?? "#111" : colourWhite
}

export const displayClanLitHtml = (clan: string | undefined): HtmlResult => html`<span class="caps">${clan}</span>`
