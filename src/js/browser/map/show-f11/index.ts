/*!
 * This file is part of na-map.
 *
 * @file      Show F11 coordinates.
 * @module    map-tools/show-f11
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/modal"
import { select as d3Select, Selection } from "d3-selection"

import { registerEvent } from "../../analytics"
import { formatF11 } from "common/common-format"
import { between, convertCoordX, convertCoordY, convertInvCoordX, convertInvCoordY } from "common/common-math"

import { HtmlString, MinMaxCoord } from "common/interface"

import F11Modal from "./modal"
import { NAMap } from "../na-map"

import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import utc from "dayjs/plugin/utc"
dayjs.extend(customParseFormat)
dayjs.extend(utc)

/**
 * ShowF11
 */
export default class ShowF11 {
    readonly #baseId: HtmlString
    readonly #baseName = "Go to F11"
    readonly #coord: MinMaxCoord
    readonly #map: NAMap
    readonly #menuId: HtmlString

    #g = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #modal: F11Modal | undefined = undefined

    constructor(map: NAMap, coord: MinMaxCoord) {
        this.#map = map
        this.#coord = coord

        this.#baseId = this.#baseName.toLocaleLowerCase().replaceAll(" ", "-")
        this.#menuId = `menu-${this.#baseId}`

        this._setupSvg()
        this._setupListener()
    }

    _setupSvg(): void {
        this.#g = d3Select<SVGSVGElement, unknown>("#map").append("g").attr("data-ui-component", "f11")
    }

    _menuClicked(): void {
        registerEvent("Menu", this.#baseName)

        if (this.#modal) {
            this.#modal.showModal()
        } else {
            this.#modal = new F11Modal(this.#baseName)

            this.#modal.formSel.addEventListener("submit", (event) => {
                console.log("event submit")
                this.#modal!.hide()
                event.preventDefault()
                this._useUserInput()
            })
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            this._menuClicked()
        })
        window.addEventListener("keydown", (event) => {
            if (event.code === "F11" && event.shiftKey) {
                this._menuClicked()
            }
        })
    }

    _useUserInput(): void {
        const x = this.#modal!.getXCoord() * -1000
        const z = this.#modal!.getZCoord() * -1000
        console.log("_useUserInput", x, z)
        if (Number.isFinite(x) && Number.isFinite(z)) {
            this._goToF11(x, z)
        }
    }

    _printF11Coord(x: number, y: number, F11X: number, F11Y: number): void {
        let circleSize = 10
        const g = this.#g
            .append("g")
            .attr("transform", `translate(${x},${y})`)
            .attr("class", "svg-background-dark path-fill-primary-light")
        const coordRect = g.append("rect")
        const timeRect = g.append("rect")
        g.append("circle").attr("r", circleSize)

        // Include padding
        circleSize *= 1.6
        const F11XText = g
            .append("text")
            .attr("dx", `${-circleSize}px`)
            .attr("dy", `${-circleSize / 2 - 2}px`)
            .attr("class", "text-end")
            .text(formatF11(F11X))
        const F11YText = g
            .append("text")
            .attr("dx", `${-circleSize}px`)
            .attr("dy", `${circleSize / 2 + 2}px`)
            .attr("class", "text-end")
            .text(formatF11(F11Y))
        const F11XDim = (F11XText.node()?.getBBox() ?? {}) as DOMRect
        const F11YDim = (F11YText.node()?.getBBox() ?? {}) as DOMRect

        const timeStamp = dayjs().utc()
        const timeStampLocal = dayjs()
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
        const timeStampDim = (timeStampText.node() as SVGTextElement).getBBox() ?? {}
        const timeStampLocalDim = (timeStampLocalText.node() as SVGTextElement).getBBox() ?? {}

        const coordHeight = F11XDim && F11YDim ? Math.round(F11XDim.height + F11YDim.height) * 1.2 : 0
        const coordWidth = F11XDim && F11YDim ? Math.round(Math.max(F11XDim.width, F11YDim.width) + 5) : 0
        const timeHeight = Math.round(timeStampDim.height + timeStampLocalDim.height) * 1.2
        const timeWidth =
            timeStampDim && timeStampLocalDim
                ? Math.round(Math.max(timeStampDim.width, timeStampLocalDim.width) + 5)
                : 0
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

    _goToF11(F11X: number, F11Y: number): void {
        const x = Math.floor(convertCoordX(F11X, F11Y))
        const y = Math.floor(convertCoordY(F11X, F11Y))

        if (between(x, this.#coord.min, this.#coord.max, true) && between(y, this.#coord.min, this.#coord.max, true)) {
            this._printF11Coord(x, y, F11X, F11Y)
            this.#map.zoomAndPan(x, y)
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

    printCoord(x: number, y: number): void {
        const F11X = convertInvCoordX(x, y)
        const F11Y = convertInvCoordY(x, y)

        this._printF11Coord(x, y, F11X, F11Y)
    }

    clearMap(): void {
        this.#g.selectAll("*").remove()
    }
}
