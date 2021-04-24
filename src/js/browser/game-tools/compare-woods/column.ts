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

import { HtmlString } from "common/interface"
import { Amount } from "compare-woods"

import { WoodData } from "./data"
import { WoodProperty, WoodTrimOrFrame } from "common/gen-json"

export class Column {
    #div: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    readonly #woodData: WoodData

    constructor(divOutputId: HtmlString, woodData: WoodData) {
        this.#div = d3Select(`#${divOutputId}`)
        this.#woodData = woodData

        this._setupMainDiv()
    }

    get div(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#div
    }

    get woodData(): WoodData {
        return this.#woodData
    }

    _setupMainDiv(): void {
        this.#div.select("div").remove()
        this.#div.append("div")
    }

    getProperty(data: WoodTrimOrFrame, modifierName: string): Amount {
        const property = data?.properties.find((prop) => prop.modifier === modifierName) ?? ({} as WoodProperty)

        const amount = property?.amount ?? 0
        const isPercentage = property?.isPercentage ?? false

        return { amount, isPercentage }
    }
}
