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
        [this._default] = values;

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
        if (cookieValue !== this._default) {
            Cookies.set(this._name, cookieValue);
        } else {
            Cookies.remove(this._name);
        }
    }

    /**
     * Get cookie
     * @returns {string} Cookie
     */
    get() {
        let cookieValue = Cookies.get(this._name);

        if (typeof cookieValue === "undefined") {
            // Use default value if cookie is not stored
            cookieValue = this._default;
        } else if (!this._values.includes(cookieValue)) {
            // Use default value if cookie has invalid data and remove cookie
            cookieValue = this._default;
            Cookies.remove(this._name);
        }

        return cookieValue;
    }
}
