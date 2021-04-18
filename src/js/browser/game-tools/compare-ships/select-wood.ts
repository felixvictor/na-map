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
import { ShipColumnType } from "./index"

import Select from "util/select"
import { CompareWoods, woodType, WoodType } from "../compare-woods"

export default class SelectWood extends Select {
    readonly #woodCompare: CompareWoods

    constructor(id: HtmlString, woodCompare: CompareWoods) {
        super(id)

        this.#woodCompare = woodCompare
    }

    get woodCompare(): CompareWoods {
        return this.#woodCompare
    }

    cloneWoodData(currentColumnId: ShipColumnType, newColumnId: ShipColumnType): void {
        this.#woodCompare.select.enableSelects(newColumnId)

        if (this.getSelectedId(currentColumnId, "frame")) {
            for (const type of woodType) {
                const woodId = this.getSelectedId(currentColumnId, type)
                this.setWood(newColumnId, type, woodId)
            }
        }
    }

    getSelectedText(columnId: ShipColumnType): string[] {
        const woods = [] as string[]
        for (const type of woodType) {
            const woodId = this.getSelectedId(columnId, type)
            woods.push(this.#woodCompare.woodData.getWoodName(woodId))
        }

        return woods
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

        Select.setSelect(select$, woodId)
        this.#woodCompare.woodSelected(columnId, type)
    }

    setSelectedIds(columnId: ShipColumnType, ids: number[]): void {
        for (const [index, type] of woodType.entries()) {
            this.setWood(columnId, type, ids[index])
        }
    }
}
