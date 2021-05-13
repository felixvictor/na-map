/*!
 * This file is part of na-map.
 *
 * @file      Compare woods ColumnBase class.
 * @module    game-tools/compare-woods/wood-base
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { formatFloat, formatPercentOldstyle } from "common/common-format"

import { HtmlString } from "common/interface"
import { Amount, SelectedWood, WoodBaseAmount } from "compare-woods"

import { Column } from "./column"
import { WoodData } from "./data"

type PropertyMap = Map<string, WoodBaseAmount>

export class ColumnBase extends Column {
    readonly #selectedWoodData: SelectedWood

    constructor(divOutputId: HtmlString, woodData: WoodData, baseWoodData: SelectedWood) {
        super(divOutputId, woodData)

        this.#selectedWoodData = baseWoodData

        this._printText()
    }

    _getPropertySum(modifierName: string): Amount {
        const propertyFrame = super.getProperty(this.#selectedWoodData.frame, modifierName)
        const propertyTrim = super.getProperty(this.#selectedWoodData.trim, modifierName)

        return {
            amount: propertyFrame.amount + propertyTrim.amount,
            isPercentage: propertyTrim.isPercentage,
        }
    }

    _getText(properties: PropertyMap): HtmlString {
        const middle = 100 / 2
        let text = '<table class="table table-striped small wood mt-4"><thead>'
        text += '<tr><th scope="col">Property</th><th scope="col">Change</th></tr></thead><tbody>'
        for (const [key, value] of properties) {
            text += `<tr><td>${key}</td><td>${
                value.isPercentage ? formatPercentOldstyle(value.amount / 100) : formatFloat(value.amount)
            }`
            text += '<span class="rate">'
            if (value.amount > 0) {
                const right = (value.amount / value.max) * middle
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`
                text += `<span class="bar pos diff" style="width:${right}%;"></span>`
            } else if (value.amount < 0) {
                const right = (value.amount / value.min) * middle
                const left = middle - right
                text += `<span class="bar neutral" style="width:${left}%;"></span>`
                text += `<span class="bar neg diff" style="width:${right}%;"></span>`
            } else {
                text += '<span class="bar neutral"></span>'
            }

            text += "</span></td></tr>"
        }

        text += "</tbody></table>"
        return text
    }

    _printText(): void {
        const properties = new Map() as PropertyMap

        for (const modifierName of super.woodData.modifierNames) {
            const property = this._getPropertySum(modifierName)
            properties.set(modifierName, {
                amount: property.amount,
                isPercentage: property.isPercentage,
                min: super.woodData.getMinProperty(modifierName),
                max: super.woodData.getMaxProperty(modifierName),
            })
        }

        super.div.html(this._getText(properties))
    }
}
