/*!
 * This file is part of na-map.
 *
 * @file      Display grid.
 * @module    map-tools/display-grid
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { Axis, axisBottom as d3AxisBottom, axisRight as d3AxisRight } from "d3-axis"
import { select as d3Select, Selection } from "d3-selection"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"

import { formatF11 } from "../../common/common-format"
import { convertInvCoordX, convertInvCoordY, roundToThousands } from "../../common/common-math"

import { D3ZoomEvent, ZoomTransform } from "d3-zoom"
import { ZoomLevel } from "../../common/interface"

import { NAMap } from "./na-map"

/**
 * Display grid
 */
export default class DisplayGrid {
    #isShown: boolean
    #isInitialised = false
    readonly #map: NAMap
    readonly #minCoord: number
    readonly #maxCoord: number
    readonly #height: number
    readonly #width: number
    readonly #defaultFontSize: number
    readonly #xBackgroundHeight: number
    readonly #yBackgroundWidth: number
    #xScale!: ScaleLinear<number, number>
    #yScale!: ScaleLinear<number, number>
    #xAxis!: Axis<number>
    #yAxis!: Axis<number>
    #zoomLevel!: ZoomLevel
    #gMainXAxis!: Selection<SVGGElement, unknown, HTMLElement, unknown>
    #gMainYAxis!: Selection<SVGGElement, unknown, HTMLElement, unknown>
    #gXAxis!: Selection<SVGGElement, unknown, HTMLElement, unknown>
    #gYAxis!: Selection<SVGGElement, unknown, HTMLElement, unknown>

    constructor(map: NAMap) {
        this.#map = map

        /**
         * Show status
         */
        this.#isShown = this.#map.showGrid === "on"

        /**
         * Minimum world coordinate
         */
        this.#minCoord = this.#map.coord.min

        /**
         * Maximum world coordinate
         */
        this.#maxCoord = this.#map.coord.max

        /**
         * Height of map svg (screen coordinates)
         */
        this.#height = this.#map.height

        /**
         * Width of map svg (screen coordinates)
         */
        this.#width = this.#map.width

        /**
         * Font size in px
         */
        this.#defaultFontSize = this.#map.rem

        this.#xBackgroundHeight = this.#map.xGridBackgroundHeight
        this.#yBackgroundWidth = this.#map.yGridBackgroundWidth
    }

    /**
     * Setup grid svg
     */
    _setupSvg(): void {
        this._setupScale()
        this._setupAxis()
    }

