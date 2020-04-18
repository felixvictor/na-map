/*!
 * This file is part of na-map.
 *
 * @file      Toast.
 * @module    util/toast
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _title, _text, _toast, _mainDiv;
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/toast";
import { select as d3Select } from "d3-selection";
import { iconSmallSrc } from "../../common/common-browser";
export default class Toast {
    constructor(title, text) {
        _title.set(this, void 0);
        _text.set(this, void 0);
        _toast.set(this, void 0);
        _mainDiv.set(this, void 0);
        __classPrivateFieldSet(this, _title, title);
        __classPrivateFieldSet(this, _text, text);
        __classPrivateFieldSet(this, _mainDiv, d3Select("#toast-column"));
        this._set();
        this._show();
        const timeout = 1e4;
        window.setTimeout(this._remove.bind(this), timeout);
    }
    _set() {
        __classPrivateFieldSet(this, _toast, __classPrivateFieldGet(this, _mainDiv).append("div")
            .attr("class", "toast")
            .attr("role", "alert")
            .attr("aria-live", "assertive")
            .attr("aria-atomic", "true"));
        const header = __classPrivateFieldGet(this, _toast).append("div").attr("class", "toast-header");
        header.append("img").attr("class", "rounded mr-2").attr("src", iconSmallSrc).attr("alt", "logo");
        header
            .append("em")
            .attr("class", "mr-auto")
            .html(__classPrivateFieldGet(this, _title));
        header
            .append("button")
            .attr("type", "button")
            .attr("class", "ml-2 mb-1 close")
            .attr("data-dismiss", "toast")
            .attr("aria-label", "Close")
            .append("span")
            .attr("aria-hidden", "true")
            .html("&times;");
        __classPrivateFieldGet(this, _toast).append("div")
            .attr("class", "toast-body")
            .html(__classPrivateFieldGet(this, _text));
    }
    _show() {
        const toastNode = __classPrivateFieldGet(this, _toast).node();
        if (toastNode !== null) {
            const toast$ = $(toastNode);
            toast$.toast({ autohide: false }).toast("show");
        }
    }
    _remove() {
        __classPrivateFieldGet(this, _toast).remove();
    }
}
_title = new WeakMap(), _text = new WeakMap(), _toast = new WeakMap(), _mainDiv = new WeakMap();
//# sourceMappingURL=toast.js.map