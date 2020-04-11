/*!
 * This file is part of na-map.
 *
 * @file      Cookie.
 * @module    util/cookie
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
var _baseId, _expire, _name, _values, _default;
import Cookies from "js-cookie";
import { appName } from "../../common/common-browser";
const yearInDays = 365;
export default class Cookie {
    constructor({ id: baseId, values = [], expire = yearInDays, }) {
        _baseId.set(this, void 0);
        _expire.set(this, void 0);
        _name.set(this, void 0);
        _values.set(this, void 0);
        _default.set(this, void 0);
        __classPrivateFieldSet(this, _baseId, baseId);
        __classPrivateFieldSet(this, _expire, expire);
        __classPrivateFieldSet(this, _name, `${appName}--${__classPrivateFieldGet(this, _baseId)}`);
        __classPrivateFieldSet(this, _values, values);
        __classPrivateFieldSet(this, _default, values === null || values === void 0 ? void 0 : values[0]);
    }
    set(cookieValue) {
        if (cookieValue === __classPrivateFieldGet(this, _default)) {
            this.remove();
        }
        else {
            Cookies.set(__classPrivateFieldGet(this, _name), cookieValue, {
                expires: __classPrivateFieldGet(this, _expire),
            });
        }
    }
    get() {
        var _a;
        let cookieValue = (_a = Cookies.get(__classPrivateFieldGet(this, _name))) !== null && _a !== void 0 ? _a : null;
        if (cookieValue) {
            if (__classPrivateFieldGet(this, _values).length > 0 && !__classPrivateFieldGet(this, _values).includes(cookieValue)) {
                cookieValue = __classPrivateFieldGet(this, _default);
                this.remove();
            }
        }
        else {
            cookieValue = __classPrivateFieldGet(this, _default);
        }
        return cookieValue;
    }
    remove() {
        Cookies.remove(__classPrivateFieldGet(this, _name));
    }
}
_baseId = new WeakMap(), _expire = new WeakMap(), _name = new WeakMap(), _values = new WeakMap(), _default = new WeakMap();
//# sourceMappingURL=cookie.js.map