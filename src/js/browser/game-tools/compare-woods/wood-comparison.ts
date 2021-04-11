/*!
 * This file is part of na-map.
 *
 * @file      Compare woods WoodComparison class.
 * @module    game-tools/compare-woods/wood-comparison
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { formatFloat, formatPercent, formatSignFloat } from "common/common-format"

import { HtmlString } from "common/interface"
import { Amount, SelectedWood, WoodCompareAmount, WoodDisplayCompareData } from "compare-woods"
import { WoodColumnType } from "./index"

import { Wood } from "./wood"
import { WoodData } from "./data"

export class WoodComparison extends Wood {
    readonly #selectedBaseWoodData: SelectedWood
    readonly #selectedCompareWoodData: SelectedWood

    // eslint-disable-next-line max-params
    constructor(
        id: HtmlString,
        compareId: WoodColumnType,
        woodData: WoodData,
        baseData: SelectedWood,
        compareData: SelectedWood
    ) {
        super(id, compareId, woodData)

        this.#selectedBaseWoodData = baseData
        this.#selectedCompareWoodData = compareData

        this._printTextComparison()
    }

    static _getDiff(a: number, b: number, isPercentage: boolean, decimals = 1): HtmlString {
        const diff = Number.parseFloat((a - b).toFixed(decimals))
        const value = isPercentage ? formatPercent(a / 100, decimals) : formatFloat(a)

        return `${value} <span class="badge bg-white text-dark">${formatSignFloat(diff)}</span>`
    }

    _getBasePropertySum(propertyName: string): Amount {
        const basePropertyFrame = super.getProperty(this.#selectedBaseWoodData, "frame", propertyName)
        const basePropertyTrim = super.getProperty(this.#selectedBaseWoodData, "trim", propertyName)

        return {
            amount: basePropertyFrame.amount + basePropertyTrim.amount,
            isPercentage: basePropertyTrim.isPercentage,
        }
    }

    _getComparePropertySum(propertyName: string): Amount {
        const comparePropertyFrame = super.getProperty(this.#selectedCompareWoodData, "frame", propertyName)
        const comparePropertyTrim = super.getProperty(this.#selectedCompareWoodData, "trim", propertyName)

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
        let text = '<table class="table table-striped small wood mt-4"><thead>'
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
                    (base / super.woodData.getMaxProperty(key)) * middle
                }%;"></span>`
                text += `<span class="bar ${diffColour}" style="width:${
                    (diff / super.woodData.getMaxProperty(key)) * middle
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
                    middle + (neutral / super.woodData.getMinProperty(key)) * middle
                }%;"></span>`
                text += `<span class="bar ${diffColour}" style="width:${
                    (diff / super.woodData.getMinProperty(key)) * middle
                }%;"></span>`
                text += `<span class="bar neg diff" style="width:${
                    (base / super.woodData.getMinProperty(key)) * middle
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
            frame: this.#selectedCompareWoodData.frame.name,
            trim: this.#selectedCompareWoodData.trim.name,
            properties: new Map<string, WoodCompareAmount>(),
        } as WoodDisplayCompareData

        for (const propertyName of super.woodData.propertyNames) {
            const basePropertySum = this._getBasePropertySum(propertyName)
            const comparePropertySum = this._getComparePropertySum(propertyName)
            wood.properties.set(propertyName, {
                base: basePropertySum.amount,
                compare: comparePropertySum.amount,
                isPercentage: basePropertySum.isPercentage,
            })
        }

        super.div.html(this._getText(wood))
    }
}
