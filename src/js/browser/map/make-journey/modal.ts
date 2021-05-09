/*!
 * This file is part of na-map.
 *
 * @file      Make journey modal.
 * @module    map-tools/make-journey/modal
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import Modal from "util/modal"
import WindInput from "util/wind-input"

import { initFromJourney } from "../../game-tools/compare-ships"
import Select from "util/select"

export default class MakeJourneyModal extends Modal {
    readonly #shipId = "ship-journey"
    #shipSelect = {} as Select
    #shipNameAndSpeed = {} as Map<number, { name: string; speedDegrees: number[] }>
    #windInput = {} as WindInput

    constructor(title: string) {
        super(title, "sm", "Set")
    }

    async init(): Promise<void> {
        this._injectModal()

        const { select: shipSelect, shipNameAndSpeed } = await initFromJourney()
        this.#shipSelect = shipSelect
        this.#shipNameAndSpeed = shipNameAndSpeed
    }

    _injectModal(): void {
        const body = super.bodySel

        // Add wind input slider
        this.#windInput = new WindInput(body, this.baseId)

        // Add ship input
        const form = body.select("form")
        const shipId = `${this.#shipId}-select`
        const ship = form.append("div").attr("class", "mt-3")
        const div = ship.append("div").attr("class", "d-flex flex-column")
        div.append("label").attr("for", shipId).text("Ship (optional)")
        div.append("select").attr("name", shipId).attr("id", shipId)
    }

    getWind(): number {
        return this.#windInput.getWind() ?? 0
    }

    _getShipId(): number {
        return Number(this.#shipSelect.getValues())
    }

    getShipName(): string | undefined {
        const id = this._getShipId()
        return this.#shipNameAndSpeed.get(id)?.name
    }

    getSpeedDegrees(): number[] | undefined {
        const id = this._getShipId()
        return this.#shipNameAndSpeed.get(id)?.speedDegrees
    }
}
