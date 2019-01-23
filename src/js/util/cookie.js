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
     */
    constructor(baseId, values) {
        this._baseId = baseId;

        /**
         * @typedef {object} cookieData
         * @property {string } name - Cookie name
         * @property {string[]} values - Possible cookie values
         * @property {string} default - Default cookie value
         */

        /**
         * Cookie data
         * @type {cookieData}
         * @private
         */
        this._cookie = {
            name: `${appName}--${this._baseId}`,
            values,
            default: values[0]
        };

        // Set cookies defaults (expiry 365 days)
        Cookies.defaults = {
            expires: 365
        };
    }

    /**
     * Set cookie
     * @param {string} cookieValue - Cookie value
     * @return {void}
     */
    set(cookieValue) {
        if (cookieValue !== this._cookie.default) {
            Cookies.set(this._cookie.name, cookieValue);
        } else {
            Cookies.remove(this._cookie.name);
        }
    }

    /**
     * Get cookie
     * @returns {string} Cookie
     */
    get() {
        let cookieValue = Cookies.get(this._cookie.name);

        if (typeof cookieValue === "undefined") {
            // Use default value if cookie is not stored
            cookieValue = this._cookie.default;
        } else if (!this._cookie.values.includes(cookieValue)) {
            // Use default value if cookie has invalid data and remove cookie
            cookieValue = this._cookie.default;
            Cookies.remove(this._cookie.name);
        }

        return cookieValue;
    }
}
