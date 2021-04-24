/*!
 * This file is part of na-map.
 *
 * @file      Compare woods ColumnCompare class.
 * @module    game-tools/compare-woods/wood-comparison
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { formatFloat, formatPercent, formatSignFloat } from "common/common-format"

import { HtmlString } from "common/interface"
import { Amount, SelectedWood, WoodCompareAmount } from "compare-woods"

import { Column } from "./column"
import { WoodData } from "./data"

type PropertyMap = Map<string, WoodCompareAmount>

export class ColumnCompare extends Column {
    readonly #selectedBaseWoodData: SelectedWood
    readonly #selectedCompareWoodData: SelectedWood

    constructor(divOutputId: HtmlString, woodData: WoodData, baseData: SelectedWood, compareData: SelectedWood) {
        super(divOutputId, woodData)

        this.#selectedBaseWoodData = baseData
        this.#selectedCompareWoodData = compareData

        this._printTextComparison()
    }

    static _getDiff(a: number, b: number, isPercentage: boolean, decimals = 1): HtmlString {
        const diff = Number.parseFloat((a - b).toFixed(decimals))
        const value = isPercentage ? formatPercent(a / 100, decimals) : formatFloat(a)

        return `${value} <span class="badge bg-white text-dark">${formatSignFloat(diff)}</span>`
    }

    _getBasePropertySum(modifierName: string): Amount {
        const basePropertyFrame = super.getProperty(this.#selectedBaseWoodData.frame, modifierName)
        const basePropertyTrim = super.getProperty(this.#selectedBaseWoodData.trim, modifierName)

        return {
            amount: basePropertyFrame.amount + basePropertyTrim.amount,
            isPercentage: basePropertyTrim.isPercentage,
        }
    }

    _getComparePropertySum(modifierName: string): Amount {
        const comparePropertyFrame = super.getProperty(this.#selectedCompareWoodData.frame, modifierName)
        const comparePropertyTrim = super.getProperty(this.#selectedCompareWoodData.trim, modifierName)

        return {
            amount: comparePropertyFrame.amount + comparePropertyTrim.amount,
            isPercentage: comparePropertyFrame.isPercentage && comparePropertyTrim.isPercentage,
        }
    }

    // noinspection FunctionTooLongJS
    _getText(properties: PropertyMap): HtmlString {
        const middle = 100 / 2
        let base = 0
        let diff = 0
        let neutral = 0
        let diffColour = ""
        let text = '<table class="table table-striped small wood mt-4"><thead>'
        text += '<tr><th scope="col">Property</th><th scope="col">Change</th></tr></thead><tbody>'
        for (const [key, value] of properties) {
            text += `<tr><td>${key}</td><td>${ColumnCompare._getDiff(value.compare, value.base, value.isPercentage)}`
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
                text += `<span class="bar pos diff" style="width:${(base / value.max) * middle}%;"></span>`
                text += `<span class="bar ${diffColour}" style="width:${(diff / value.max) * middle}%;"></span>`
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

                text += `<span class="bar neutral" style="width:${middle + (neutral / value.min) * middle}%;"></span>`
                text += `<span class="bar ${diffColour}" style="width:${(diff / value.min) * middle}%;"></span>`
                text += `<span class="bar neg diff" style="width:${(base / value.min) * middle}%;"></span>`
            } else {
                text += '<span class="bar neutral"></span>'
            }

            text += "</span></td></tr>"
        }

        text += "</tbody></table>"
        return text
    }

    _printTextComparison(): void {
        const properties = new Map() as PropertyMap

        for (const modifierName of super.woodData.modifierNames) {
            const basePropertySum = this._getBasePropertySum(modifierName)
            const comparePropertySum = this._getComparePropertySum(modifierName)
            properties.set(modifierName, {
                base: basePropertySum.amount,
                compare: comparePropertySum.amount,
                isPercentage: basePropertySum.isPercentage,
                min: super.woodData.getMinProperty(modifierName),
                max: super.woodData.getMaxProperty(modifierName),
            })
        }

        super.div.html(this._getText(properties))
    }
}
