/*!
 * This file is part of na-map.
 *
 * @file      Compare woods CompareWoods class.
 * @module    game-tools/compare-woods/compare-woods
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"

import { HtmlString } from "common/interface"
import { SelectedWood, WoodTypeList } from "compare-woods"
import { WoodColumnType, woodType, WoodType } from "./index"

import CompareWoodsModal from "./modal"
import SelectWood from "./select"
import { ColumnBase } from "./column-base"
import { ColumnCompare } from "./column-compare"
import { WoodData } from "./data"

type CompareWoodsBaseId = "compare-woods" | "compare-ships" | "ship-journey"

export class CompareWoods {
    #isColumnActive = {} as WoodTypeList<boolean>
    #columnIds = {} as WoodColumnType[]
    #columnIdsCompare = {} as WoodColumnType[]
    #modal: CompareWoodsModal | undefined = undefined
    #woodData = {} as WoodData
    #select = {} as SelectWood
    readonly #baseName: string
    readonly #baseId: CompareWoodsBaseId
    readonly #menuId: HtmlString

    constructor(id = "compare-woods" as CompareWoodsBaseId) {
        this.#baseId = id
        this.#baseName = this.#baseId === "compare-woods" ? "Compare woods" : this.#baseId
        this.#menuId = `menu-${this.#baseId}`

        if (this.#baseId === "compare-woods") {
            this._setupMenuListener()
        }

        this._setupData()
    }

    get select(): SelectWood {
        return this.#select
    }

    get woodData(): WoodData {
        return this.#woodData
    }

    async init(): Promise<void> {
        this.#woodData = new WoodData(this.#baseId)
        await this.#woodData.init()
        this.#select = new SelectWood(this.#baseId, this.#woodData)
        for (const columnId of this.#columnIds) {
            this.#select.setup(columnId)
            this.#isColumnActive[columnId] = false
            if (this.#baseId === "compare-woods") {
                this._setupSelectListener(columnId)
            }
        }
    }

    _setupData(): void {
        if (this.#baseId === "compare-woods") {
            this.#columnIdsCompare = ["c1", "c2", "c3"]
        } else if (this.#baseId === "ship-journey") {
            this.#columnIdsCompare = []
        } else if (this.#baseId === "compare-ships") {
            this.#columnIdsCompare = ["c1", "c2"]
        }

        this.#columnIds = [...this.#columnIdsCompare]
        this.#columnIds.unshift("base")
    }

    _setupMenuListener(): void {
        ;(document.querySelector(`#${this.#menuId}`) as HTMLElement).addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Menu", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            this.#modal = new CompareWoodsModal(this.#baseName, this.#columnIds)
            await this.init()
        }
    }

    _setColumns(compareId: WoodColumnType): void {
        if (compareId === "base") {
            this.#isColumnActive[compareId] = true
            void new ColumnBase(this.#baseId, "base", this.#woodData, this._getWoodData("base"))

            for (const columnId of this.#columnIdsCompare) {
                // For wood-compare: add instances with enabling selects
                // For ship-compare: add instances without enabling selects
                if (this.#baseId === "compare-woods") {
                    this.#select.enableSelects(columnId)
                }

                if (this.#isColumnActive[columnId]) {
                    this.#isColumnActive[columnId] = true
                    void new ColumnCompare(
                        this.#baseId,
                        columnId,
                        this.#woodData,
                        this._getWoodData("base"),
                        this._getWoodData(columnId)
                    )
                }
            }
        } else {
            this.#isColumnActive[compareId] = true
            void new ColumnCompare(
                this.#baseId,
                compareId,
                this.#woodData,
                this._getWoodData("base"),
                this._getWoodData(compareId)
            )
        }
    }

    woodSelected(compareId: WoodColumnType, type: WoodType): void {
        this.#select.setWoodsSelected(compareId, type)
        this.#select.setOtherSelect(compareId, type)

        if (this.#baseId === "compare-woods") {
            this._setColumns(compareId)
        }
    }

    _setupSelectListener(columnId: WoodColumnType): void {
        for (const type of woodType) {
            const select$ = $<HTMLSelectElement>(`#${this.#select.getSelectId(columnId, type)}`)
            select$.on("change", () => {
                this.woodSelected(columnId, type)
            })
        }
    }

    _getWoodData(id: WoodColumnType): SelectedWood {
        return {
            frame: this.#woodData.getWoodTypeData(this.#select.getSelectedId(id, "frame")),
            trim: this.#woodData.getWoodTypeData(this.#select.getSelectedId(id, "trim")),
        }
    }
}
