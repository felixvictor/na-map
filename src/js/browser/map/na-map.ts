/*!
 * This file is part of na-map.
 *
 * @file      Display map.
 * @module    map/map
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select/js/bootstrap-select"
import * as d3Range from "d3-array"
import * as d3Selection from "d3-selection"
import * as d3Zoom from "d3-zoom"

import { registerEvent } from "../analytics"
import { appDescription, appTitle, appVersion, Bound, insertBaseModal } from "../../common/common-browser"
import { defaultFontSize, nearestPow2, roundToThousands } from "../../common/common-math"
import { MinMaxCoord, SVGGDatum, SVGSVGDatum } from "../../common/interface"
import { displayClan } from "../util"

import Cookie from "../util/cookie"
import RadioButton from "../util/radio-button"

import DisplayGrid from "../map-tools/display-grid"
import DisplayPbZones from "./display-pb-zones"
import DisplayPorts from "./display-ports"
import SelectPorts from "./select-ports"
import ShowF11 from "../map-tools/show-f11"
import ShowTrades from "../map-tools/show-trades"
import WindRose from "../map-tools/wind-rose"
import MakeJourney from "../map-tools/make-journey"
import PredictWind from "../map-tools/predict-wind"

interface Tile {
    z: number
    row: number
    col: number
    id: string
}

/**
 * Display naval action map
 */
class NAMap {
    coord: MinMaxCoord
    f11!: ShowF11
    readonly gridOverlay: HTMLElement
    height = 0
    minScale = 0
    rem: number
    serverName: string
    showGrid: string
    showTrades!: ShowTrades
    width = 0
    xGridBackgroundHeight: number
    yGridBackgroundWidth: number
    private _currentScale = 0
    private _currentTranslate!: d3Zoom.ZoomTransform
    private _doubleClickAction: string
    private _gMap!: d3Selection.Selection<SVGGElement, SVGGDatum, HTMLElement, any>
    private _grid!: DisplayGrid
    private _journey!: MakeJourney
    private _pbZone!: DisplayPbZones
    private _ports!: DisplayPorts
    private _portSelect!: SelectPorts
    private _showGrid!: string
    private _svg!: d3Selection.Selection<SVGSVGElement, SVGSVGDatum, HTMLElement, any>
    private _windPrediction!: PredictWind
    private _windRose!: WindRose
    private _zoom!: d3Zoom.ZoomBehavior<SVGSVGElement, SVGSVGDatum>
    private _zoomLevel!: string
    private readonly _doubleClickActionCookie: Cookie
    private readonly _doubleClickActionId: string
    private readonly _doubleClickActionRadios: RadioButton
    private readonly _doubleClickActionValues: string[]
    private readonly _labelZoomThreshold: number
    private readonly _maxScale: number
    private readonly _PBZoneZoomThreshold: number
    private readonly _searchParams: URLSearchParams
    private readonly _showGridCookie: Cookie
    private readonly _showGridId: string
    private readonly _showGridRadios: RadioButton
    private readonly _showGridValues: string[]
    private readonly _tileSize: number
    private readonly _wheelDelta: number

