/*!
 * This file is part of na-map.
 *
 * @file      Display map.
 * @module    map/map
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select"
import { pointer as d3Pointer, select as d3Select, Selection } from "d3-selection"
import { tile as d3Tile, Tile, Tiles } from "d3-tile"
import {
    zoom as d3Zoom,
    zoomIdentity as d3ZoomIdentity,
    zoomTransform as d3ZoomTransform,
    ZoomBehavior,
    ZoomTransform,
    D3ZoomEvent,
} from "d3-zoom"

import { registerEvent } from "../analytics"
import { appDescription, appTitle, appVersion, insertBaseModal } from "common/common-browser"
import { defaultFontSize, nearestPow2, roundToThousands } from "common/common-math"

import { mapSize } from "common/common-var"

import { displayClan } from "../util"
import { Bound, MinMaxCoord, ZoomLevel } from "common/interface"

import Cookie from "util/cookie"
import RadioButton from "util/radio-button"
import DisplayGrid from "./display-grid"
import DisplayPbZones from "./display-pb-zones"
import DisplayPorts from "./display-ports"
import SelectPorts from "./select-ports"
import ShowF11 from "./show-f11"
import ShowTrades from "./show-trades"
import MakeJourney from "./make-journey"
import TrilateratePosition from "./get-position"
import PowerMap from "../game-tools/show-power-map"

/**
 * Display naval action map
 */
class NAMap {
    coord: MinMaxCoord
    f11!: ShowF11
    readonly gridOverlay: HTMLElement
    height = 0
    readonly #maxTileZoom = 5
    minMapScale = 1
    readonly #maxMapScale = 256
    #initialMapScale = this.minMapScale
    readonly #tileSize = 256
    readonly #wheelDelta = 1
    readonly #labelZoomThreshold = 2
    readonly #PBZoneZoomThreshold = 4
    readonly rem = defaultFontSize // Font size in px
    #zoom = {} as ZoomBehavior<SVGSVGElement, Event>

