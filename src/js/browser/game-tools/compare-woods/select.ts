/*!
 * This file is part of na-map.
 *
 * @file      Compare wood file - select wood.
 * @module    game-tools/compare-woods/select
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection"

import JQuery from "jquery"

import { HtmlString } from "common/interface"
import { WoodColumnTypeList, WoodTypeList } from "compare-woods"
import { WoodColumnType, WoodType, woodType } from "./index"

import Select from "util/select"
import { WoodData } from "./data"
import { getBaseIdSelects } from "common/common-browser"

export default class SelectWood extends Select {
    #select$ = {} as WoodColumnTypeList<WoodTypeList<JQuery<HTMLSelectElement>>>
    #woodIdsSelected = {} as WoodColumnTypeList<WoodTypeList<number>>

    readonly #woodData: WoodData

    constructor(id: HtmlString, woodData: WoodData) {
        super(id)

        this.#woodData = woodData
    }

    setOtherSelect(columnId: WoodColumnType, type: WoodType): void {
        const otherType: WoodType = type === "frame" ? "trim" : "frame"

        if (this.#woodIdsSelected[columnId][otherType] === this.#woodData.defaultWoodId[otherType]) {
            Select.reset(this.#select$[columnId][otherType], this.#woodData.defaultWoodId[otherType])
        }
    }

    enableSelects(columnId: WoodColumnType): void {
        for (const type of woodType) {
            Select.enable(this.#select$[columnId][type])
        }
    }

    setWoodsSelected(columnId: WoodColumnType, type: WoodType, setDefault = false): void {
        const select$ = this.#select$[columnId][type]
        const woodId = setDefault ? this.#woodData.defaultWoodId[type] : Number(select$.val())
console.log("setWoodsSelected", columnId, type, setDefault, select$, woodId, this.#woodIdsSelected[columnId]?.type)
        if (!this.#woodIdsSelected[columnId]) {
            this.#woodIdsSelected[columnId] = {}
        }

        this.#woodIdsSelected[columnId][type] = woodId
    }

    _setupSelects(columnId: WoodColumnType, type: WoodType, select$: JQuery<HTMLSelectElement>): void {
        this.setWoodsSelected(columnId, type, true)
        select$.append(this.#woodData.options[type])
        if (super.baseId !== "compare-woods" || (columnId !== "base" && super.baseId === "compare-woods")) {
            Select.disable(select$)
        }
    }

    _injectSelects(columnId: string): void {
        const selectsDiv = d3Select(`#${getBaseIdSelects(super.baseId)}-${columnId}`)

        const div = selectsDiv.append("div").attr("class", "input-group justify-content-between mb-1")
        for (const type of woodType) {
            const id = this.getSelectId(columnId, type)
            div.append("label").append("select").attr("name", id).attr("id", id).attr("class", "selectpicker")
        }
    }

    setup(columnId: WoodColumnType): void {
        this.#select$[columnId] = {} as WoodTypeList<JQuery<HTMLSelectElement>>
        this._injectSelects(columnId)
        for (const type of woodType) {
            this.#select$[columnId][type] = $(`#${this.getSelectId(columnId, type)}`)
            this._setupSelects(columnId, type, this.#select$[columnId][type])
            SelectWood.construct(this.#select$[columnId][type], { title: `Select ${type}` })
        }
    }

    getSelectId(columnId: WoodColumnType, type: WoodType): HtmlString {
        return `${super.baseId}-${columnId}-${type}-select`
    }

    getSelectedId(columnId: WoodColumnType, type: WoodType): number {
        return this.#woodIdsSelected[columnId][type]
    }

    getSelect$(columnId: WoodColumnType, type: WoodType): JQuery<HTMLSelectElement> {
        return this.#select$[columnId][type]
    }
}
