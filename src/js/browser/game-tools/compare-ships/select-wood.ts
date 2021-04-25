/*!
 * This file is part of na-map.
 *
 * @file      Compare ships file - select wood.
 * @module    game-tools/compare-ships/select-wood
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { Selection } from "d3-selection"
import { HtmlString } from "common/interface"
import { woodType, WoodType } from "common/types"
import { ShipColumnType } from "./index"
import Select from "util/select"
import { CompareWoods } from "../compare-woods"

export default class SelectWood extends Select {
    readonly #woodCompare: CompareWoods

    constructor(
        id: HtmlString,
        selectsDiv: Selection<HTMLDivElement, unknown, HTMLElement, unknown>,
        woodCompare: CompareWoods
    ) {
        super(id, selectsDiv)

        this.#woodCompare = woodCompare
    }

    get woodCompare(): CompareWoods {
        return this.#woodCompare
    }





    getSelectedId(columnId: ShipColumnType, type: WoodType): number {
        return this.#woodCompare.select.getSelectedId(columnId, type)
    }

    getSelectedIds(columnId: ShipColumnType): number[] {
        return woodType.map((type) => this.#woodCompare.select.getSelectedId(columnId, type))
    }

    getSelect$(columnId: ShipColumnType, type: WoodType): JQuery<HTMLSelectElement> {
        return this.#woodCompare.select.getSelect$(columnId, type)
    }

    setup(columnId: ShipColumnType): void {
        this.#woodCompare.select.setup(columnId)
    }

    setWood(columnId: ShipColumnType, type: WoodType, woodId: number): void {
        const select$ = this.getSelect$(columnId, type)

        Select.setSelectValues(select$, woodId)
        this.#woodCompare.woodSelected(columnId, type)
    }

    setValues(columnId: ShipColumnType, ids: number[]): void {
        for (const [index, type] of woodType.entries()) {
            this.setWood(columnId, type, ids[index])
        }
    }
}