    serverName: string
    showGrid: string
    showTrades!: ShowTrades
    width = 0
    xGridBackgroundHeight: number
    yGridBackgroundWidth: number
    private _currentTranslate!: ZoomTransform
    private _doubleClickAction: string
    private _gMap!: Selection<SVGGElement, Event, HTMLElement, unknown>
    private _mainG!: Selection<SVGGElement, Event, HTMLElement, unknown>
    private _grid!: DisplayGrid
    private _journey!: MakeJourney
    private _pbZone!: DisplayPbZones
    private _ports!: DisplayPorts
    private _portSelect!: SelectPorts
    private _showGrid!: string
    private _svg!: Selection<SVGSVGElement, Event, HTMLElement, unknown>
    private _zoomLevel!: ZoomLevel
    private readonly _doubleClickActionCookie: Cookie
    private readonly _doubleClickActionId: string
    private readonly _doubleClickActionRadios: RadioButton
    private readonly _doubleClickActionValues: string[]
    private readonly _searchParams: URLSearchParams
    private readonly _showGridCookie: Cookie
    private readonly _showGridId: string
    private readonly _showGridRadios: RadioButton
    private readonly _showGridValues: string[]

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
            max: mapSize, // Maximum world coordinate
        }

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

        this.gridOverlay = document.querySelectorAll<HTMLElement>(".overlay")[0]

        this._setHeightWidth()
        this._setupScale()
        this._setupSvg()
        this._setSvgSize()
        this._setupListener()
    }

    static _initModal(id: string): void {
        insertBaseModal({
            id,
            title: `${appTitle} <span class="text-primary small">v${appVersion}</span>`,
            size: "modal-lg",
        })

        const body = d3Select(`#${id} .modal-body`)
        body.html(
            `<p>${appDescription} Please check the <a href="https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/">Game-Labs forum post</a> for further details. Feedback is very welcome.</p>
                    <p>Designed by iB aka Felix Victor, <em>Bastards</em> clan ${displayClan("(BSTD)")}</a>.</p>
                    <div class="alert alert-secondary" role="alert"><h5 class="alert-heading">Did you know?</h5><p class="mb-0">My clan mate, Aquillas, wrote a most comprehensive <a href="https://drive.google.com/file/d/1K6xCXtCUd68PPzvNjBxD5ffgE_69VEoc/view">user guide</a>.</p></div>`
        )
    }

    static _stopProperty(event: Event): void {
        if (event.defaultPrevented) {
            event.stopPropagation()
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

        this._pbZone = new DisplayPbZones(this._ports, this.serverName)
        this._grid = new DisplayGrid(this)

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
        this._journey = new MakeJourney(this.rem)
        void new TrilateratePosition(this._ports)
        void new PowerMap(this.serverName, this.coord)

        /*
        Marks.forEach(mark => {
            performance.measure(mark,`${mark}-start`,`${mark}-end`);
        });
        console.log(performance.getEntriesByType("measure"));
        */
    }

    _setupListener(): void {
        this._svg
            // eslint-disable-next-line unicorn/no-null
            .on("dblclick.zoom", null)
            .on(
                "click",
                (event: Event) => {
                    NAMap._stopProperty(event)
                },
                true
            )
            .on("dblclick", (event: Event) => {
                this._doDoubleClickAction(event)
            })

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

        document.querySelector("#double-click-action")?.addEventListener("change", () => {
            this._doubleClickSelected()
        })
        document.querySelector("#show-grid")?.addEventListener("change", () => {
            this._showGridSelected()
        })
    }

    _setupScale(): void {
        /**
         * Current map scale
         */
        this.#initialMapScale = nearestPow2(Math.min(this.height, this.width) / this.#tileSize)
    }

    _setupSvg(): void {
        this.#zoom = d3Zoom<SVGSVGElement, Event>()
            /*
            .translateExtent([
                [
                    this.coord.min - this.yGridBackgroundWidth * this.minScale,
                    this.coord.min - this.xGridBackgroundHeight * this.minScale,
                ],
                [this.coord.max, this.coord.max],
            ])
             */
            .extent([
                [100, 100],
                [300, 300],
            ])
            .scaleExtent([this.minMapScale, this.#maxMapScale])
            .translateExtent([
                [this.coord.min, this.coord.min],
                [this.coord.max, this.coord.max],
            ])
            .wheelDelta((event: Event) => -this.#wheelDelta * Math.sign((event as WheelEvent).deltaY))
            .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                this._naZoomed(event)
            })

        this._svg = d3Select<SVGSVGElement, Event>("#na-map")
            .append<SVGSVGElement>("svg")
            .attr("id", "na-svg")
            .call(this.#zoom)

        this._svg.append<SVGDefsElement>("defs")
        this._gMap = this._svg.append("g").attr("class", "map-tiles")
        this._mainG = this._svg.append("g").attr("id", "map")
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

        this._grid.update()
    }

    _displayMap(transform: ZoomTransform): void {
        const x0 = 0
        const y0 = 0
        const x1 = this.width
        const y1 = this.height

        // Zoom in at scale larger than maxTileZoom
        const zoomDelta = Math.log2(transform.k) <= this.#maxTileZoom ? 0 : this.#maxTileZoom - Math.log2(transform.k)
        const tiles = d3Tile()
            .extent([
                [x0, y0],
                [x1, y1],
            ])
            .scale(this.#tileSize * transform.k)
            .tileSize(this.#tileSize)
            .zoomDelta(zoomDelta)(transform) as Tiles

        /*
        const position = (tile: Tile, tiles: Tiles): [number, number] => {
            const [x, y] = tile
            const {
                translate: [tx, ty],
                scale: k,
            } = tiles
            return [(x + tx) * k, (y + ty) * k]
        }

        for (const t of tiles) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            console.log(`tile ${t} is at ${position(t, tiles)}`)
        }
        */

        console.log("zoom", this.#zoom.extent(), this.#zoom.translateExtent(), this.#zoom.scaleExtent())
        console.log("transform", transform, tiles.length, tiles.scale, tiles[0][2])

        this._updateMap(tiles)
    }

    _updateMap(tiles: Tiles): void {
        const {
            translate: [tx, ty],
            scale: k,
        } = tiles
        const data = tiles as Tile[]

        // @ts-expect-error
        this._gMap
            .attr("transform", `translate(${tx * k},${ty * k}) scale(${k})`)
            .selectAll<HTMLImageElement, Tile>("image")
            .data(data, (d: Tile) => d)
            .join((enter) =>
                enter
                    .append("image")
                    .attr("xlink:href", ([x, y, z]) => `images/map/${z}/${y}/${x}.webp`)
                    .attr("x", ([x]) => x)
                    .attr("y", ([, y]) => y)
                    .attr("width", 1)
                    .attr("height", 1)
            )
    }

    _clearMap(): void {
        this.f11.clearMap()
        this._ports.clearMap()
        this._portSelect.clearMap()
        this.showTrades.clearMap()
        $(".selectpicker").val("default").selectpicker("refresh")
    }

    _showAbout(): void {
        const modalId = "modal-about"

        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${modalId}`)) {
            NAMap._initModal(modalId)
        }

        // Show modal
        $(`#${modalId}`).modal("show")
    }

    _doDoubleClickAction(event: Event): void {
        const transform = d3ZoomTransform(this._gMap.node()!)
        const [mx, my] = d3Pointer(event as MouseEvent)
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

    _setZoomLevelAndData(transform: ZoomTransform): void {
        if (transform.k !== this._currentScale) {
            this._currentScale = transform.k
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
    _getLowerBound(zoomTransform: ZoomTransform): Bound {
        return zoomTransform.invert([this.coord.min, this.coord.min])
    }

    /**
     * Bottom right coordinates of current viewport
     */
    _getUpperBound(zoomTransform: ZoomTransform): Bound {
        return zoomTransform.invert([this.width, this.height])
    }

    _getZoomTransform(transform: ZoomTransform): ZoomTransform {
        this._currentTranslate = {
            x: Math.floor(transform.x),
            y: Math.floor(transform.y),
        } as ZoomTransform

        /**
         * Current transform
         */
        return d3ZoomIdentity
            .translate(this._currentTranslate.x, this._currentTranslate.y)
            .scale(roundToThousands(transform.k))
    }

    /**
     * Zoom svg groups
     */
    _naZoomed(event: D3ZoomEvent<SVGSVGElement, unknown>): void {
        const { transform } = event

        // const zoomTransform = this._getZoomTransform(transform)
        /**
         * Top left coordinates of current viewport
         */
        // const lowerBound = this._getLowerBound(zoomTransform)

        /**
         * Bottom right coordinates of current viewport
         */
        // const upperBound = this._getUpperBound(zoomTransform)

        /*
        this._ports.setBounds(lowerBound, upperBound)
        this._pbZone.setBounds(lowerBound, upperBound)
        this.showTrades.setBounds(lowerBound, upperBound)
*/

        this._displayMap(transform)

        // this._grid.transform(event)
        // this.showTrades.transform(zoomTransform)
        this._mainG.attr("transform", transform)

        // this._setZoomLevelAndData(transform)
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
        document.querySelector<HTMLElement>("#navbar-left")?.classList.remove("d-none")
    }

    get zoomLevel(): ZoomLevel {
        return this._zoomLevel
    }

    set zoomLevel(zoomLevel: ZoomLevel) {
        this._zoomLevel = zoomLevel
        this._ports.zoomLevel = zoomLevel
        this._grid.zoomLevel = zoomLevel
    }

    resize(): void {
        const zoomTransform = d3ZoomIdentity
            .translate(this._currentTranslate.x, this._currentTranslate.y)
            .scale(this._currentScale)

        this._setHeightWidth()
        this._setSvgSize()
        this._setFlexOverlayHeight()
        this._displayMap(zoomTransform)
        this._grid.update()
    }

    getDimensions(): DOMRect {
        const selector = document.querySelectorAll<HTMLDivElement>(".overlay")[0]

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
        document.querySelector<HTMLDivElement>("#summary-column")?.setAttribute("style", `height:${height}px`)
    }

    initialZoomAndPan(): void {
        console.log("initialZoomAndPan")
        this._svg.call(
            this.#zoom.transform,
            d3ZoomIdentity.translate(this.width / 2, this.height / 2).scale(this.#initialMapScale)
        )
    }

    zoomAndPan(x: number, y: number, scale: number): void {
        const transform = d3ZoomIdentity
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
