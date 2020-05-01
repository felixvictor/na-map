/*!
 * This file is part of na-map.
 *
 * @file      Compare woods.
 * @module    game-tools/compare-woods
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select/js/bootstrap-select"
import { min as d3Min, max as d3Max } from "d3-array"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../analytics"
import { formatFloat, formatPercent, formatSignFloat } from "../../common/common-format"
import { HtmlString, insertBaseModal } from "../../common/common-browser"
import * as d3Selection from "d3-selection"
import { putImportError, woodType, WoodType, WoodTypeList } from "../../common/common"
import { simpleStringSort, sortBy } from "../../common/common-node"
import { WoodData, WoodTrimOrFrame } from "../../common/gen-json"
import { ArrayIndex, Index, NestedIndex } from "../../common/interface"

const woodColumnType = ["Base", "C1", "C2", "C3"] as const
export type WoodColumnType = typeof woodColumnType[number]

type ColumnArray<T> = {
    [K in WoodColumnType]: T[]
}
type ColumnNestedArray<T> = {
    [K1 in WoodColumnType]: ArrayIndex<T>
}

interface MinMax {
    min: number
    max: number
}
interface Amount {
    amount: number
    isPercentage: boolean
}
interface SelectedWood {
    frame: WoodTrimOrFrame
    trim: WoodTrimOrFrame
}
interface WoodDisplayBaseData {
    frame: string
    trim: string
    properties: Map<string, WoodBaseAmount>
}
interface WoodDisplayCompareData {
    frame: string
    trim: string
    properties: Map<string, WoodCompareAmount>
}
interface WoodBaseAmount {
    amount: number
    isPercentage: boolean
}
interface WoodCompareAmount {
    base: number
    compare: number
    isPercentage: boolean
}

class Wood {
    readonly select: HtmlString
    protected readonly _woodCompare: CompareWoods
    private readonly _id: WoodColumnType
    private readonly _g: d3Selection.Selection<SVGGElement, unknown, HTMLElement, unknown>

    constructor(compareId: WoodColumnType, woodCompare: CompareWoods) {
        this._id = compareId
        this._woodCompare = woodCompare
        this.select = `#${this._woodCompare.baseFunction}-${this._id}`

        this._setupMainDiv()
        this._g = d3Select(this.select).select("g")
    }

    _setupMainDiv(): void {
        d3Select(`${this.select} div`).remove()
        d3Select(this.select).append("div")
    }
}

class WoodBase extends Wood {
    private readonly _woodData!: SelectedWood
    constructor(compareId: WoodColumnType, woodData: SelectedWood, woodCompare: CompareWoods) {
        super(compareId, woodCompare)

        this._woodData = woodData

        this._printText()
    }

    _getProperty(propertyName: string, type: WoodType): Amount {
        const property = this._woodData[type].properties.find((prop) => prop.modifier === propertyName)
        let amount = 0
        let isPercentage = false

        if (property?.amount) {
            ;({ amount, isPercentage } = property)
        }

        return { amount, isPercentage }
    }

    _getPropertySum(propertyName: string): Amount {
        const propertyFrame = this._getProperty(propertyName, "frame")
        const propertyTrim = this._getProperty(propertyName, "trim")

        return {
            amount: propertyFrame.amount + propertyTrim.amount,
            isPercentage: propertyTrim.isPercentage,
        }
    }

    _getText(wood: WoodDisplayBaseData): HtmlString {
        const middle = 100 / 2
        let text = '<table class="table table-sm table-striped small mt-4"><thead>'
        text += "<tr>"
        text += '<tr><th scope="col">Property</th><th scope="col">Change</th></tr></thead><tbody>'
        for (const [key, value] of wood.properties) {
            text += `<tr><td>${key}</td><td>${
                value.isPercentage ? formatPercent(value.amount / 100) : formatFloat(value.amount)
            }`
            text += '<span class="rate">'
            if (value.amount > 0) {
                const right = (value.amount / (this._woodCompare.minMaxProperty.get(key)?.max ?? 1)) * middle
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`
                text += `<span class="bar pos diff" style="width:${right}%;"></span>`
            } else if (value.amount < 0) {
                const right = (value.amount / (this._woodCompare.minMaxProperty.get(key)?.min ?? 1)) * middle
                const left = middle - right
                text += `<span class="bar neutral" style="width:${left}%;"></span>`
                text += `<span class="bar neg diff" style="width:${right}%;"></span>`
            } else {
                text += '<span class="bar neutral"></span>'
            }

            text += "</span></td></tr>"
            /*
            console.log(
                key,
                value,
                this.woodCompare.minMaxProperty.get(key).min,
                this.woodCompare.minMaxProperty.get(key).max
            );
            */
        }

        text += "</tbody></table>"
        return text
    }

    _printText(): void {
        const wood = {
            frame: this._woodData.frame.name,
            trim: this._woodData.trim.name,
            properties: new Map<string, WoodBaseAmount>(),
        } as WoodDisplayBaseData
        for (const propertyName of this._woodCompare.propertyNames) {
            const property = this._getPropertySum(propertyName)
            wood.properties.set(propertyName, {
                amount: property.amount,
                isPercentage: property.isPercentage,
            })
        }

        $(`${this.select}`).find("div").append(this._getText(wood))
    }
}