    /**
     * @param serverName - Naval action server name
     * @param searchParams - Query arguments
     */
    constructor(serverName: string, searchParams: URLSearchParams) {
        /**
         * Naval action server name
         */
        this.serverName = serverName
        this._searchParams = searchParams

        /**
         * Font size in px
         */
        this.rem = defaultFontSize

        /**
         * Left padding for brand icon
         */
        this.xGridBackgroundHeight = Math.floor(3 * this.rem)

        /**
         * Left padding for brand icon
         */
        this.yGridBackgroundWidth = Math.floor(4 * this.rem)

        /**
         * Outer bounds (world coordinates)
         */
        this.coord = {
            min: 0, // Minimum world coordinate
            max: 8192, // Maximum world coordinate
        }

        this._tileSize = 256
        this._maxScale = 2 ** 3 // Power of 2
        this._wheelDelta = 0.5
        this._PBZoneZoomThreshold = 1.5
        this._labelZoomThreshold = 0.5

        /**
         * DoubleClickAction cookie name
         */
        this._doubleClickActionId = "double-click-action"

        /**
         * DoubleClickAction settings
         */
        this._doubleClickActionValues = ["compass", "f11"]

        this._doubleClickActionCookie = new Cookie({
            id: this._doubleClickActionId,
            values: this._doubleClickActionValues,
        })
        this._doubleClickActionRadios = new RadioButton(this._doubleClickActionId, this._doubleClickActionValues)

        /**
         * Get DoubleClickAction setting from cookie or use default value
         */
        this._doubleClickAction = this._getDoubleClickAction()

        /**
         * ShowGrid cookie name
         */
        this._showGridId = "show-grid"

        /**
         * ShowGrid settings
         */
        this._showGridValues = ["off", "on"]

        this._showGridCookie = new Cookie({ id: this._showGridId, values: this._showGridValues })
        this._showGridRadios = new RadioButton(this._showGridId, this._showGridValues)

        /**
         * Get showGrid setting from cookie or use default value
         */
        this.showGrid = this._getShowGridValue()

        this.gridOverlay = document.querySelectorAll(".overlay")[0] as HTMLElement

        this._setHeightWidth()
        this._setupScale()
        this._setupSvg()
        this._setSvgSize()
        this._setupListener()
    }

    static _initModal(id: string): void {
        insertBaseModal({ id, title: `${appTitle} <span class="text-primary small">v${appVersion}</span>` })

        const body = d3Selection.select(`#${id} .modal-body`)
        body.html(
            `<p>${appDescription} Please check the <a href="https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/"> Game-Labs forum post</a> for further details. Feedback is very welcome.</p><p>Designed by iB aka Felix Victor, clan Bastard Sons ${displayClan(
                "(BASTD)"
            )}</a>.</p>`
        )
    }

    static _stopProperty(): void {
        if (d3Selection.event.defaultPrevented) {
            d3Selection.event.stopPropagation()
        }
    }

    async MapInit(): Promise<void> {
        await this._setupData()
    }

    /**
     * Read cookie for doubleClickAction
     */
    _getDoubleClickAction(): string {
        const r = this._doubleClickActionCookie.get()

        this._doubleClickActionRadios.set(r)

        return r
    }

    /**
     * Read cookie for showGrid
     * @returns showGrid
     */
    _getShowGridValue(): string {
        const r = this._showGridCookie.get()

        this._showGridRadios.set(r)

        return r
    }

    async _setupData(): Promise<void> {
        //        Const marks = [];

        //        marks.push("setupData");
        //        performance.mark(`${marks[marks.length - 1]}-start`);
        // function();
        //        performance.mark(`${marks[marks.length - 1]}-end`);

        this.f11 = new ShowF11(this, this.coord)
        this._ports = new DisplayPorts(this)
        await this._ports.init()

        this._pbZone = new DisplayPbZones(this._ports)
        this._grid = new DisplayGrid(this)

        this._journey = new MakeJourney(this.rem)
        this._windPrediction = new PredictWind()
        this._windRose = new WindRose()

        this._portSelect = new SelectPorts(this._ports, this._pbZone, this)
        this.showTrades = new ShowTrades(
            this.serverName,
            this._portSelect,
            this.minScale,
            [this.coord.min, this.coord.min],
            [this.width, this.height]
        )
        await this.showTrades.showOrHide()
        this._init()

        /*
        Marks.forEach(mark => {
            performance.measure(mark,`${mark}-start`,`${mark}-end`);
        });
        console.log(performance.getEntriesByType("measure"));
        */
    }

