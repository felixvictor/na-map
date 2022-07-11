/*!
 * This file is part of na-map.
 *
 * @file      Compare woods CompareWoods class.
 * @module    game-tools/compare-woods/compare-woods
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"

import { HtmlString } from "common/interface"
import { SelectedWood, WoodColumnTypeList, WoodTypeList } from "compare-woods"
import { WoodColumnType } from "./index"

import CompareWoodsModal from "./modal"
import { ColumnBase } from "./column-base"
import { ColumnCompare } from "./column-compare"
import { WoodData } from "./data"
import { woodType, WoodType } from "common/types"
import Select from "util/select"

type CompareWoodsBaseId = "compare-wood" | "compare-ship" | "ship-journey"

export class CompareWoods {
    #columnIds = {} as WoodColumnType[]
    #columnIdsCompare = {} as WoodColumnType[]
    #isColumnActive = {} as WoodColumnTypeList<boolean>
    #modal: CompareWoodsModal | undefined = undefined
    #select = {} as WoodColumnTypeList<WoodTypeList<Select>>
    #woodData = {} as WoodData
    readonly #baseName: string
    readonly #baseId: CompareWoodsBaseId
    readonly #menuId: HtmlString

    constructor(id = "compare-wood" as CompareWoodsBaseId) {
        this.#baseId = id

        this.#baseName = this.#baseId === "compare-wood" ? "Compare woods" : this.#baseId
        this.#menuId = `menu-${this.#baseId}`

        if (this.#baseId === "compare-wood") {
            this._setupMenuListener()
        }

        this._setupData()
    }

    _enableSelects(columnId: WoodColumnType): void {
        for (const type of woodType) {
            this.#select[columnId][type].enable()
        }
    }

    _disableSelects(columnId: WoodColumnType): void {
        for (const type of woodType) {
            this.#select[columnId][type].disable()
        }
    }

    initSelects(columnId: WoodColumnType, divOutputId: HtmlString): void {
        this.#select[columnId] = {} as WoodColumnTypeList<Select>
        for (const type of woodType) {
            this.#select[columnId][type] = new Select(
                `${this.#baseId}-${columnId}-${type}`,
                divOutputId,
                { placeholder: `Select ${type}` },
                this.#woodData.getOptions(type)
            )
        }
    }

    async init(): Promise<void> {
        this.#woodData = new WoodData(this.#baseId)
        await this.#woodData.init()
        for (const columnId of this.#columnIds) {
            this.#isColumnActive[columnId] = false
            if (this.#baseId === "compare-wood") {
                this.initSelects(columnId, this.#modal!.getBaseIdSelects(columnId))
                this._setupSelectListener(columnId)
                if (columnId !== "base") {
                    this._disableSelects(columnId)
                }
            }
        }
    }

    _setupData(): void {
        if (this.#baseId === "compare-wood") {
            this.#columnIdsCompare = ["c1", "c2", "c3"]
        } else if (this.#baseId === "ship-journey") {
            this.#columnIdsCompare = []
        } else if (this.#baseId === "compare-ship") {
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
            void new ColumnBase(this.#modal!.getBaseIdOutput(compareId), this.#woodData, this._getWoodData("base"))

            for (const columnId of this.#columnIdsCompare) {
                // For wood-compare: add instances with enabling selects
                // For ship-compare: add instances without enabling selects
                if (this.#baseId === "compare-wood") {
                    this._enableSelects(columnId)
                }

                if (this.#isColumnActive[columnId]) {
                    this.#isColumnActive[columnId] = true
                    void new ColumnCompare(
                        this.#modal!.getBaseIdOutput(columnId),
                        this.#woodData,
                        this._getWoodData("base"),
                        this._getWoodData(columnId)
                    )
                }
            }
        } else {
            this.#isColumnActive[compareId] = true
            void new ColumnCompare(
                this.#modal!.getBaseIdOutput(compareId),
                this.#woodData,
                this._getWoodData("base"),
                this._getWoodData(compareId)
            )
        }
    }

    _setOtherSelect(columnId: WoodColumnType, type: WoodType): void {
        const otherType: WoodType = type === "frame" ? "trim" : "frame"
        const otherTypeValue = Number(this.#select[columnId][otherType].getValues())

        if (otherTypeValue === 0) {
            this.#select[columnId][otherType].reset(this.#woodData.defaultWoodId[otherType])
        }
    }

    woodSelected(columnId: WoodColumnType, type: WoodType): void {
        this._setOtherSelect(columnId, type)

        if (this.#baseId === "compare-wood") {
            this._setColumns(columnId)
        }
    }

    _setupSelectListener(columnId: WoodColumnType): void {
        for (const type of woodType) {
            const { select$ } = this.#select[columnId][type]
            select$.on("change", () => {
                this.woodSelected(columnId, type)
            })
        }
    }

    _getWoodData(columnId: WoodColumnType): SelectedWood {
        const frameWoodId = Number(this.#select[columnId].frame.getValues())
        const trimWoodId = Number(this.#select[columnId].trim.getValues())

        return {
            frame: this.#woodData.getWoodTypeData(frameWoodId),
            trim: this.#woodData.getWoodTypeData(trimWoodId),
        }
    }
}