class WoodComparison extends Wood {
    private readonly _baseData: SelectedWood
    private readonly _compareData: SelectedWood

    constructor(
        compareId: WoodColumnType,
        baseData: SelectedWood,
        compareData: SelectedWood,
        woodCompare: CompareWoods
    ) {
        super(compareId, woodCompare)

        this._baseData = baseData
        this._compareData = compareData

        this._printTextComparison()
    }

    static _getDiff(a: number, b: number, isPercentage: boolean, decimals = 1): HtmlString {
        const diff = Number.parseFloat((a - b).toFixed(decimals))
        const value = isPercentage ? formatPercent(a / 100, decimals) : formatFloat(a)

        return `${value} <span class="badge badge-white">${formatSignFloat(diff)}</span>`
    }

    _getBaseProperty(propertyName: string, type: WoodType): Amount {
        const property = this._baseData[type].properties.find((prop) => prop.modifier === propertyName)
        let amount = 0
        let isPercentage = false

        if (property?.amount) {
            ;({ amount, isPercentage } = property)
        }

        return { amount, isPercentage }
    }

    _getBasePropertySum(propertyName: string): Amount {
        const basePropertyFrame = this._getBaseProperty(propertyName, "frame")
        const basePropertyTrim = this._getBaseProperty(propertyName, "trim")

        return {
            amount: basePropertyFrame.amount + basePropertyTrim.amount,
            isPercentage: basePropertyTrim.isPercentage,
        }
    }

    _getCompareProperty(propertyName: string, type: WoodType): Amount {
        const property = this._compareData[type].properties.find((prop) => prop.modifier === propertyName)
        let amount = 0
        let isPercentage = false

        if (property?.amount) {
            // eslint-disable-next-line prefer-destructuring
            amount = property.amount
            // eslint-disable-next-line prefer-destructuring
            isPercentage = property.isPercentage
        }

        return { amount, isPercentage }
    }

    _getComparePropertySum(propertyName: string): Amount {
        const comparePropertyFrame = this._getCompareProperty(propertyName, "frame")
        const comparePropertyTrim = this._getCompareProperty(propertyName, "trim")

        return {
            amount: comparePropertyFrame.amount + comparePropertyTrim.amount,
            isPercentage: comparePropertyFrame.isPercentage && comparePropertyTrim.isPercentage,
        }
    }

