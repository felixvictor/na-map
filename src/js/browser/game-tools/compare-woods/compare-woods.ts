/*!
 * This file is part of na-map.
 *
 * @file      Compare woods CompareWoods class.
 * @module    game-tools/compare-woods/compare-woods
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import JQuery from "jquery"

import { registerEvent } from "../../analytics"

import { HtmlString } from "common/interface"
import { SelectedWood, WoodColumnTypeList, WoodTypeList } from "compare-woods"
import { WoodColumnType, woodType, WoodType } from "./index"

import CompareWoodsModal from "./modal"
import SelectWood from "./select"
import { WoodBase } from "./wood-base"
import { WoodComparison } from "./wood-comparison"
import { WoodData } from "./data"

export class CompareWoods {
    instances = {} as WoodColumnTypeList<DataLink<WoodTypeList<WoodBase | WoodComparison>>>
    #columnIds = {} as WoodColumnType[]
    #columnIdsCompare = {} as WoodColumnType[]
    #modal: CompareWoodsModal | undefined = undefined
    #woodData = {} as WoodData
    #select = {} as SelectWood
    readonly #baseName: string
    readonly #baseId: HtmlString
    readonly #menuId: HtmlString

    constructor(id = "compare-woods") {
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

    woodSelected(compareId: WoodColumnType, type: WoodType, select$: JQuery): void {
        const woodId = Number(select$.val())

        this.#select.setWoodsSelected(compareId, type, woodId)
        this.#select.setOtherSelect(compareId, type)

        if (compareId === "base") {
            this._addInstance(compareId, new WoodBase(this.#baseId, "base", this.#woodData, this._getWoodData("base")))

            for (const columnId of this.#columnIdsCompare) {
                // For wood-compare: add instances with enabling selects
                // For ship-compare: add instances without enabling selects
                if (this.#baseId === "compare-woods") {
                    this.#select.enableSelects(columnId)
                }

                if (this.instances[columnId]) {
                    this._addInstance(
                        columnId,
                        new WoodComparison(
                            this.#baseId,
                            columnId,
                            this.#woodData,
                            this._getWoodData("base"),
                            this._getWoodData(columnId)
                        )
                    )
                }
            }
        } else {
            this._addInstance(
                compareId,
                new WoodComparison(
                    this.#baseId,
                    compareId,
                    this.#woodData,
                    this._getWoodData("base"),
                    this._getWoodData(compareId)
                )
            )
        }
    }

    _setupSelectListener(columnId: WoodColumnType): void {
        for (const type of woodType) {
            const select$ = $<HTMLSelectElement>(`#${this.#select.getSelectId(columnId, type)}`)
            select$.on("change", () => {
                this.woodSelected(columnId, type, select$)
            })
        }
    }

    _getWoodData(id: WoodColumnType): SelectedWood {
        return {
            frame: this.#woodData.getWoodTypeData(this.#select.getSelectedId(id, "frame")),
            trim: this.#woodData.getWoodTypeData(this.#select.getSelectedId(id, "trim")),
        }
    }

    _addInstance(id: WoodColumnType, woodInstance: WoodBase | WoodComparison): void {
        this.instances[id] = woodInstance
    }
}
