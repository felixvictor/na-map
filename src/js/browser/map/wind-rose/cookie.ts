/*!
 * This file is part of na-map.
 *
 * @file      Predict wind cookies.
 * @module    map-tools/wind-rose/cookie
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import Cookie from "util/cookie"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
dayjs.extend(utc)

import { getNextServerStart } from "common/common"
import { degreesPerSecond } from "common/common-browser"

import { HtmlString } from "common/interface"

export default class WindRoseCookie {
    readonly #baseId: HtmlString
    readonly #cookieTime: Cookie
    readonly #cookieWindDegrees: Cookie

    constructor(id: HtmlString) {
        this.#baseId = id

        /**
         * Wind degree cookie
         */
        this.#cookieWindDegrees = new Cookie({
            id: `${this.#baseId}-degrees`,
            expire: this._getExpire(),
        })

        /**
         * Wind time cookie
         */
        this.#cookieTime = new Cookie({ id: `${this.#baseId}-time` })
    }

    _getExpire(): dayjs.Dayjs {
        return getNextServerStart()
    }

    _getNow(): number {
        return dayjs().utc().unix()
    }

    get(): number {
        const cookieWind = this.#cookieWindDegrees.get()
        const cookieTime = this.#cookieTime.get()

        // If both cookies exist
        if (cookieWind && cookieTime) {
            const wind = Number(cookieWind)
            const time = Number(cookieTime)

            // Difference in seconds since wind has been stored
            const diffSeconds = Math.round(this._getNow() - time)

            return 360 + (Math.floor(wind - degreesPerSecond * diffSeconds) % 360)
        }

        // Remove cookies if none or only one of both cookies exists
        this.remove()

        return Number.NaN
    }

    /**
     * Store current wind and time in cookie
     */
    set(currentWindDegrees: number): void {
        this.#cookieWindDegrees.set(String(currentWindDegrees))
        this.#cookieTime.set(String(this._getNow()))
    }

    remove(): void {
        this.#cookieWindDegrees.remove()
        this.#cookieTime.remove()
    }
}