    // noinspection FunctionTooLongJS
    _getText(wood: WoodDisplayCompareData): HtmlString {
        const middle = 100 / 2
        let base = 0
        let diff = 0
        let neutral = 0
        let diffColour = ""
        let text = '<table class="table table-sm table-striped small wood mt-4"><thead>'
        text += '<tr><th scope="col">Property</th><th scope="col">Change</th></tr></thead><tbody>'
        for (const [key, value] of wood.properties) {
            text += `<tr><td>${key}</td><td>${WoodComparison._getDiff(value.compare, value.base, value.isPercentage)}`
            text += '<span class="rate">'
            if (value.compare >= 0) {
                if (value.base >= 0) {
                    if (value.compare > value.base) {
                        // eslint-disable-next-line prefer-destructuring
                        base = value.base
                        diff = value.compare - value.base
                        diffColour = "pos"
                    } else {
                        base = value.compare
                        diff = value.base - value.compare
                        diffColour = "neg"
                    }
                } else {
                    base = 0
                    diff = value.compare
                    diffColour = "pos"
                }

                text += `<span class="bar neutral" style="width:${middle}%;"></span>`
                text += `<span class="bar pos diff" style="width:${
                    (base / (this._woodCompare.minMaxProperty.get(key)?.max ?? 1)) * middle
                }%;"></span>`
                text += `<span class="bar ${diffColour}" style="width:${
                    (diff / (this._woodCompare.minMaxProperty.get(key)?.max ?? 1)) * middle
                }%;"></span>`
            } else if (value.compare < 0) {
                if (value.base < 0) {
                    if (value.compare >= value.base) {
                        base = value.compare
                        diff = value.base - value.compare
                        neutral = -value.base
                        diffColour = "pos"
                    } else {
                        // eslint-disable-next-line prefer-destructuring
                        base = value.base
                        diff = value.compare - value.base
                        neutral = -value.compare
                        diffColour = "neg"
                    }
                } else {
                    base = 0
                    diff = value.compare
                    neutral = -value.compare
                    diffColour = "neg"
                }

                text += `<span class="bar neutral" style="width:${
                    middle + (neutral / (this._woodCompare.minMaxProperty.get(key)?.min ?? 1)) * middle
                }%;"></span>`
                text += `<span class="bar ${diffColour}" style="width:${
                    (diff / (this._woodCompare.minMaxProperty.get(key)?.min ?? 1)) * middle
                }%;"></span>`
                text += `<span class="bar neg diff" style="width:${
                    (base / (this._woodCompare.minMaxProperty.get(key)?.min ?? 1)) * middle
                }%;"></span>`
            } else {
                text += '<span class="bar neutral"></span>'
            }

            text += "</span></td></tr>"
        }

        text += "</tbody></table>"
        return text
    }

    _printTextComparison(): void {
        const wood = {
            frame: this._compareData.frame.name,
            trim: this._compareData.trim.name,
            properties: new Map<string, WoodCompareAmount>(),
        } as WoodDisplayCompareData

        for (const propertyName of this._woodCompare.propertyNames) {
            const basePropertySum = this._getBasePropertySum(propertyName)
            const comparePropertySum = this._getComparePropertySum(propertyName)
            wood.properties.set(propertyName, {
                base: basePropertySum.amount,
                compare: comparePropertySum.amount,
                isPercentage: basePropertySum.isPercentage,
            })
        }

        $(`${this.select}`).find("div").append(this._getText(wood))
    }
}

export default class CompareWoods {
    readonly baseFunction: string
    instances: Index<WoodBase | WoodComparison> = {} as Index<WoodBase | WoodComparison>
    readonly minMaxProperty: Map<string, MinMax> = new Map()
    propertyNames!: Set<string>
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private _woodData!: WoodData
    private _columnsCompare!: WoodColumnType[]
    private _defaultWoodId: WoodTypeList<number> = {} as WoodTypeList<number>
    private _columns!: WoodColumnType[]
    private _frameSelectData!: WoodTrimOrFrame[]
    private _trimSelectData!: WoodTrimOrFrame[]
    private _options: WoodTypeList<HtmlString> = {} as WoodTypeList<HtmlString>
    private _woodIdsSelected: NestedIndex<number> = {} as NestedIndex<number>

