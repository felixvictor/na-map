/*!
 * This file is part of na-map.
 *
 * @file      Predict wind.
 * @module    map-tools/predict-wind
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import { select as d3Select } from "d3-selection"
import * as d3Selection from "d3-selection"
import { line as d3Line } from "d3-shape"

import moment, { Moment } from "moment"
import "moment/locale/en-gb"

import "round-slider/src/roundslider"
import "round-slider/src/roundslider.css"
import "../../../scss/roundslider.scss"

import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4"
import "tempusdominus-core/build/js/tempusdominus-core"

import { registerEvent } from "../analytics"
import { degreesPerSecond, HtmlString, insertBaseModal } from "../../common/common-browser"
import { compassDirections, compassToDegrees, degreesToCompass, degreesToRadians } from "../../common/common-math"
import { displayCompass, displayCompassAndDegrees, getUserWind, printCompassRose } from "../util"

export default class PredictWind {
    private readonly _height: number
    private readonly _width: number
    private readonly _windArrowWidth: number
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private readonly _formId: HtmlString
    private readonly _sliderId: HtmlString
    private readonly _timeGroupId: HtmlString
    private readonly _timeInputId: HtmlString
    private _svg!: d3Selection.Selection<SVGSVGElement, unknown, HTMLElement, any>
    constructor() {
        this._height = 300
        this._width = 260
        this._windArrowWidth = 3

        this._baseName = "Predict wind"
        this._baseId = "predict-wind"
        this._buttonId =`button-${this._baseId}`
        this._modalId =`modal-${this._baseId}`
        this._formId =`form-${this._baseId}`
        this._sliderId =`slider-${this._baseId}`
        this._timeGroupId =`input-group-${this._baseId}`
        this._timeInputId =`input-${this._baseId}`

        this._setupSvg()
        this._setupArrow()
        this._setupListener()
    }

    _setupSvg(): void {
        this._svg = d3Select("#wind svg")
    }

    _setupArrow(): void {
        const width = this._windArrowWidth
        const doubleWidth = this._windArrowWidth * 2

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "wind-arrow")
            .attr("viewBox",`0 -${width} ${doubleWidth} ${doubleWidth}`)
            .attr("refX", width)
            .attr("refY", 0)
            .attr("markerWidth", width)
            .attr("markerHeight", width)
            .attr("orient", "auto")
            .append("path")
            .attr("d",`M0,-${width}L${doubleWidth},0L0,${width}`)
            .attr("class", "wind-predict-arrow-head")
    }

    _navbarClick(event: Event): void {
        registerEvent("Menu", this._baseName)
        event.stopPropagation()
        this._windSelected()
    }

    _setupListener(): void {
        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", (event) => this._navbarClick(event))
    }

    _setupWindInput(): void {
        // workaround from https://github.com/soundar24/roundSlider/issues/71
        // eslint-disable-next-line prefer-destructuring
        const _getTooltipPos: () => RoundSliderPos = $.fn.roundSlider.prototype._getTooltipPos
        $.fn.roundSlider.prototype._getTooltipPos = function (): RoundSliderPos {
            if (!this.tooltip.is(":visible")) {
                $("body").append(this.tooltip)
            }

            const pos = _getTooltipPos.call(this)
            this.container.append(this.tooltip)
            return pos
        }

        // @ts-ignore
        window.tooltip = (arguments_) =>`${displayCompass(arguments_.value)}<br>${String(arguments_.value)}°`

        $(`#${this._sliderId}`).roundSlider({
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
                // @ts-ignore
                this.control.css("display", "block")
            },
        })
    }

    _injectModal(): void {
        moment.locale("en-gb")

        insertBaseModal({ id: this._modalId, title: this._baseName, size: "sm" })

        const body = d3Select(`#${this._modalId} .modal-body`)
        const form = body.append("form").attr("id", this._formId)

        const formGroupA = form.append("div").attr("class", "form-group")
        const slider = formGroupA.append("div").classed("alert alert-primary", true)
        slider.append("label").attr("for", this._sliderId).text("Current in-game wind")
        slider.append("div").attr("id", this._sliderId).attr("class", "rslider")

        const formGroupB = form.append("div").attr("class", "form-group")
        const block = formGroupB.append("div").attr("class", "alert alert-primary")
        block.append("label").attr("for", this._timeInputId).text("Predict time (server time)")

        const inputGroup = block
            .append("div")
            .classed("input-group date", true)
            .attr("id", this._timeGroupId)
            .attr("data-target-input", "nearest")
        inputGroup
            .append("input")
            .classed("form-control datetimepicker-input", true)
            .attr("type", "text")
            .attr("id", this._timeInputId)
            .attr("data-target",`#${this._timeGroupId}`)
            .attr("aria-label", this._timeGroupId)
            .attr("required", "")
        inputGroup
            .append("div")
            .classed("input-group-append", true)
            .attr("data-target",`#${this._timeGroupId}`)
            .attr("data-toggle", "datetimepicker")
            .append("span")
            .attr("class", "input-group-text")
            .append("i")
            .attr("class", "icon icon-clock")

        $(`#${this._timeGroupId}`).datetimepicker({
            defaultDate: moment.utc(),
            format: "LT",
        })
    }

    /**
     * Init modal
     */
    _initModal(): void {
        this._injectModal()
        this._setupWindInput()
    }

    /**
     * Action when selected
     */
    _windSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`)
            .modal("show")
            .one("hidden.bs.modal", () => {
                this._useUserInput()
            })
    }

    _useUserInput(): void {
        const currentWind = getUserWind(this._sliderId)
        const time = ($(`#${this._timeInputId}`).val()! as string).trim()

        this._predictWind(currentWind, time)
    }

    _predictWind(currentUserWind: number, predictUserTime: string): void {
        moment.locale("en-gb")

        const timeFormat = "H.mm"
        let currentWindDegrees: number | string

        const regex = /(\d+)[\s.:](\d+)/
        const match = regex.exec(predictUserTime)
        const predictHours = Number.parseInt(match![1], 10)
        const predictMinutes = Number.parseInt(match![2], 10)

        // Set current wind in correctionValueDegrees
        if (Number.isNaN(Number(currentUserWind))) {
            currentWindDegrees = compassToDegrees(String(currentUserWind))
        } else {
            currentWindDegrees = Number(currentUserWind)
        }

        const currentTime = moment().utc().seconds(0).milliseconds(0)
        const predictTime = moment(currentTime).hour(predictHours).minutes(predictMinutes)
        if (predictTime.isBefore(currentTime)) {
            predictTime.add(1, "day")
        }

        const timeDiffInSec = predictTime.diff(currentTime, "seconds")
        const predictedWindDegrees = 360 + ((currentWindDegrees - degreesPerSecond * timeDiffInSec) % 360)

        this._printPredictedWind(
            predictedWindDegrees,
            predictTime.format(timeFormat),
            degreesToCompass(currentUserWind),
            currentTime.format(timeFormat)
        )
    }

    _printCompass(predictedWindDegrees: number): void {
        const line = d3Line<[number, number]>()
        const radius = Math.min(this._height / 1.4, this._width / 1.4) / 2
        const xCompass = this._width / 2
        const yCompass = this._height / 2.8
        const radians = degreesToRadians(predictedWindDegrees)
        const length = radius * 0.6
        const dx = length * Math.cos(radians)
        const dy = length * Math.sin(radians)
        const lineData = [
            [Math.round(xCompass + dx), Math.round(yCompass + dy)],
            [Math.round(xCompass - dx), Math.round(yCompass - dy)],
        ] as Array<[number, number]>

        this._svg.attr("height", this._height).attr("width", this._width)

        // Compass rose
        const compassElem = this._svg.append("svg").attr("class", "compass").attr("x", xCompass).attr("y", yCompass)
        // @ts-ignore
        printCompassRose({ element: compassElem, radius })

        // Wind direction
        this._svg.append("path").datum(lineData).attr("d", line).attr("marker-end", "url(#wind-arrow)")
    }

    _printText(predictedWindDegrees: number, predictTime: string, currentWind: string, currentTime: string): void {
        const compass = degreesToCompass(predictedWindDegrees)
        const lineHeight = Number.parseInt(
            window.getComputedStyle(document.querySelector("#wind")!).getPropertyValue("line-height"),
            10
        )
        const textSvg = this._svg.append("svg")

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
            .attr("x", (this._width - textWidth) / 2)
            .attr("y", "72%")
            .attr("height", textHeight)
            .attr("width", textWidth)
    }

    _addBackground(): void {
        this._svg
            .insert("rect", ":first-child")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", this._height)
            .attr("width", this._width)
    }

    _printPredictedWind(
        predictedWindDegrees: number,
        predictTime: string,
        currentWind: string,
        currentTime: string
    ): void {
        this.clearMap()
        this._svg.classed("d-none", false)

        this._printCompass(predictedWindDegrees)
        this._printText(predictedWindDegrees, predictTime, currentWind, currentTime)
        this._addBackground()
    }

    setPosition(topMargin: number, leftMargin: number): void {
        this._svg.style("margin-left",`${leftMargin}px`).style("margin-top",`${topMargin}px`)
    }

    clearMap(): void {
        this._svg.selectAll("*").remove()
        this._svg.classed("d-none", true)
    }
}
