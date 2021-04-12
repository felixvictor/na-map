/*!
 * This file is part of na-map.
 *
 * @file      Compare woods Wood class.
 * @module    game-tools/compare-woods/wood
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select, Selection } from "d3-selection"

import { getBaseIdOutput } from "common/common-browser"

import { HtmlString } from "common/interface"
import { WoodColumnType, WoodType } from "./index"
import { Amount, SelectedWood } from "compare-woods"

import { WoodData } from "./data"

export class Wood {
    #div = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    readonly #baseId: HtmlString
    readonly #columnId: WoodColumnType
    readonly #divId: HtmlString
    readonly #woodData: WoodData

    constructor(id: HtmlString, columnId: WoodColumnType, woodData: WoodData) {
        this.#baseId = id
        this.#columnId = columnId
        this.#woodData = woodData

        this.#divId = `#${getBaseIdOutput(this.#baseId)}-${columnId}`
        this._setupMainDiv()
    }

    get div(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#div
    }

    get woodData(): WoodData {
        return this.#woodData
    }

    _setupMainDiv(): void {
        d3Select(`${this.#divId} div`).remove()
        this.#div = d3Select(this.#divId).append("div")
    }

    getProperty(data: SelectedWood, type: WoodType, modifierName: string): Amount {
        const property = data[type]?.properties.find((prop) => prop.modifier === modifierName)

        const amount = property?.amount ?? 0
        const isPercentage = property?.isPercentage ?? false

        return { amount, isPercentage }
    }
}