    constructor(baseFunction: string) {
        this.baseFunction = baseFunction
        this._baseName = "Compare woods"
        this._baseId = `${this.baseFunction}-compare`
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        if (this.baseFunction === "wood") {
            this._setupListener()
        }
    }

    async woodInit(): Promise<void> {
        await this._loadAndSetupData()
        this._initData()
    }

    getWoodName(type: WoodType, woodId: number): string {
        return this._woodData[type].find((wood) => wood.id === woodId)?.name ?? ""
    }

    _findWoodId(type: WoodType, woodName: string): number {
        return this._woodData[type].find((wood) => wood.name === woodName)?.id ?? 0
    }

    _setupData(): void {
        this.propertyNames = new Set<string>(
            [
                ...this._woodData.frame.flatMap((frame) => frame.properties.map((property) => property.modifier)),
                ...this._woodData.trim.flatMap((trim) => trim.properties.map((property) => property.modifier)),
            ].sort(simpleStringSort)
        )

        if (this.baseFunction === "wood") {
            this._defaultWoodId = {
                frame: this._findWoodId("frame", "Fir"),
                trim: this._findWoodId("trim", "Crew Space"),
            }
            this._columnsCompare = ["C1", "C2", "C3"]
        } else if (this.baseFunction === "wood-journey") {
            this._defaultWoodId = {
                frame: this._findWoodId("frame", "Oak"),
                trim: this._findWoodId("trim", "Oak"),
            }
            this._columnsCompare = []
        } else {
            this._defaultWoodId = {
                frame: this._findWoodId("frame", "Oak"),
                trim: this._findWoodId("trim", "Oak"),
            }
            this._columnsCompare = ["C1", "C2"]
        }

        this._columns = this._columnsCompare.slice()
        this._columns.unshift("Base")
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            this._woodData = (await import(/* webpackChunkName: "data-woods" */ "Lib/gen-generic/woods.json"))
                .default as WoodData
            this._setupData()
        } catch (error) {
            putImportError(error)
        }
    }

    _setupListener(): void {
        let firstClick = true
        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)
            event.stopPropagation()
            this._woodCompareSelected()
        })
    }

    _woodCompareSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }

    _initData(): void {
        this._frameSelectData = this._woodData.frame.sort(sortBy(["name"]))
        this._trimSelectData = this._woodData.trim.sort(sortBy(["name"]))
        this._setOption(
            this._frameSelectData.map((wood) => `<option value="${wood.id}">${wood.name}</option>`).toString(),
            this._trimSelectData.map((wood) => `<option value="${wood.id}">${wood.name}</option>`).toString()
        )

        for (const propertyName of this.propertyNames) {
            const frames = [
                ...this._woodData.frame.map(
                    (frame) => frame.properties.find((modifier) => modifier.modifier === propertyName)?.amount ?? 0
                ),
            ]
            const trims = [
                ...this._woodData.trim.map(
                    (trim) => trim.properties.find((modifier) => modifier.modifier === propertyName)?.amount ?? 0
                ),
            ]

            const minFrames = d3Min(frames) ?? 0
            const maxFrames = d3Max(frames) ?? 0
            const minTrims = d3Min(trims) ?? 0
            const maxTrims = d3Max(trims) ?? 0
            this._addMinMaxProperty(propertyName, {
                min: minFrames + minTrims >= 0 ? 0 : minFrames + minTrims,
                max: maxFrames + maxTrims,
            })
        }
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName })

        const row = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("class", "container-fluid")
            .append("div")
            .attr("class", "row wood")
        for (const column of this._columns) {
            const div = row
                .append("div")
                .attr("class", `col-md-3 ml-auto pt-2 ${column === "Base" ? "column-base" : "column-comp"}`)
            for (const type of woodType) {
                const id = `${this.baseFunction}-${type}-${column}-select`
                div.append("label").attr("for", id)
                div.append("select").attr("name", id).attr("id", id).attr("class", "selectpicker")
            }

            div.append("div").attr("id", `${this.baseFunction}-${column}`)
        }
    }

    _initModal(): void {
        this._initData()
        this._injectModal()

        for (const compareId of this._columns) {
            for (const type of woodType) {
                const select$ = $(`#${this.baseFunction}-${type}-${compareId}-select`)
                this._setupWoodSelects(compareId, type, select$)
                this._setupSelectListener(compareId, type, select$)
            }
        }
    }

    _setWoodsSelected(compareId: WoodColumnType, type: WoodType, woodId: number): void {
        if (!this._woodIdsSelected[compareId]) {
            this._woodIdsSelected[compareId] = {}
        }

        this._woodIdsSelected[compareId][type] = woodId
    }

    _setupWoodSelects(compareId: WoodColumnType, type: WoodType, select$: JQuery): void {
        this._setWoodsSelected(compareId, type, this._defaultWoodId[type])
        select$.append(this._options[type])
        if (this.baseFunction !== "wood" || (compareId !== "Base" && this.baseFunction === "wood")) {
            select$.attr("disabled", "disabled")
        }
    }

    _setOtherSelect(columnId: WoodColumnType, type: WoodType): void {
        const otherType = type === "frame" ? "trim" : "frame"

        if (this._woodIdsSelected[columnId][otherType] === this._defaultWoodId[otherType]) {
            $(`#${this.baseFunction}-${otherType}-${columnId}-select`)
                .val(this._defaultWoodId[otherType])
                .selectpicker("refresh")
        }
    }

    enableSelects(id: WoodColumnType): void {
        for (const type of woodType) {
            $(`#${this.baseFunction}-${type}-${id}-select`).removeAttr("disabled").selectpicker("refresh")
        }
    }

    _woodSelected(compareId: WoodColumnType, type: WoodType, select$: JQuery): void {
        const woodId = Number(select$.val())

        this._setWoodsSelected(compareId, type, woodId)
        this._setOtherSelect(compareId, type)

        if (compareId === "Base") {
            this._addInstance(compareId, new WoodBase("Base", this._getWoodData("Base"), this))

            for (const columnId of this._columnsCompare) {
                // For wood-compare: add instances with enabling selects
                // For ship-compare: add instances without enabling selects
                if (this.baseFunction === "wood") {
                    this.enableSelects(columnId)
                }

                if (this.instances[columnId]) {
                    this._addInstance(
                        columnId,
                        new WoodComparison(columnId, this._getWoodData("Base"), this._getWoodData(columnId), this)
                    )
                }
            }
        } else {
            this._addInstance(
                compareId,
                new WoodComparison(compareId, this._getWoodData("Base"), this._getWoodData(compareId), this)
            )
        }
    }

    _setupSelectListener(compareId: WoodColumnType, type: WoodType, select$: JQuery): void {
        select$
            .on("change", () => this._woodSelected(compareId, type, select$))
            .selectpicker({ title: `Select ${type}` })
    }

    _getWoodData(id: WoodColumnType): SelectedWood {
        return {
            frame: this.getWoodTypeData("frame", this._woodIdsSelected[id].frame),
            trim: this.getWoodTypeData("trim", this._woodIdsSelected[id].trim),
        }
    }

    _addMinMaxProperty(property: string, minMax: MinMax): void {
        this.minMaxProperty.set(property, minMax)
    }

    _setOption(frame: HtmlString, trim: HtmlString): void {
        this._options.frame = frame
        this._options.trim = trim
    }

    _addInstance(id: WoodColumnType, woodInstance: WoodBase | WoodComparison): void {
        this.instances[id] = woodInstance
    }

    getWoodTypeData(type: WoodType, woodId: number): WoodTrimOrFrame {
        return this._woodData[type].find((wood) => wood.id === woodId) ?? ({} as WoodTrimOrFrame)
    }
}
