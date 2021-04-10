/*!
 * This file is part of na-map.
 *
 * @file      Compare woods WoodBase class.
 * @module    game-tools/compare-woods/wood-base
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { formatFloat, formatPercent } from "common/common-format"

import { HtmlString } from "common/interface"
import { Amount, SelectedWood, WoodBaseAmount, WoodDisplayBaseData } from "compare-woods"
import { WoodColumnType } from "./index"

import { Wood } from "./wood"
import { WoodData } from "./data"

export class WoodBase extends Wood {
    readonly #selectedWoodData: SelectedWood

    constructor(id: HtmlString, compareId: WoodColumnType, woodData: WoodData, baseWoodData: SelectedWood) {
        super(id, compareId, woodData)

        this.#selectedWoodData = baseWoodData

        this._printText()
    }

    _getPropertySum(propertyName: string): Amount {
        const propertyFrame = super.getProperty(this.#selectedWoodData, "frame", propertyName)
        const propertyTrim = super.getProperty(this.#selectedWoodData, "trim", propertyName)

        return {
            amount: propertyFrame.amount + propertyTrim.amount,
            isPercentage: propertyTrim.isPercentage,
        }
    }

    _getText(wood: WoodDisplayBaseData): HtmlString {
        const middle = 100 / 2
        let text = '<table class="table table-striped small wood mt-4"><thead>'
        text += '<tr><th scope="col">Property</th><th scope="col">Change</th></tr></thead><tbody>'
        for (const [key, value] of wood.properties) {
            text += `<tr><td>${key}</td><td>${
                value.isPercentage ? formatPercent(value.amount / 100) : formatFloat(value.amount)
            }`
            text += '<span class="rate">'
            if (value.amount > 0) {
                const right = (value.amount / super.woodData.getMaxProperty(key)) * middle
                text += `<span class="bar neutral" style="width:${middle}%;"></span>`
                text += `<span class="bar pos diff" style="width:${right}%;"></span>`
            } else if (value.amount < 0) {
                const right = (value.amount / super.woodData.getMinProperty(key)) * middle
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
            frame: this.#selectedWoodData.frame.name,
            trim: this.#selectedWoodData.trim.name,
            properties: new Map<string, WoodBaseAmount>(),
        } as WoodDisplayBaseData

        for (const propertyName of super.woodData.propertyNames) {
            const property = this._getPropertySum(propertyName)
            wood.properties.set(propertyName, {
                amount: property.amount,
                isPercentage: property.isPercentage,
            })
        }

        super.div.html(this._getText(wood))
    }
}
