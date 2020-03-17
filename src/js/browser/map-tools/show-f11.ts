/*!
 * This file is part of na-map.
 *
 * @file      Show F11 coordinates.
 * @module    map-tools/show-f11
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"
import { select as d3Select } from "d3-selection"
import moment from "moment"
import "moment/locale/en-gb"

import { registerEvent } from "../analytics"
import { formatF11 } from "../../common/common-format"
import { BaseModalPure, HtmlString, insertBaseModal } from "../../common/common-browser"
import { between, convertCoordX, convertCoordY, convertInvCoordX, convertInvCoordY } from "../../common/common-math"
import { MinMaxCoord, SVGGDatum, SVGSVGDatum } from "../../common/interface"
import { copyF11ToClipboard } from "../util"

import { NAMap } from "../map/NAMap"
import * as d3Selection from "d3-selection"

/**
 * ShowF11
 */
export default class ShowF11 {
    private _map: NAMap
    private _coord: MinMaxCoord
    private _baseName: HtmlString
    private _baseId: HtmlString
    private _buttonId: HtmlString
    private _modalId: HtmlString
    private _formId: HtmlString
    private _xInputId: HtmlString
    private _zInputId: HtmlString
    private _copyButtonId: HtmlString
    private _submitButtonId: HtmlString
    private _modal$!: JQuery
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _g!: d3Selection.Selection<SVGGElement, SVGGDatum, HTMLElement, any>
    private _formSel!: HTMLFormElement
    private _xInputSel!: HTMLElement
    private _zInputSel!: HTMLElement

