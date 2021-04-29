/*!
 * This file is part of na-map.
 *
 * @file      Toast.
 * @module    util/toast
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as BSToast } from "bootstrap/js/dist/toast"

import { select as d3Select, Selection } from "d3-selection"

import { iconSmallSrc } from "common/common-browser"

/**
 * Toast
 */
export default class Toast {
    // Toast title
    readonly #title: string
    // Toast text
    readonly #text: string
    // Timeout
    readonly #timeout = 1e4
    // Toast instance
    #toast = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    // Main div
    #mainDiv = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>

    constructor(title: string, text: string) {
        this.#title = title
        this.#text = text

        this.#mainDiv = d3Select("#toast-column")
        this._set()
        this._show()
    }

    _set(): void {
        this.#toast = this.#mainDiv
            .append("div")
            .attr("class", "toast")
            .attr("role", "alert")
            .attr("aria-live", "assertive")
            .attr("aria-atomic", "true")

        const header = this.#toast.append("div").attr("class", "toast-header")
        header
            .append("img")
            .attr("class", "rounded me-2")
            .attr("height", "48px")
            .attr("width", "48px")
            .attr("src", iconSmallSrc)
            .attr("alt", "logo")
        header
            .append("em")
            .attr("class", "me-auto")
            .html(this.#title)
        header
            .append("button")
            .attr("type", "button")
            .attr("class", "btn-close")
            .attr("data-bs-dismiss", "toast")
            .attr("aria-label", "Close")

        this.#toast
            .append("div")
            .attr("class", "toast-body")
            .html(this.#text)
    }

    _show(): void {
        const toastNode = this.#toast.node() as Element
        new BSToast(toastNode, { delay: this.#timeout }).show()
    }
}
