/**
 * This file is part of na-map.
 *
 * @file      Cookie.
 * @module    util/cookie
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import Cookies from "js-cookie"
import { appName } from "../../node/common-browser"

const yearInDays = 365

/**
 * Cookie
 */
export default class Cookie {
    // Cookie base id
    private readonly _baseId: string
    // Expire (number=days or Date)
    private readonly _expire: number | Date
    // Cookie name
    private readonly _name: string
    // Possible cookie values
    private readonly _values: string[]
    // Default cookie value
    private readonly _default: string

    // eslint-disable-next-line prettier/prettier
    constructor({ id: baseId, values = [], expire = yearInDays }: { id: string, values: string[], expire?: number | Date }) {
        this._baseId = baseId
        this._expire = expire

        this._name = `${appName}--${this._baseId}`
        this._values = values
        this._default = values?.[0]
    }

    /**
     * Set cookie
     */
    set(cookieValue: string): void {
        // Set cookie if not default value
        if (cookieValue === this._default) {
            // Else remove cookie
            this.remove()
        } else {
            Cookies.set(this._name, cookieValue, {
                expires: this._expire
            })
        }
    }

    /**
     * Get cookie
     */
    get(): string {
        let cookieValue = Cookies.get(this._name) ?? null

        if (cookieValue) {
            if (this._values.length && !this._values.includes(cookieValue)) {
                // Use default value if cookie has invalid data and remove cookie
                cookieValue = this._default
                this.remove()
            }
        } else {
            // Use default value if cookie is not stored
            cookieValue = this._default
        }

        return cookieValue
    }

    /**
     * Remove cookie
     */
    remove(): void {
        Cookies.remove(this._name)
    }
}
