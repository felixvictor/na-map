/**
 * This file is part of na-map.
 *
 * @file      Cookie.
 * @module    util/cookie
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import Cookies from "js-cookie";
import { appName } from "../common";

/**
 * Cookie
 */
export default class Cookie {
    /**
     * Constructor
     * @param {string} baseId - Cookie base id
     * @param {string[]} values - Cookie values
     * @param {number|Date} expire - Expire (number=days or Date)
     */
    constructor({ id: baseId, values = [], expire = 365 }) {
        this._baseId = baseId;
        this._expire = expire;

        /**
         * Cookie name
         * @type {string}
         */
        this._name = `${appName}--${this._baseId}`;

        /**
         *	Possible cookie values
         * @type {string[]}
         */
        this._values = values;

        /**
         * Default cookie value
         * @type {string}
         */
        this._default = this._values.length ? values[0] : null;
    }

    /**
     * Set cookie
     * @param {string} cookieValue - Cookie value
     * @return {void}
     */
    set(cookieValue) {
        // Set cookie if not default value
        if (cookieValue !== this._default) {
            Cookies.set(this._name, cookieValue, {
                expires: this._expire
            });
        } else {
            // Else remove cookie
            this.remove();
        }
    }

    /**
     * Get cookie
     * @return {string} Cookie
     */
    get() {
        let cookieValue = Cookies.get(this._name);

        if (typeof cookieValue === "undefined") {
            // Use default value if cookie is not stored
            cookieValue = this._default;
        } else if (this._values.length && !this._values.includes(cookieValue)) {
            // Use default value if cookie has invalid data and remove cookie
            cookieValue = this._default;
            this.remove();
        }

        return cookieValue;
    }

    /**
     * Remove cookie
     * @return {void}
     */
    remove() {
        Cookies.remove(this._name);
    }
}
