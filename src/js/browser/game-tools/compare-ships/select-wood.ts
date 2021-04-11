/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file - select wood.
 * @module    game-tools/compare-ships/select-wood
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { HtmlString } from "common/interface"
import { ShipColumnTypeList } from "compare-ships"
import { ShipColumnType } from "./index"
import { WoodTypeList } from "compare-woods"

import Select from "util/select"
import { CompareWoods, woodType, WoodType } from "../compare-woods"

export default class SelectWood extends Select {
    #select$ = {} as ShipColumnTypeList<WoodTypeList<JQuery<HTMLSelectElement>>>
    readonly #woodCompare: CompareWoods

    constructor(id: HtmlString, woodCompare: CompareWoods) {
        super(id)

        this.#woodCompare = woodCompare
    }

    cloneWoodData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        this.#woodCompare.select.enableSelects(newColumnId)

        if (this.#select$[currentColumnId].frame.val() !== "") {
            for (const type of woodType) {
                const woodId = this.getId(currentColumnId, type)
                this.setWood(newColumnId, type, woodId)
            }
        }
    }

    getSelectedText(columnId: ShipColumnType): string[] {
        const woods = [] as string[]
        for (const type of woodType) {
            woods.push(this.#woodCompare.woodData.getWoodName(type, Number(this.#select$[columnId][type].val())))
        }

        return woods
    }

    getSelect$(columnId: ShipColumnType, type: WoodType): JQuery<HTMLSelectElement> {
        return this.#woodCompare.select.getSelect$(columnId, type)
    }

    getId(columnId: ShipColumnType, type: WoodType): number {
        return Number(this.#woodCompare.select.getSelect$(columnId, type).val())
    }

    setup(columnId: ShipColumnType): void {
        this.#woodCompare.select.setup(columnId)
    }

    setWood(columnId: ShipColumnType, type: WoodType, woodId: number): void {
        Select.setSelect(this.#select$[columnId][type], woodId)
        this.#woodCompare.woodSelected(columnId, type, this.#select$[columnId][type])
    }
}
