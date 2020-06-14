/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for browser.
 * @module    src/node/common-browser
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { h, VNode } from "preact"
import htm from "htm"
import { BaseModal, HtmlString } from "./common-browser";
import { formatLocale } from "./common-format"

const html = htm.bind(h)
export type HtmlResult = VNode<any> | Array<VNode<any>>

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

export interface BaseModalHtml extends BaseModal {
    body: () => HtmlResult
    footer: () => HtmlResult
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
