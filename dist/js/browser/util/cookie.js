/*!
 * This file is part of na-map.
 *
 * @file      Cookie.
 * @module    util/cookie
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import Cookies from "js-cookie";
import { appName } from "../../common/common-browser";
const yearInDays = 365;
export default class Cookie {
    constructor({ id: baseId, values = [], expire = yearInDays }) {
        this._baseId = baseId;
        this._expire = expire;
        this._name = `${appName}--${this._baseId}`;
        this._values = values;
        this._default = values?.[0];
    }
    set(cookieValue) {
        if (cookieValue === this._default) {
            this.remove();
        }
        else {
            Cookies.set(this._name, cookieValue, {
                expires: this._expire
            });
        }
    }
    get() {
        let cookieValue = Cookies.get(this._name) ?? null;
        if (cookieValue) {
            if (this._values.length && !this._values.includes(cookieValue)) {
                cookieValue = this._default;
                this.remove();
            }
        }
        else {
            cookieValue = this._default;
        }
        return cookieValue;
    }
    remove() {
        Cookies.remove(this._name);
    }
}
//# sourceMappingURL=cookie.js.map