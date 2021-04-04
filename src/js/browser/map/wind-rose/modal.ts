/*!
 * This file is part of na-map.
 *
 * @file      Predict wind modal.
 * @module    map-tools/wind-rose/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import Modal from "util/modal"
import WindInput from "util/wind-input"

import { HtmlString } from "common/interface"

export default class WindRoseModal extends Modal {
    #timeGroupId: HtmlString
    #timeInputId: HtmlString
    #windInput = {} as WindInput

    constructor(title: string) {
        super(title, "sm")

        this.#timeGroupId = `input-group-${this.baseId}`
        this.#timeInputId = `input-${this.baseId}`

        this._init()
    }

    _init(): void {
        this._injectModal()
    }

    _injectModal(): void {
        const body = super.getBodySel()

        // Add wind input slider
        this.#windInput = new WindInput(body, this.baseId)
    }

    getTime(): string {
        const input = document.querySelector(`#${this.#timeInputId}`) as HTMLInputElement

        return input.value.trim()
    }

    getWind(): number {
        return this.#windInput.getWind()
    }
}
