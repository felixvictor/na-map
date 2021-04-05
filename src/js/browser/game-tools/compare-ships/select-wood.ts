/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file - select wood.
 * @module    game-tools/compare-ships/compare-ships/select-wood
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import CompareWoods from "../compare-woods"
import Select from "util/select"
import { ShipColumnType } from "./index"
import { woodType, WoodType, WoodTypeList } from "common/common"
import { ShipColumnTypeList } from "compare-ships"
import { HtmlString } from "common/interface"
import { select as d3Select } from "d3-selection"

export default class SelectWood extends Select {
    #select$ = {} as ShipColumnTypeList<WoodTypeList<JQuery<HTMLSelectElement>>>
    readonly #woodCompare: CompareWoods

    constructor(id: HtmlString, woodCompare: CompareWoods) {
        super(id)

        this.#woodCompare = woodCompare
    }

    _setWood(columnId: ShipColumnType, type: WoodType, woodId: number): void {
        Select.setSelect(this.#select$[columnId][type], woodId)
        this.#woodCompare.woodSelected(columnId, type, this.#select$[columnId][type])
    }

    cloneWoodData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        this.#woodCompare.enableSelects(newColumnId)

        if (this.#select$[currentColumnId].frame.val() !== "") {
            for (const type of woodType) {
                const woodId = this.getId(currentColumnId, type)
                this._setWood(newColumnId, type, woodId)
            }
        }
    }

    getSelectedText(columnId: ShipColumnType): string[] {
        const woods = [] as string[]
        for (const type of woodType) {
            woods.push(this.#woodCompare.getWoodName(type, Number(this.#select$[columnId][type].val())))
        }

        return woods
    }

    getSelectId(columnId: ShipColumnType, type: string): HtmlString {
        return `${super.baseId}-${columnId}-${type}-select`
    }

    getSelect$(columnId: ShipColumnType, type: WoodType): JQuery<HTMLSelectElement> {
        return this.#select$[columnId][type]
    }

    getId(columnId: ShipColumnType, type: WoodType): number {
        return Number(this.#select$[columnId][type].val())
    }

    _injectSelects(columnId: string): void {
        const mainDiv = d3Select(`#${super.baseId}-${columnId.toLowerCase()}`)
        console.log("wood _injectSelects", mainDiv)

        const div = mainDiv.append("div").attr("class", "input-group justify-content-between mb-1")
        for (const type of woodType) {
            const id = this.getSelectId(columnId, type)
            div.append("label").append("select").attr("name", id).attr("id", id).attr("class", "selectpicker")
        }
    }

    setup(columnId: ShipColumnType): void {
        this.#select$[columnId] = {} as WoodTypeList<JQuery<HTMLSelectElement>>
        this._injectSelects(columnId)
        for (const type of woodType) {
            this.#select$[columnId][type] = $(`#${this.getSelectId(columnId, type)}`)
            this.#woodCompare.setupWoodSelects(columnId, type, this.#select$[columnId][type])
        }
    }

    setWood(columnId: ShipColumnType, type: WoodType, woodId: number): void {
        Select.setSelect(this.#select$[columnId][type], woodId)
        this.#woodCompare.woodSelected(columnId, type, this.#select$[columnId][type])
    }
}
