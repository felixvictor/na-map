/**
 * This file is part of na-map.
 *
 * @file      Toast.
 * @module    util/toast
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/toast"

import { BaseType, select as d3Select, Selection } from "d3-selection"

import { iconSmallSrc } from "../common-browser"

/**
 * Toast
 */
export default class Toast {
    // Toast title
    private readonly _title: string
    // Toast text
    private readonly _text: string
    // Toast instance
    private _toast: Selection<GElement, OldDatum, HTMLElement, any>
    // Main div
    private _mainDiv: Selection<BaseType, unknown, HTMLElement, any>

    constructor(
        // Toast title
        title: string,
        // Toast text
        text: string
    ) {
        this._title = title
        this._text = text

        this._mainDiv = this._setupDiv()
        this._toast = this._set()
        $(this._toast.node())
            .toast({ autohide: false })
            .toast("show")
        window.setTimeout(this._remove.bind(this), 1e4)
    }

    _setupDiv(): Selection<BaseType, unknown, HTMLElement, any> {
        return d3Select("#toast-column")
    }

    _set(): Selection<GElement, OldDatum, HTMLElement, any> {
        const toast = this._mainDiv
            .append("div")
            .attr("class", "toast")
            .attr("role", "alert")
            .attr("aria-live", "assertive")
            .attr("aria-atomic", "true")

        const header = this._toast.append("div").attr("class", "toast-header")
        header
            .append("img")
            .attr("class", "rounded mr-2")
            .attr("src", iconSmallSrc)
            .attr("alt", "logo")
        header
            .append("em")
            .attr("class", "mr-auto")
            .html(this._title)
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
            .html(this._text)
        return toast
    }

    _remove(): void {
        this._toast.remove()
    }
}