    _setupListener(): void {
        this._svg
            .on("dblclick.zoom", null)
            .on("click", NAMap._stopProperty, true)
            .on(
                "dblclick",
                (_d: SVGSVGDatum, i: number, nodes: SVGSVGElement[] | d3Selection.ArrayLike<SVGSVGElement>): void =>
                    this._doDoubleClickAction(nodes[i])
            )

        document.querySelector("#propertyDropdown")?.addEventListener("click", () => {
            registerEvent("Menu", "Select port on property")
        })
        document.querySelector("#settingsDropdown")?.addEventListener("click", () => {
            registerEvent("Menu", "Settings")
        })
        document.querySelector("#button-download-pb-calc")?.addEventListener("click", () => {
            registerEvent("Tools", "Download pb calculator")
        })
        document.querySelector("#reset")?.addEventListener("click", () => {
            this._clearMap()
        })
        document.querySelector("#about")?.addEventListener("click", () => {
            this._showAbout()
        })

        document.querySelector("#double-click-action")?.addEventListener("change", () => this._doubleClickSelected())
        document.querySelector("#show-grid")?.addEventListener("change", () => this._showGridSelected())
    }

    _setupScale(): void {
        this.minScale = nearestPow2(Math.min(this.width / this.coord.max, this.height / this.coord.max))

        /**
         * Current map scale
         */
        this._currentScale = this.minScale
    }

    _setupSvg(): void {
        this._zoom = d3Zoom
            .zoom<SVGSVGElement, SVGSVGDatum>()
            .wheelDelta(() => -this._wheelDelta * Math.sign(d3Selection.event.deltaY))
            .translateExtent([
                [
                    this.coord.min - this.yGridBackgroundWidth * this.minScale,
                    this.coord.min - this.xGridBackgroundHeight * this.minScale,
                ],
                [this.coord.max, this.coord.max],
            ])
            .scaleExtent([this.minScale, this._maxScale])
            .on("zoom", () => this._naZoomed())

        this._svg = d3Selection
            .select<SVGSVGElement, SVGSVGDatum>("#na-map")
            .append<SVGSVGElement>("svg")
            .attr("id", "na-svg")
            .call(this._zoom)

        this._svg.append<SVGDefsElement>("defs")

        this._gMap = this._svg.append("g").classed("map", true)
    }

    _doubleClickSelected(): void {
        this._doubleClickAction = this._doubleClickActionRadios.get()

        this._doubleClickActionCookie.set(this._doubleClickAction)

        this._clearMap()
    }

    _showGridSelected(): void {
        this._showGrid = this._showGridRadios.get()
        this._grid.show = this._showGrid === "on"

        this._showGridCookie.set(this._showGrid)

        this._refreshLayer()
    }

    _refreshLayer(): void {
        this._grid.update()
    }

    _displayMap(transform: d3Zoom.ZoomTransform): void {
        // Based on d3-tile v0.0.3
        // https://github.com/d3/d3-tile/blob/0f8cc9f52564d4439845f651c5fab2fcc2fdef9e/src/tile.js
        const { x: tx, y: ty, k: tk } = transform
        const log2tileSize = Math.log2(this._tileSize)
        const maxTileZoom = Math.log2(this.coord.max) - log2tileSize
        const maxCoordScaled = this.coord.max * tk
        const x0 = 0
        const y0 = 0
        const x1 = this.width
        const y1 = this.height
        const width = Math.floor(maxCoordScaled < x1 ? x1 - 2 * tx : maxCoordScaled)
        const height = Math.floor(maxCoordScaled < y1 ? y1 - 2 * ty : maxCoordScaled)
        const scale = Math.log2(tk)

        const tileZoom = Math.min(maxTileZoom, Math.ceil(Math.log2(Math.max(width, height))) - log2tileSize)
        const p = Math.round((tileZoom - scale - maxTileZoom) * 10) / 10
        const k = this._wheelDelta ** p
        const tileSizeScaled = this._tileSize * k

        const // Crop right side
            dx = maxCoordScaled < x1 ? tx : 0
        // Crop bottom
        const dy = maxCoordScaled < y1 ? ty : 0
        const cols = d3Range.range(
            Math.max(0, Math.floor((x0 - tx) / tileSizeScaled)),
            Math.max(0, Math.min(Math.ceil((x1 - tx - dx) / tileSizeScaled), 2 ** tileZoom))
        )
        const rows = d3Range.range(
            Math.max(0, Math.floor((y0 - ty) / tileSizeScaled)),
            Math.max(0, Math.min(Math.ceil((y1 - ty - dy) / tileSizeScaled), 2 ** tileZoom))
        )
        const tiles = []

        for (const row of rows) {
            for (const col of cols) {
                tiles.push({
                    z: tileZoom,
                    row,
                    col,
                    id: `${tileZoom.toString()}-${row.toString()}-${col.toString()}`,
                } as Tile)
            }
        }

        const transformNew = d3Zoom.zoomIdentity.translate(tx, ty).scale(roundToThousands(k))

        this._updateMap(tiles, transformNew)
    }

