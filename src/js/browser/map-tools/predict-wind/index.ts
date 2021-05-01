/*!
 * This file is part of na-map.
 *
 * @file      Predict wind.
 * @module    map-tools/predict-wind
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select, Selection } from "d3-selection"
import { line as d3Line } from "d3-shape"

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import utc from "dayjs/plugin/utc"
dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.locale("en-gb")

import { registerEvent } from "../../analytics"
import { degreesPerSecond, getIdFromBaseName } from "common/common-browser"
import { compassToDegrees, degreesToCompass, degreesToRadians } from "common/common-math"
import { displayCompassAndDegrees, printCompassRose } from "../../util"

import { HtmlString } from "common/interface"

import PredictWindModal from "./modal"

export default class PredictWind {
    #modal: PredictWindModal | undefined = undefined
    #svg = {} as Selection<SVGSVGElement, unknown, HTMLElement, unknown>

    readonly #baseId: HtmlString
    readonly #baseName = "Predict wind"
    readonly #height = 300
    readonly #menuId: HtmlString
    readonly #width = 260
    readonly #arrowId = "wind-arrow"

    constructor() {
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`

        this._setupListener()
    }

    _setupSvg(): void {
        this.#svg = d3Select("#wind svg")
    }

    _menuClicked(): void {
        registerEvent("Menu", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            this._setupSvg()
            this.#modal = new PredictWindModal(this.#baseName)
            this.#modal.getModalNode().addEventListener("hidden.bs.modal", () => {
                this._useUserInput()
            })
        }
    }

    _setupListener(): void {
        ;(document.querySelector(`#${this.#menuId}`) as HTMLElement).addEventListener("click", () => {
            this._menuClicked()
        })
    }

    _useUserInput(): void {
        const currentWind = this.#modal!.getWind()
        const time = this.#modal!.getTime()

        this._predictWind(currentWind, time)
    }

    _predictWind(currentUserWind: number, predictUserTime: string): void {
        const timeFormat = "H.mm"
        let currentWindDegrees: number | string

        const regex = /(\d+)[\s.:](\d+)/
        const match = regex.exec(predictUserTime)
        const predictHours = Number.parseInt(match![1], 10)
        const predictMinutes = Number.parseInt(match![2], 10)

        // Set current wind in correctionValueDegrees
        // eslint-disable-next-line unicorn/prefer-ternary
        if (Number.isNaN(Number(currentUserWind))) {
            currentWindDegrees = compassToDegrees(String(currentUserWind))
        } else {
            currentWindDegrees = Number(currentUserWind)
        }

        const currentTime = dayjs().utc().second(0).millisecond(0)
        const predictTime = dayjs(currentTime).hour(predictHours).minute(predictMinutes)
        if (predictTime.isBefore(currentTime)) {
            predictTime.add(1, "day")
        }

        const timeDiffInSec = predictTime.diff(currentTime, "second")
        const predictedWindDegrees = 360 + ((currentWindDegrees - degreesPerSecond * timeDiffInSec) % 360)

        this._printPredictedWind(
            predictedWindDegrees,
            predictTime.format(timeFormat),
            degreesToCompass(currentUserWind),
            currentTime.format(timeFormat)
        )
    }

    _printCompass(predictedWindDegrees: number): void {
        const line = d3Line()
        const radius = Math.min(this.#height / 1.4, this.#width / 1.4) / 2
        const xCompass = this.#width / 2
        const yCompass = this.#height / 2.8
        const radians = degreesToRadians(predictedWindDegrees)
        const length = radius * 0.6
        const dx = length * Math.cos(radians)
        const dy = length * Math.sin(radians)
        const lineData = [
            [Math.round(xCompass + dx), Math.round(yCompass + dy)],
            [Math.round(xCompass - dx), Math.round(yCompass - dy)],
        ] as Array<[number, number]>

        this.#svg.attr("height", this.#height).attr("width", this.#width)

        // Compass rose
        const compassElem = this.#svg.append("svg").attr("class", "compass").attr("x", xCompass).attr("y", yCompass)
        printCompassRose({ element: compassElem, radius })

        // Wind direction
        this.#svg
            .append("path")
            .attr("class", "svg-stroke-thick")
            .datum(lineData)
            .attr("d", line)
            .attr("marker-end", `url(#${this.#arrowId})`)
    }

    _printText(predictedWindDegrees: number, predictTime: string, currentWind: string, currentTime: string): void {
        const compass = degreesToCompass(predictedWindDegrees)
        const lineHeight = Number.parseInt(
            window.getComputedStyle(document.querySelector("#wind")!).getPropertyValue("line-height"),
            10
        )
        const textSvg = this.#svg.append("svg")

        const text1 = textSvg
            .append("text")
            .attr("x", "50%")
            .attr("y", "33%")
            .html(`From ${displayCompassAndDegrees(compass, true)} at ${predictTime}`)

        const text2 = textSvg
            .append("text")
            .attr("x", "50%")
            .attr("y", "66%")
            .attr("class", "text-light-separation")
            .html(`Currently at ${currentTime} from ${displayCompassAndDegrees(currentWind, true)}`)

        const bbox1 = text1.node()?.getBoundingClientRect()
        const bbox2 = text2.node()?.getBoundingClientRect()
        const textHeight = Math.max(Number(bbox1?.height), Number(bbox2?.height)) * 2 + lineHeight
        const textWidth = Math.max(Number(bbox1?.width), Number(bbox2?.width)) + lineHeight

        textSvg
            .attr("x", (this.#width - textWidth) / 2)
            .attr("y", "72%")
            .attr("height", textHeight)
            .attr("width", textWidth)
    }

    _addBackground(): void {
        this.#svg
            .insert("rect", ":first-child")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", this.#height)
            .attr("width", this.#width)
    }

    _printPredictedWind(
        predictedWindDegrees: number,
        predictTime: string,
        currentWind: string,
        currentTime: string
    ): void {
        this.clearMap()
        this.#svg.classed("d-none", false)

        this._printCompass(predictedWindDegrees)
        this._printText(predictedWindDegrees, predictTime, currentWind, currentTime)
        this._addBackground()
    }

    setPosition(topMargin: number, leftMargin: number): void {
        this.#svg.style("margin-left", `${leftMargin}px`).style("margin-top", `${topMargin}px`)
    }

    clearMap(): void {
        this.#svg.selectAll("*").remove()
        this.#svg.classed("d-none", true)
    }
}
