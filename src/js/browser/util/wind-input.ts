/*!
 * This file is part of na-map.
 *
 * @file      Wind input per slider.
 * @module    util/wind-input
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "round-slider/src/roundslider"
import "scss/roundslider.scss"

import { displayCompass } from "../util"
import { compassDirections, compassToDegrees, degreesToCompass } from "common/common-math"

import { Selection } from "d3-selection"
import { HtmlString } from "common/interface"

export default class WindInput {
    readonly #baseId: string
    readonly #formId: HtmlString
    readonly #sliderId: HtmlString
    readonly #mainElement = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>

    #slider$ = {} as JQuery

    constructor(element: Selection<HTMLDivElement, unknown, HTMLElement, unknown>, id: HtmlString) {
        this.#mainElement = element
        this.#baseId = id

        this.#formId = `form-${this.#baseId}`
        this.#sliderId = `slider-${this.#baseId}`

        this._inject()
        this.#slider$ = $(`#${this.#sliderId}`)
        this._setup()
    }

    _setup(): void {
        // @ts-expect-error
        window.tooltip = (arguments_) => `${displayCompass(arguments_.value)}<br>${String(arguments_.value)}°`

        this.#slider$.roundSlider({
            sliderType: "default",
            handleSize: "+1",
            startAngle: 90,
            width: 20,
            radius: 110,
            min: 0,
            max: 359,
            step: 360 / compassDirections.length,
            editableTooltip: false,
            tooltipFormat: "tooltip",
            create() {
                // @ts-expect-error
                this.control.css("display", "block")
            },
        })
    }

    _inject(): void {
        const form = this.#mainElement.append("form").attr("id", this.#formId)

        const formGroupA = form.append("div").attr("class", "form-group")
        const slider = formGroupA.append("div").classed("alert alert-primary", true)
        slider
            .append("label")
            .attr("for", this.#sliderId)
            .text("Current in-game wind")
        slider
            .append("div")
            .attr("id", this.#sliderId)
            .attr("class", "rslider")
    }

    _getInputValue(): number {
        return this.#slider$.roundSlider("getValue")
    }

    /**
     * Get wind
     * @returns Wind in correctionValueDegrees
     */
    getWind(): number {
        const currentUserWind = degreesToCompass(this._getInputValue())
        let windDegrees: number

        // eslint-disable-next-line unicorn/prefer-ternary
        if (Number.isNaN(Number(currentUserWind))) {
            windDegrees = compassToDegrees(currentUserWind)
        } else {
            windDegrees = Number(currentUserWind)
        }

        return windDegrees
    }
}