    /**
     * Setup scale
     */
    _setupScale(): void {
        /**
         * X scale
         */
        this.#xScale = d3ScaleLinear()
            .clamp(true)
            .domain([
                convertInvCoordX(this.#minCoord, this.#minCoord),
                convertInvCoordX(this.#maxCoord, this.#maxCoord),
            ])
            .range([this.#minCoord, this.#maxCoord])

        /**
         * Y scale
         */
        this.#yScale = d3ScaleLinear()
            .clamp(true)
            .domain([
                convertInvCoordY(this.#minCoord, this.#minCoord),
                convertInvCoordY(this.#maxCoord, this.#maxCoord),
            ])
            .range([this.#minCoord, this.#maxCoord])
    }

    /**
     * Setup axis
     */
    _setupAxis(): void {
        const ticks = this._getTicks(65)

        /**
         * X axis
         */
        this.#xAxis = d3AxisBottom<number>(this.#xScale)
            .tickFormat((domainValue) => formatF11(domainValue))
            .tickValues(ticks)
            .tickSize(this.#maxCoord)

        /**
         * Y Axis
         */
        this.#yAxis = d3AxisRight<number>(this.#yScale)
            .tickFormat((domainValue) => formatF11(domainValue))
            .tickValues(ticks)
            .tickSize(this.#maxCoord)

        // svg groups
        const gMap = d3Select<SVGGElement, unknown>("#map")

        this.#gMainXAxis = gMap.insert("g", "g.pb").attr("class", "axis d-none")
        this.#gXAxis = this.#gMainXAxis.append("g")

        this.#gMainYAxis = gMap.insert("g", "g.pb").attr("class", "axis d-none")
        this.#gYAxis = this.#gMainYAxis.append("g")

        // Initialise both axis first
        this._displayAxis(undefined)
        // Set default values
        this._setupXAxis()
        this._setupYAxis()
    }

    /**
     * Construct a list of ordered ticks [-maxCoord/2 .. 0 .. maxCoord/2]
     * @param items - Number of ticks
     * @returns Tick list
     */
    _getTicks(items: number): number[] {
        const min = Math.round(convertInvCoordY(this.#minCoord, this.#minCoord))
        const max = Math.round(convertInvCoordY(this.#maxCoord, this.#maxCoord))
        const increment = (max - min) / (items - 1)

        /**
         * List of ticks (positive values [increment .. max])
         */
        const tPos = []
        for (let i = increment; i < max; i += increment) {
            tPos.push(Math.round(i))
        }

        tPos.push(max)

        /**
         * List of ticks (negative values [-max .. 0])
         */
        const tNeg = tPos
            // copy values from tPos
            .slice(0)
            // reverse items
            .reverse()
            // convert to negatives
            .map((d) => -d)
        tNeg.push(0)

        // Concat negative and positive values
        return tNeg.concat(tPos)
    }

    /**
     * Setup x axis
     */
    _setupXAxis(): void {
        this.#gXAxis.selectAll(".tick text").attr("dx", "-0.3em").attr("dy", "2em")
        // eslint-disable-next-line unicorn/no-null
        this.#gXAxis.attr("text-anchor", "end").attr("fill", null).attr("font-family", null)
    }

    /**
     * Setup y axis
     */
    _setupYAxis(): void {
        // eslint-disable-next-line unicorn/no-null
        this.#gYAxis.attr("text-anchor", "end").attr("fill", null).attr("font-family", null)
        this.#gYAxis.selectAll(".tick text").attr("dx", "3.5em").attr("dy", "-.3em")
    }

    /**
     * Display axis
     */
    _displayAxis(transform: ZoomTransform | undefined): void {
        const tk = transform ? transform.k : 1
        const fontSize = roundToThousands(this.#defaultFontSize / tk)
        const strokeWidth = roundToThousands(1 / tk)

        const tx = transform ? transform.y : 0
        const dx = tx / tk < this.#width ? tx / tk : 0
        const paddingX = -this.#maxCoord - dx

        const ty = transform ? transform.x : 0
        const dy = ty / tk < this.#height ? ty / tk : 0
        const paddingY = -this.#maxCoord - dy

        this.#gXAxis
            .attr("font-size", fontSize)
            .attr("stroke-width", strokeWidth)
            .call(this.#xAxis.tickPadding(paddingX))

        this.#gYAxis
            .attr("font-size", fontSize)
            .attr("stroke-width", strokeWidth)
            .call(this.#yAxis.tickPadding(paddingY))
    }

    /**
     * Get show status
     * @returns True if grid is shown
     */
    get show(): boolean {
        return this.#isShown
    }

    /**
     * Set show status
     * @param show - True if grid is shown
     */
    set show(show: boolean) {
        this.#isShown = show
    }

    get zoomLevel(): ZoomLevel {
        return this.#zoomLevel
    }

    /**
     * Set zoom level
     * @param zoomLevel - Zoom level
     */
    set zoomLevel(zoomLevel: ZoomLevel) {
        this.#zoomLevel = zoomLevel
    }

    /**
     * Update grid (shown or not shown)
     */
    update(): void {
        let show = false

        if (this.#isShown && this.zoomLevel !== "initial") {
            show = true
        }

        if (show) {
            this.testForInitialisation()
        }

        if (this.#isInitialised) {
            this.gridToggle(show)
        }
    }

    /**
     * Set axis transform
     */
    transform(event: D3ZoomEvent<SVGSVGElement, unknown>): void {
        if (this.#isShown) {
            this.testForInitialisation()
            this._displayAxis(event.transform)
        }
    }

    private gridToggle(show: boolean): void {
        this.#map.gridOverlay.classList.toggle("overlay-grid", show)
        this.#map.gridOverlay.classList.toggle("overlay-no-grid", !show)

        // Show or hide axis
        this.#gMainXAxis.classed("d-none", !show)
        this.#gMainYAxis.classed("d-none", !show)
    }

    private testForInitialisation() {
        if (!this.#isInitialised) {
            this._setupSvg()
            this.#isInitialised = true
        }
    }
}
