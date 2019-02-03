/**
 * This file is part of na-map.
 *
 * @file      Toast.
 * @module    util/toast
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/toast";

import { iconSmallSrc } from "../common";

/**
 * Toast
 */
export default class Toast {
    /**
     * Constructor
     * @param {string} title - Toast title
     * @param {string} text - Toast text
     */
    constructor(title, text) {
        this._title = title;
        this._text = text;

        this._setupDiv();
        this._set(title, text);
        $(this._toast.node())
            .toast({ autohide: false })
            .toast("show");
        window.setTimeout(this._remove.bind(this), 1e4);
    }

    _setupDiv() {
        this._mainDiv = d3Select("#toast-section");
    }

    _set() {
        this._toast = this._mainDiv
            .append("div")
            .attr("class", "toast")
            .attr("role", "alert")
            .attr("aria-live", "assertive")
            .attr("aria-atomic", "true");

        const header = this._toast.append("div").attr("class", "toast-header");
        header
            .append("img")
            .attr("class", "rounded mr-2")
            .attr("src", iconSmallSrc)
            .attr("alt", "logo");
        header
            .append("em")
            .attr("class", "mr-auto")
            .html(this._title);
        header
            .append("button")
            .attr("type", "button")
            .attr("class", "ml-2 mb-1 close")
            .attr("data-dismiss", "toast")
            .attr("aria-label", "Close")
            .append("span")
            .attr("aria-hidden", "true")
            .html("&times;");

        this._toast
            .append("div")
            .attr("class", "toast-body")
            .html(this._text);
    }

    _remove() {
        this._toast.remove();
    }
}
