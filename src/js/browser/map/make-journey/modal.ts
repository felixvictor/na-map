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

import { CompareShips, initFromJourney } from "../../game-tools/compare-ships"

export default class MakeJourneyModal extends Modal {
    readonly #shipId = "ship-journey"
    #shipCompare = {} as CompareShips
    #windInput = {} as WindInput

    constructor(title: string) {
        super(title, "sm")
    }

    async init(): Promise<void> {
        this._injectModal()

        this.#shipCompare = await initFromJourney()
    }

    _injectModal(): void {
        const body = super.getBodySel()

        // Add wind input slider
        this.#windInput = new WindInput(body, this.baseId)

        // Add ship input
        const form = body.select("form")
        const shipId = `${this.#shipId}-Base-select`
        const ship = form.append("div").attr("class", "alert alert-primary").attr("role", "alert")
        const div = ship.append("div").attr("class", "d-flex flex-column")
        div.append("label").attr("for", shipId).text("Ship (optional)")
        div.append("select").attr("name", shipId).attr("id", shipId)
    }

    getWind(): number {
        return this.#windInput.getWind() ?? 0
    }

    getShipName(): string | undefined {
        return this.#shipCompare.singleShipData?.name
    }

    getSpeedDegrees(): number[] | undefined {
        return this.#shipCompare.singleShipData?.speedDegrees
    }
}
