/*!
 * This file is part of na-map.
 *
 * @file      radioButton.
 * @module    util/radio-button
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
var _name, _ids, _default;
export default class RadioButton {
    constructor(name, ids) {
        var _a;
        _name.set(this, void 0);
        _ids.set(this, void 0);
        _default.set(this, void 0);
        __classPrivateFieldSet(this, _name, name.replace(/ /g, ""));
        __classPrivateFieldSet(this, _ids, ids);
        _a = this, [({ set value(_b) { __classPrivateFieldSet(_a, _default, _b); } }).value] = ids;
    }
    set(id) {
        ;
        document.querySelector(`#${__classPrivateFieldGet(this, _name)}-${id}`).checked = true;
    }
    get() {
        let { value } = document.querySelector(`input[name="${__classPrivateFieldGet(this, _name)}"]:checked`);
        if (typeof value === "undefined" || !__classPrivateFieldGet(this, _ids).includes(value)) {
            value = __classPrivateFieldGet(this, _default);
            this.set(value);
        }
        return value;
    }
}
_name = new WeakMap(), _ids = new WeakMap(), _default = new WeakMap();
//# sourceMappingURL=radio-button.js.map