    _updateMap(tiles: Tile[], transform: d3Zoom.ZoomTransform): void {
        this._gMap
            .attr("transform", transform.toString())
            .selectAll<HTMLImageElement, Tile>("image")
            .data(tiles, (d) => d.id)
            .join((enter) =>
                enter
                    .append("image")
                    .attr("xlink:href", (d) => `images/map/${d.z}/${d.row}/${d.col}.webp`)
                    .attr("x", (d) => d.col * this._tileSize)
                    .attr("y", (d) => d.row * this._tileSize)
                    .attr("width", this._tileSize + 1)
                    .attr("height", this._tileSize + 1)
            )
    }

    _clearMap(): void {
        this._windPrediction.clearMap()
        this._windRose.clearMap()
        this.f11.clearMap()
        this._ports.clearMap()
        this._portSelect.clearMap()
        this.showTrades.clearMap()
        $(".selectpicker").val("default").selectpicker("refresh")
    }

    _showAbout(): void {
        const modalId = "modal-about"
        const modal$ = $(`#${modalId}`)

        // If the modal has no content yet, insert it
        if (modal$.length === 0) {
            NAMap._initModal(modalId)
        }

        // Show modal
        modal$.modal("show")
    }

    _doDoubleClickAction(self: SVGSVGElement): void {
        const coord = d3Selection.mouse(self)
        const transform = d3Zoom.zoomTransform(self)
        const [mx, my] = coord
        const { k: tk, x: tx, y: ty } = transform

        const x = (mx - tx) / tk
        const y = (my - ty) / tk

        if (this._doubleClickAction === "f11") {
            this.f11.printCoord(x, y)
        } else {
            this._journey.plotCourse(x, y)
        }

        this.zoomAndPan(x, y, 1)
    }

    _setZoomLevelAndData(): void {
        if (d3Selection.event.transform.k !== this._currentScale) {
            this._currentScale = d3Selection.event.transform.k
            if (this._currentScale > this._PBZoneZoomThreshold) {
                if (this.zoomLevel !== "pbZone") {
                    this.zoomLevel = "pbZone"
                }
            } else if (this._currentScale > this._labelZoomThreshold) {
                if (this.zoomLevel !== "portLabel") {
                    this.zoomLevel = "portLabel"
                }
            } else if (this.zoomLevel !== "initial") {
                this.zoomLevel = "initial"
            }

            this._setFlexOverlayHeight()
            this._grid.update()
        }

        this._pbZone.refresh()
        this._ports.update(this._currentScale)
    }

    /**
     * Top left coordinates of current viewport
     */
    _getLowerBound(zoomTransform: d3Zoom.ZoomTransform): Bound {
        return zoomTransform.invert([this.coord.min, this.coord.min])
    }

    /**
     * Bottom right coordinates of current viewport
     */
    _getUpperBound(zoomTransform: d3Zoom.ZoomTransform): Bound {
        return zoomTransform.invert([this.width, this.height])
    }

