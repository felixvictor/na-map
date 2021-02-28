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
import { zoom as d3Zoom, zoomIdentity as d3ZoomIdentity, ZoomBehavior, ZoomTransform, D3ZoomEvent } from "d3-zoom"

import { registerEvent } from "../analytics"
import { appDescription, appTitle, appVersion, insertBaseModal } from "common/common-browser"
import { defaultFontSize, Extent, nearestPow2 } from "common/common-math"
import { mapSize } from "common/common-var"
import { displayClan } from "../util"

import { MinMaxCoord, ZoomLevel } from "common/interface"

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

export type Tile = [number, number, number]

export interface Tiles {
    tiles: Tile[]
    translate: [number, number]
    scale: number
}

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
    #currentMapScale = this.minMapScale
    readonly #tileSize = 256
    readonly #wheelDelta = 1
    readonly #labelZoomThreshold = 0.25
    readonly #PBZoneZoomThreshold = 2
    #extent = {} as Extent
    #currentTranslate = [0, 0]
    #viewport = {} as Extent
    #zoom = {} as ZoomBehavior<SVGSVGElement, Event>
    #x0 = 0
    #x1 = 0
    #y0 = 0
    #y1 = 0
    #gMap = {} as Selection<SVGGElement, Event, HTMLElement, unknown>
    #mainG = {} as Selection<SVGGElement, Event, HTMLElement, unknown>

    readonly rem = defaultFontSize // Font size in px
    serverName: string
    showGrid: string
    showTrades!: ShowTrades
    width = 0
    xGridBackgroundHeight: number
    yGridBackgroundWidth: number
    private _doubleClickAction: string
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
        this._setupTiler()
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
        this.showTrades = new ShowTrades(this.serverName, this._portSelect, this.minMapScale, this.#extent)
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
            .scaleExtent([this.minMapScale, this.#maxMapScale])
            .wheelDelta((event: Event) => -this.#wheelDelta * Math.sign((event as WheelEvent).deltaY))
            .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                this._naZoomed(event)
            })

        this._svg = d3Select<SVGSVGElement, Event>("#na-map")
            .append<SVGSVGElement>("svg")
            .attr("id", "na-svg")
            .call(this.#zoom)

        this._svg.append<SVGDefsElement>("defs")
        this.#gMap = this._svg.append("g").attr("class", "map-tiles")
        this.#mainG = this._svg.append("g").attr("id", "map")
    }

    _setupTiler(): void {
        this.#x0 = this.#extent[0][0]
        this.#x1 = this.#extent[1][0]
        this.#y0 = this.#extent[0][1]
        this.#y1 = this.#extent[1][1]
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

    _drawMap(transform: ZoomTransform): void {
        // Zoom in at scale larger than maxTileZoom
        const zoomDelta = Math.log2(transform.k) <= this.#maxTileZoom ? 0 : this.#maxTileZoom - Math.log2(transform.k)
        const scale = this.#tileSize * transform.k
        const tiles = {} as Tiles
        tiles.tiles = []

        // Copied from d3-tile
        const z = Math.log2(scale / this.#tileSize)
        const z0 = Math.round(Math.max(z + zoomDelta, 0))
        const k = 2 ** (z - z0) * this.#tileSize
        const x = transform.x - scale / 2
        const y = transform.y - scale / 2
        const xMin = Math.max(0, Math.floor((this.#x0 - x) / k))
        const xMax = Math.min(1 << z0, Math.ceil((this.#x1 - x) / k))
        const yMin = Math.max(0, Math.floor((this.#y0 - y) / k))
        const yMax = Math.min(1 << z0, Math.ceil((this.#y1 - y) / k))
        for (let y = yMin; y < yMax; ++y) {
            for (let x = xMin; x < xMax; ++x) {
                tiles.tiles.push([x, y, z0])
            }
        }

        tiles.translate = [x / k, y / k]
        tiles.scale = k

        if (tiles.tiles.length > 0) {
            const tileZoomLevel = z0 + Math.abs(zoomDelta)
            const tilesPerZoomLevel = 2 ** tileZoomLevel
            const tileCoverage = this.coord.max / tilesPerZoomLevel
            const scale = tileCoverage * 2 ** Math.abs(zoomDelta)
            const vx0 = xMin * scale
            const vx1 = xMax * scale
            const vy0 = yMin * scale
            const vy1 = yMax * scale
            this.#viewport = [
                [vx0, vy0],
                [vx1, vy1],
            ]
            this.#currentTranslate = [tiles.translate[0] * tiles.scale, tiles.translate[1] * tiles.scale]

            this._updateMap(tiles)
        }
    }

    _updateMap(tiles: Tiles): void {
        const {
            translate: [tx, ty],
            scale: k,
            tiles: data,
        } = tiles

        // @ts-expect-error
        this.#gMap
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
        const [mx, my] = d3Pointer(event as MouseEvent, this.#mainG.node())
        console.log("_doDoubleClickAction mx my", event, mx, my, this.#mainG.node())

        if (this._doubleClickAction === "f11") {
            this.f11.printCoord(mx, my)
        } else {
            this._journey.plotCourse(mx, my)
        }

        this.zoomAndPan(mx, my)
    }

    _setZoomLevelAndData(transform: ZoomTransform): void {
        const scale = this._getMapScale(transform.k)

        if (scale !== this.#currentMapScale) {
            this.#currentMapScale = scale
            if (this.#currentMapScale > this.#PBZoneZoomThreshold) {
                if (this.zoomLevel !== "pbZone") {
                    this.zoomLevel = "pbZone"
                }
            } else if (this.#currentMapScale > this.#labelZoomThreshold) {
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
        this._ports.update(this.#currentMapScale)
    }

    _getMapScale(scale: number): number {
        return 2 ** (Math.log2(scale) - this.#maxTileZoom)
    }

    _getMapTransform(transform: ZoomTransform): ZoomTransform {
        const scale = this._getMapScale(transform.k)
        return d3ZoomIdentity
            .scale(scale)
            .translate(this.#currentTranslate[0] / scale, this.#currentTranslate[1] / scale)
    }

    /**
     * Zoom svg groups
     */
    _naZoomed(event: D3ZoomEvent<SVGSVGElement, unknown>): void {
        const { transform: zoomTransform } = event

        this._drawMap(zoomTransform)

        this._ports.setBounds(this.#viewport)
        this._pbZone.setBounds(this.#viewport)
        this.showTrades.setBounds(this.#viewport)

        const mapTransform = this._getMapTransform(zoomTransform)
        this._grid.transform(mapTransform)
        this.showTrades.transform(mapTransform)
        this.#mainG.attr("transform", mapTransform.toString())

        this._setZoomLevelAndData(zoomTransform)
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

        this.#extent = [
            [0, 0],
            [this.width, this.height],
        ]
    }

    _setSvgSize(): void {
        this._svg.attr("width", this.width).attr("height", this.height)
    }

    _setFlexOverlayHeight(): void {
        const height = this.height - (this._grid.show && this.zoomLevel !== "initial" ? this.xGridBackgroundHeight : 0)
        document.querySelector<HTMLDivElement>("#summary-column")?.setAttribute("style", `height:${height}px`)
    }

    initialZoomAndPan(): void {
        const transform = d3ZoomIdentity.translate(this.width / 2, this.height / 2).scale(this.#initialMapScale)
        this._svg.call(this.#zoom.transform, transform)

        // Calculate translate extent
        // {@link https://stackoverflow.com/a/57660500}
        this.#zoom.translateExtent([
            transform.invert(this.#extent[0] as [number, number]),
            transform.invert(this.#extent[1] as [number, number]),
        ])
    }

    zoomAndPan(x: number, y: number): void {
        const mapScale = 32
        const transform = d3ZoomIdentity
            .scale(mapScale)
            .translate(
                Math.floor((-x + this.coord.max / 2 + this.width / 2) / mapScale),
                Math.floor(-y + this.coord.max / 2 + this.height / 2) / mapScale
            )
        console.log("zoomAndPan x y", x, y, this.#initialMapScale, mapScale, this._getMapScale(32), transform)

        this._svg.call(this.#zoom.transform, transform)
    }

    goToPort(): void {
        if (this._ports.currentPort.id === 0) {
            this.initialZoomAndPan()
        } else {
            this.zoomAndPan(this._ports.currentPort.coord.x, this._ports.currentPort.coord.y)
        }
    }
}

export { NAMap }
