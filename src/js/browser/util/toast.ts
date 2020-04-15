/* eslint-disable @typescript-eslint/no-explicit-any */
/*!
 * This file is part of na-map.
 *
 * @file      Toast.
 * @module    util/toast
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
/// <reference types="bootstrap" />
import "bootstrap/js/dist/toast"
import { BaseType, select as d3Select, Selection } from "d3-selection"

import { iconSmallSrc } from "../../common/common-browser"

/**
 * Toast
 */
export default class Toast {
    // Toast title
    readonly #title: string
    // Toast text
    readonly #text: string
    // Toast instance
    #toast: Selection<HTMLDivElement, unknown, HTMLElement, any>
    // Main div
    #mainDiv: Selection<BaseType, unknown, HTMLElement, any>

    constructor(
        // Toast title
        title: string,
        // Toast text
        text: string
    ) {
        this.#title = title
        this.#text = text

        this.#mainDiv = this._setupDiv()
        this.#toast = this._set()
        this._showToast()

        const timeout = 1e4
        window.setTimeout(this._remove.bind(this), timeout)
    }

    _setupDiv(): Selection<BaseType, unknown, HTMLElement, any> {
        return d3Select("#toast-column")
    }

    _set(): Selection<HTMLDivElement, unknown, HTMLElement, any> {
        const toast = this.#mainDiv
            .append("div")
            .attr("class", "toast")
            .attr("role", "alert")
            .attr("aria-live", "assertive")
            .attr("aria-atomic", "true")

        const header = this.#toast.append("div").attr("class", "toast-header")
        header.append("img").attr("class", "rounded mr-2").attr("src", iconSmallSrc).attr("alt", "logo")
        header
            .append("em")
            .attr("class", "mr-auto")
            .html(this.#title)
        header
            .append("button")
            .attr("type", "button")
            .attr("class", "ml-2 mb-1 close")
            .attr("data-dismiss", "toast")
            .attr("aria-label", "Close")
            .append("span")
            .attr("aria-hidden", "true")
            .html("&times;")

        toast
            .append("div")
            .attr("class", "toast-body")
            .html(this.#text)
        return toast
    }

    _showToast(): void {
        const toastNode = this.#toast.node()
        if (toastNode !== null) {
            const toast$ = $(toastNode)
            toast$.toast({ autohide: false }).toast("show")
        }
    }

    _remove(): void {
        this.#toast.remove()
    }
}