    constructor(map: NAMap, coord: MinMaxCoord) {
        this._map = map

        this._coord = coord

        this._baseName = "Go to F11"
        this._baseId = "go-to-f11"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`
        this._formId = `form-${this._baseId}`
        this._xInputId = `input-x-${this._baseId}`
        this._zInputId = `input-z-${this._baseId}`
        this._copyButtonId = `copy-coord-${this._baseId}`
        this._submitButtonId = `submit-${this._baseId}`

        this._setupSvg()
        this._setupListener()
    }

    _setupSvg(): void {
        this._g = d3Select<SVGSVGElement, SVGSVGDatum>("#na-svg")
            .append("g")
            .classed("f11", true)
    }

    _navbarClick(event: Event): void {
        registerEvent("Menu", "Go to F11")
        event.stopPropagation()
        this._f11Selected()
    }

    _setupListener(): void {
        document.getElementById(`${this._buttonId}`)?.addEventListener("click", event => this._navbarClick(event))
        window.addEventListener("keydown", event => {
            if (event.code === "F11" && event.shiftKey) {
                this._navbarClick(event)
            }
        })
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "sm" } as BaseModalPure)

        const body = d3Select(`#${this._modalId} .modal-body`)
        const form = body
            .append("form")
            .attr("id", this._formId)
            .attr("role", "form")
        this._formSel = form.node() as HTMLFormElement

        form.append("div")
            .classed("alert alert-primary", true)
            .text("Use F11 in open world.")

        const inputGroup1 = form
            .append("div")
            .classed("form-group", true)
            .append("div")
            .classed("input-group", true)
        inputGroup1.append("label").attr("for", this._xInputId)
        inputGroup1
            .append("input")
            .classed("form-control", true)
            .attr("id", this._xInputId)
            .attr("type", "number")
            .attr("required", "")
            .attr("placeholder", "X coordinate")
            .attr("min", "-819")
            .attr("max", "819")
            .attr("step", "1")
            .attr("tabindex", "1")

        inputGroup1
            .append("div")
            .classed("input-group-append", true)
            .append("span")
            .classed("input-group-text", true)
            .text("k")

        const inputGroup2 = form
            .append("div")
            .classed("form-group", true)
            .append("div")
            .classed("input-group", true)
        inputGroup2.append("label").attr("for", this._zInputId)
        inputGroup2
            .append("input")
            .classed("form-control", true)
            .attr("id", this._zInputId)
            .attr("type", "number")
            .attr("required", "")
            .attr("placeholder", "Z coordinate")
            .attr("step", "1")
            .attr("min", "-819")
            .attr("max", "819")
            .attr("tabindex", "2")
        inputGroup2
            .append("div")
            .classed("input-group-append", true)
            .append("span")
            .classed("input-group-text", true)
            .text("k")

        form.append("div")
            .classed("alert alert-primary", true)
            .append("small")
            .html("In k units (divide by 1,000).<br>Example: <em>43</em> for value of <em>43,162.5</em>.")

        const buttonGroup = form
            .append("div")
            .classed("float-right btn-group", true)
            .attr("role", "group")

        const button = buttonGroup
            .append("button")
            .classed("btn btn-outline-secondary icon-outline-button", true)
            .attr("id", this._copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button")
        button.append("i").classed("icon icon-copy", true)
        buttonGroup
            .append("button")
            .classed("btn btn-outline-secondary", true)
            .attr("id", this._submitButtonId)
            .attr("title", "Go to")
            .attr("type", "submit")
            .text("Go to")

        const footer = d3Select(`#${this._modalId} .modal-footer`)
        footer.remove()
    }

    /**
     * Init modal
     */
    _initModal(): void {
        this._injectModal()
    }

    /**
     * Action when selected
     */
    _f11Selected(): void {
        // If the modal has no content yet, insert it
        if (!this._modal$) {
            this._initModal()
            this._modal$ = $(`#${this._modalId}`)
            this._xInputSel = document.getElementById(this._xInputId) as HTMLElement
            this._zInputSel = document.getElementById(this._zInputId) as HTMLElement
            // Submit handler
            this._formSel.addEventListener("submit", event => {
                this._modal$.modal("hide")
                event.preventDefault()
                this._useUserInput()
            })

            // Copy coordinates to clipboard (ctrl-c key event)
            this._modal$.on("keydown", (event: KeyboardEvent): void => {
                if (event.key === "KeyC" && event.ctrlKey) {
                    this._copyCoordClicked(event)
                }
            })
            // Copy coordinates to clipboard (click event)
            document.getElementById(this._copyButtonId)?.addEventListener("click", event => {
                this._copyCoordClicked(event)
            })
        }

        // Show modal
        this._modal$.modal("show")
        this._xInputSel.focus()
        this._xInputSel.select()
    }

    _getInputValue(element): number {
        const { value } = element
        return value === "" ? Infinity : Number(value)
    }

    _getXCoord(): number {
        return this._getInputValue(this._xInputSel)
    }

    _getZCoord(): number {
        return this._getInputValue(this._zInputSel)
    }

    _useUserInput(): void {
        const x = this._getXCoord() * -1000
        const z = this._getZCoord() * -1000

        if (Number.isFinite(x) && Number.isFinite(z)) {
            this._goToF11(x, z)
        }
    }

    _copyCoordClicked(event): void {
        registerEvent("Menu", "Copy F11 coordinates")
        event.preventDefault()

        const x = this._getXCoord()
        const z = this._getZCoord()

        copyF11ToClipboard(x, z, this._modal$)
    }

    _printF11Coord(x, y, F11X, F11Y): void {
        let circleSize = 10
        const g = this._g.append("g").attr("transform", `translate(${x},${y})`)
        const coordRect = g.append("rect")
        const timeRect = g.append("rect")
        g.append("circle").attr("r", circleSize)

        // Include padding
        circleSize *= 1.6
        const F11XText = g
            .append("text")
            .attr("dx", `${-circleSize}px`)
            .attr("dy", `${-circleSize / 2 - 2}px`)
            .attr("class", "f11-coord")
            .text(formatF11(F11X))
        const F11YText = g
            .append("text")
            .attr("dx", `${-circleSize}px`)
            .attr("dy", `${circleSize / 2 + 2}px`)
            .attr("class", "f11-coord")
            .text(formatF11(F11Y))
        const F11XDim = F11XText.node().getBBox()
        const F11YDim = F11YText.node().getBBox()

        const timeStamp = moment().utc()
        const timeStampLocal = moment()
        const timeStampText = g
            .append("text")
            .attr("dx", `${circleSize}px`)
            .attr("dy", `${-circleSize / 2 - 2}px`)
            .attr("class", "f11-time")
            .text(timeStamp.format("H.mm"))
        const timeStampLocalText = g
            .append("text")
            .attr("dx", `${circleSize}px`)
            .attr("dy", `${circleSize / 2 + 2}px`)
            .attr("class", "f11-time")
            .text(`(${timeStampLocal.format("H.mm")} local)`)
        const timeStampDim = timeStampText.node().getBBox()
        const timeStampLocalDim = timeStampLocalText.node().getBBox()

        const coordHeight = Math.round(F11XDim.height + F11YDim.height) * 1.2
        const coordWidth = Math.round(Math.max(F11XDim.width, F11YDim.width) + 5)
        const timeHeight = Math.round(timeStampDim.height + timeStampLocalDim.height) * 1.2
        const timeWidth = Math.round(Math.max(timeStampDim.width, timeStampLocalDim.width) + 5)
        const height = Math.max(coordHeight, timeHeight)
        coordRect
            .attr("x", -coordWidth - circleSize)
            .attr("y", -height / 2)
            .attr("height", height)
            .attr("width", coordWidth + circleSize)
        timeRect
            .attr("x", 0)
            .attr("y", -height / 2)
            .attr("height", height)
            .attr("width", timeWidth + circleSize)
    }

    _goToF11(F11XIn, F11YIn): void {
        const F11X = Number(F11XIn)
        const F11Y = Number(F11YIn)
        const x = Math.floor(convertCoordX(F11X, F11Y))
        const y = Math.floor(convertCoordY(F11X, F11Y))

        if (between(x, this._coord.min, this._coord.max, true) && between(y, this._coord.min, this._coord.max, true)) {
            this._printF11Coord(x, y, F11X, F11Y)
            this._map.zoomAndPan(x, y, 1)
        }
    }

    /**
     * Get F11 coordinates from url query arguments and display position
     * @param urlParams - Query arguments
     */
    goToF11FromParam(urlParams: URLSearchParams): void {
        const x = Number(urlParams.get("x")) * -1000
        const z = Number(urlParams.get("z")) * -1000

        if (Number.isFinite(x) && Number.isFinite(z)) {
            registerEvent("Menu", "Paste F11 coordinates")
            this._goToF11(x, z)
        }
    }

    printCoord(x, y): void {
        const F11X = convertInvCoordX(x, y)
        const F11Y = convertInvCoordY(x, y)

        this._printF11Coord(x, y, F11X, F11Y)
    }

    transform(transform): void {
        this._g.attr("transform", transform)
    }

    clearMap(): void {
        this._g.selectAll("*").remove()
    }
}
