/*!
 * This file is part of na-map.
 *
 * @file      Cookie.
 * @module    util/cookie
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import Cookies from "js-cookie"
import { appName } from "common/common-browser"
import dayjs from "dayjs"

const yearInDays = 365

/**
 * Cookie
 */
export default class Cookie {
    // Cookie base id
    readonly #baseId: string
    // Expire (number = days or Date)
    readonly #expire: number | Date
    // Cookie name
    readonly #name: string
    // Possible cookie values
    readonly #values: readonly string[]
    // Default cookie value
    readonly #default: string

    constructor({ id: baseId, values = [], expire }: { id: string; values?: readonly string[]; expire?: dayjs.Dayjs }) {
        this.#baseId = baseId
        this.#expire = expire ? dayjs(expire).toDate() : yearInDays
        this.#name = `${appName}--${this.#baseId}`

        this.#values = values
        this.#default = values?.[0]
    }

    /**
     * Set cookie
     */
    set(cookieValue: string): void {
        // Set cookie if not default value
        if (cookieValue === this.#default) {
            // Else remove cookie
            this.remove()
        } else {
            Cookies.set(this.#name, cookieValue, {
                expires: this.#expire,
                sameSite: "strict",
            })
        }
    }

    /**
     * Get cookie
     */
    get(): string {
        let cookieValue = Cookies.get(this.#name) ?? this.#default

        if (this.#default && cookieValue && !this.#values.includes(cookieValue)) {
            // Use default value if cookie has invalid data and remove cookie
            cookieValue = this.#default
            this.remove()
        }

        return cookieValue
    }

    /**
     * Remove cookie
     */
    remove(): void {
        Cookies.remove(this.#name)
    }
}
