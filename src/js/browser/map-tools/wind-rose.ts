/*!
 * This file is part of na-map.
 *
 * @file      Show wind rose continuously.
 * @module    map-tools/wind-rose
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"
import "bootstrap/js/dist/tooltip"

import { select as d3Select } from "d3-selection"
import * as d3Selection from "d3-selection"
import { Line, line as d3Line } from "d3-shape"
import moment from "moment"

import "moment/locale/en-gb"
import "round-slider/src/roundslider"

import "round-slider/src/roundslider.css"
import { registerEvent } from "../analytics"
import { degreesPerSecond, HtmlString, insertBaseModal } from "../../common/common-browser"
import { compassDirections, degreesToRadians } from "../../common/common-math"
import { displayCompass, getUserWind, printSmallCompassRose } from "../util"
import Cookie from "../util/cookie"

export default class WindRose {
    private readonly _line: Line<[number, number]>
    private _windPath: d3Selection.Selection<SVGPathElement, unknown, HTMLElement, any> | null
    private readonly _windArrowWidth: number
    private readonly _intervalSeconds: number
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private readonly _formId: HtmlString
    private readonly _sliderId: HtmlString
    private readonly _cookieExpire: number | Date
    private readonly _cookieWindDegrees: Cookie
    private readonly _cookieTime: Cookie
    private _currentWindDegrees: number
    private _height!: number
    private _yCompass!: number
    private _width!: number
    private _xCompass!: number
    private _compassRadius!: number
    private _length!: number
    private _intervalId!: number
    private _svg!: d3Selection.Selection<SVGSVGElement, unknown, HTMLElement, any>
    private _div!: d3Selection.Selection<HTMLDivElement, unknown, HTMLElement, any>

    constructor() {
        this._line = d3Line()
            .x((d) => d[0])
            .y((d) => d[1])
        this._windPath = null

        this._windArrowWidth = 4
        this._intervalSeconds = 40

        this._baseName = "In-game wind"
        this._baseId = "ingame-wind"
        this._buttonId =`button-${this._baseId}`
        this._modalId =`modal-${this._baseId}`
        this._formId =`form-${this._baseId}`
        this._sliderId =`slider-${this._baseId}`

        this._cookieExpire = this._getExpire()

        /**
         * Wind correctionValueDegrees cookie
         */
        this._cookieWindDegrees = new Cookie({
            id:`${this._baseId}-degrees`,
            expire: this._cookieExpire,
        })

        /**
         * Wind correctionValueDegrees time cookie
         */
        this._cookieTime = new Cookie({ id:`${this._baseId}-time`})

        /**
         * Get current wind from cookie or use default value
         */
        this._currentWindDegrees = this._getCurrentWindCookie()

        this._setupListener()
        if (this._currentWindDegrees) {
            this._initShowCurrentWind()
        }
    }

    _getHeight(): number {
        const div = document.querySelector("#port-summary .block")
        if (div) {
            const { height, top } = div.getBoundingClientRect()
            const paddingTop = Number.parseFloat(window.getComputedStyle(div).getPropertyValue("padding-top"))
            const paddingBottom = Number.parseFloat(window.getComputedStyle(div).getPropertyValue("padding-bottom"))

            return height - top - paddingTop - paddingBottom
        }

        return 0
    }

    _getCurrentWindCookie(): number {
        // Use default value if cookie is not stored
        const wind = Number(this._cookieWindDegrees.get())
        if (wind) {
            const time = Number(this._cookieTime.get())
            // Difference in seconds since wind has been stored
            const diffSeconds = Math.round((Date.now() - time) / 1000)
            this._currentWindDegrees = 360 + (Math.floor(wind - degreesPerSecond * diffSeconds) % 360)
        }

        return wind
    }

    _getExpire(): Date {
        const now = moment.utc()
        let end = moment().utc().hour(10).minute(0).second(0)

        if (now.hour() >= end.hour()) {
            end = end.add(1, "day")
        }

        return end.local().toDate()
    }

    /**
     * Store current wind in cookie
     */
    _storeCurrentWindCookie(): void {
        this._cookieWindDegrees.set(String(this._currentWindDegrees))
        this._cookieTime.set(String(Date.now()))
    }

    _setupSvg(): void {
        const portSummary = d3Select("#port-summary")

        portSummary.classed("port-summary-no-wind", false).classed("port-summary-wind", true)

        this._div = portSummary.insert("div", ":first-child").attr("id", this._baseId).attr("class", "block p-0")
        this._svg = this._div.append("svg").attr("class", "ingame-wind small")
    }

    _navbarClick(event: Event): void {
        registerEvent("Menu", this._baseName)
        event.stopPropagation()
        this._windRoseSelected()
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
        const slider = formGroupA.append("div").attr("class", "alert alert-primary")
        slider.append("label").attr("for", this._sliderId).text("Current in-game wind")
        slider.append("div").attr("id", this._sliderId).attr("class", "rslider")
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
    _windRoseSelected(): void {
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

    _windChange(): void {
        this._currentWindDegrees = 360 + ((this._currentWindDegrees - degreesPerSecond * this._intervalSeconds) % 360)

        this._updateWindDirection()
    }

    _useUserInput(): void {
        this._currentWindDegrees = getUserWind(this._sliderId)

        if (this._windPath) {
            this._updateWindDirection()
        } else {
            this._initShowCurrentWind()
        }
    }

    _initShowCurrentWind(): void {
        this._setupSvg()
        this._initPrintCompassRose()
        this._updateWindDirection()
        this._intervalId = window.setInterval(() => {
            this._windChange()
        }, this._intervalSeconds * 1000)
    }

    _updateWindDirection(): void {
        const radians = degreesToRadians(this._currentWindDegrees)
        const dx = this._length * Math.cos(radians)
        const dy = this._length * Math.sin(radians)
        const lineData = [
            [Math.round(this._xCompass + dx), Math.round(this._yCompass + dy)],
            [Math.round(this._xCompass - dx), Math.round(this._yCompass - dy)],
        ] as Array<[number, number]>
        if (this._windPath) {
            this._windPath.datum(lineData).attr("d", this._line)
            this._storeCurrentWindCookie()
        }
    }

    _initPrintCompassRose(): void {
        this._height = this._getHeight()
        this._yCompass = this._height / 2
        this._width = this._height
        this._xCompass = this._width / 2
        this._compassRadius = Math.min(this._height, this._width) / 2
        this._length = this._compassRadius * 0.6

        this._svg.attr("height", this._height).attr("width", this._width)

        // Compass rose
        const compassElement = this._svg
            .append("svg")
            .attr("class", "compass")
            .attr("x", this._xCompass)
            .attr("y", this._yCompass)
        // @ts-ignore
        printSmallCompassRose({ element: compassElement, radius: this._compassRadius })

        this._windPath = this._svg.append("path").attr("marker-end", "url(#wind-arrow)")
    }

    clearMap(): void {
        window.clearInterval(this._intervalId)
        if (this._div) {
            this._div.remove()
        }

        this._windPath = null
        this._cookieWindDegrees.remove()
    }
}