    _getZoomTransform(): d3Zoom.ZoomTransform {
        this._currentTranslate = {
            x: Math.floor(d3Selection.event.transform.x),
            y: Math.floor(d3Selection.event.transform.y),
        } as d3Zoom.ZoomTransform

        /**
         * Current transform
         */
        return d3Zoom.zoomIdentity
            .translate(this._currentTranslate.x, this._currentTranslate.y)
            .scale(roundToThousands(d3Selection.event.transform.k))
    }

    /**
     * Zoom svg groups
     */
    _naZoomed(): void {
        const zoomTransform = this._getZoomTransform()
        /**
         * Top left coordinates of current viewport
         */
        const lowerBound = this._getLowerBound(zoomTransform)

        /**
         * Bottom right coordinates of current viewport
         */
        const upperBound = this._getUpperBound(zoomTransform)

        this._ports.setBounds(lowerBound, upperBound)
        this._pbZone.setBounds(lowerBound, upperBound)
        this.showTrades.setBounds(lowerBound, upperBound)

        this._displayMap(zoomTransform)
        this._grid.transform(zoomTransform)
        this._ports.transform(zoomTransform)
        this._journey.transform(zoomTransform)
        this._pbZone.transform(zoomTransform)
        this.f11.transform(zoomTransform)
        this.showTrades.transform(zoomTransform)

        this._setZoomLevelAndData()
    }

    _checkF11Coord(): void {
        if (this._searchParams.has("x") && this._searchParams.has("z")) {
            this.f11.goToF11FromParam(this._searchParams)
        }
    }

    _init(): void {
        this.zoomLevel = "initial"
        this.initialZoomAndPan()
        this._checkF11Coord()
        this._setFlexOverlayHeight()
    }

    get zoomLevel(): string {
        return this._zoomLevel
    }

    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel
        this._ports.zoomLevel = zoomLevel
        this._grid.zoomLevel = zoomLevel
    }

    resize(): void {
        const zoomTransform = d3Zoom.zoomIdentity
            .translate(this._currentTranslate.x, this._currentTranslate.y)
            .scale(this._currentScale)

        this._setHeightWidth()
        this._setSvgSize()
        this._setFlexOverlayHeight()
        this._displayMap(zoomTransform)
        this._grid.update()
    }

    getDimensions(): DOMRect {
        const selector = document.querySelectorAll(".overlay")[0]

        return selector.getBoundingClientRect()
    }

    _getWidth(): number {
        const { width } = this.getDimensions()

        return Math.floor(width)
    }

    _getHeight(): number {
        const { top } = this.getDimensions()
        const fullHeight = document.documentElement.clientHeight - this.rem

        return Math.floor(fullHeight - top)
    }

    _setHeightWidth(): void {
        /**
         * Width of map svg (screen coordinates)
         */
        this.width = this._getWidth()

        /**
         * Height of map svg (screen coordinates)
         */
        this.height = this._getHeight()
    }

    _setSvgSize(): void {
        this._svg.attr("width", this.width).attr("height", this.height)
    }

    _setFlexOverlayHeight(): void {
        const height = this.height - (this._grid.show && this.zoomLevel !== "initial" ? this.xGridBackgroundHeight : 0)
        document.querySelector("#summary-column")?.setAttribute("style", `height:${height}px`)
    }

    initialZoomAndPan(): void {
        this._svg.call(this._zoom.scaleTo, this.minScale)
    }

    zoomAndPan(x: number, y: number, scale: number): void {
        const transform = d3Zoom.zoomIdentity
            .scale(scale)
            .translate(Math.round(-x + this.width / 2 / scale), Math.round(-y + this.height / 2 / scale))

        this._svg.call(this._zoom.transform, transform)
    }

    goToPort(): void {
        if (this._ports.currentPort.id === 0) {
            this.initialZoomAndPan()
        } else {
            this.zoomAndPan(this._ports.currentPort.coord.x, this._ports.currentPort.coord.y, 2)
        }
    }
}

export { NAMap }
