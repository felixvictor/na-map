/*!
 * This file is part of na-map.
 *
 * @file      Display map.
 * @module    map/map
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { pointer as d3Pointer, select as d3Select, Selection } from "d3-selection"
import { D3ZoomEvent, zoom as d3Zoom, ZoomBehavior, zoomIdentity as d3ZoomIdentity, ZoomTransform } from "d3-zoom"

import { registerEvent } from "../../analytics"
import { defaultFontSize, Extent, nearestPow2 } from "common/common-math"
import { mapSize, maxMapScale, minMapScale, tileSize } from "common/common-var"

import { MinMaxCoord, ZoomLevel } from "common/interface"
import { ServerId } from "common/servers"

import Checkbox from "util/checkbox"
import Cookie from "util/cookie"
import RadioButton from "util/radio-button"
import Select from "util/select"

import DisplayGrid from "../display-grid"
import DisplayPbZones from "../display-pb-zones"
import DisplayPorts from "../display-ports"
import MakeJourney from "../make-journey"
import PowerMap from "../../game-tools/show-power-map"
import SelectPorts from "../select-ports"
import ShowF11 from "../show-f11"
import ShowTrades from "../show-trades"
import TrilateratePosition from "../get-position"
import WindRose from "../wind-rose"

import TileMap from "./tile-map"
import About from "./about"

/**
 * Display naval action map
 */
class NAMap {
    #currentMapScale = minMapScale
    #extent = [
        [0, 0],
        [mapSize, mapSize],
    ] as Extent
    #initialMapScale = minMapScale
    #mainG = {} as Selection<SVGGElement, Event, HTMLElement, unknown>
    #overfillZoom = false
    #tileMap: TileMap
    #timeoutId = 0
    #windRose!: WindRose
    #zoom = {} as ZoomBehavior<SVGSVGElement, Event>
    coord: MinMaxCoord
    f11!: ShowF11
    height = 0
    private _doubleClickAction: string
    private _grid!: DisplayGrid
    private _journey!: MakeJourney
    private _pbZone!: DisplayPbZones
    private _portSelect!: SelectPorts
    private _ports!: DisplayPorts
    private _showGrid!: boolean
    private _svg!: Selection<SVGSVGElement, Event, HTMLElement, unknown>
    private _zoomLevel!: ZoomLevel
    private readonly _doubleClickActionCookie: Cookie
    private readonly _doubleClickActionId: string
    private readonly _doubleClickActionRadios: RadioButton
    private readonly _doubleClickActionValues: string[]
    private readonly _searchParams: URLSearchParams
    private readonly _showGridCookie: Cookie
    private readonly _showGridId: string
    private readonly _showGridCheckbox: Checkbox
    private readonly _showGridValues = [String(false), String(true)] // Possible values for show trade checkboxes (first is default value)
    readonly #PBZoneZoomThreshold = 2
    readonly #labelZoomThreshold = 0.25
    readonly #wheelDelta = 1
    readonly gridOverlay: HTMLElement
    readonly rem = defaultFontSize // Font size in px
    serverName: ServerId
    showGrid: boolean
    showTrades!: ShowTrades
    width = 0
    xGridBackgroundHeight: number
    yGridBackgroundWidth: number

    /**
     * @param serverName - Naval action server name
     * @param searchParams - Query arguments
     */
    constructor(serverName: ServerId, searchParams: URLSearchParams) {
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
        this._showGridCookie = new Cookie({ id: this._showGridId, values: this._showGridValues })
        this._showGridCheckbox = new Checkbox(this._showGridId)

        /**
         * Get showGrid setting from cookie or use default value
         */
        this.showGrid = this._getShowGridValue()

        this.gridOverlay = document.querySelectorAll<HTMLElement>(".overlay")[0]

        this.#tileMap = new TileMap()
        this._setHeightWidth()
        this._setupSvg()
        this._setSvgSize()
        this._setupListener()
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
    _getShowGridValue(): boolean {
        const r = this._showGridCookie.get() === "true"

        this._showGridCheckbox.set(r)

        return r
    }

    async _setupData(): Promise<void> {
        //        Const marks = [];

        //        marks.push("setupData");
        //        performance.mark(`${marks[marks.length - 1]}-start`);
        // function();
        //        performance.mark(`${marks[marks.length - 1]}-end`);

        this._ports = new DisplayPorts(this)
        await this._ports.init()
        this._pbZone = new DisplayPbZones(this._ports, this.serverName)

        this._grid = new DisplayGrid(this)
        this._portSelect = new SelectPorts(this._ports)

        this.showTrades = new ShowTrades(this._ports, this.serverName)
        await this.showTrades.init()
        this.f11 = new ShowF11(this, this.coord)

        this._init()
        this._journey = new MakeJourney(this.rem)
        this.#windRose = new WindRose()
        void new TrilateratePosition(this._ports)
        void new PowerMap(this, this.serverName, this.coord)

        void new About()

        /*
        Marks.forEach(mark => {
            performance.measure(mark,`${mark}-start`,`${mark}-end`);
        });
        console.log(performance.getEntriesByType("measure"));
        */
    }

    #resize(): void {
        this._setHeightWidth()
        this.#initialMapScale = this._getInitialMapScale()
        this._initialZoomAndPan()
        this._setFlexOverlayHeight()
    }

    #resizeTimer(): void {
        const delay = 250

        window.clearTimeout(this.#timeoutId)
        this.#timeoutId = window.setTimeout(() => {
            this.#resize()
        }, delay)
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
        document.querySelector("#menu-download-pb-calc")?.addEventListener("click", () => {
            registerEvent("Tools", "Download pb calculator")
        })
        document.querySelector("#reset")?.addEventListener("click", () => {
            this._clearMap()
        })
        document.querySelector("#double-click-action")?.addEventListener("change", () => {
            this._doubleClickSelected()
        })
        document.querySelector("#show-grid")?.addEventListener("change", () => {
            this._showGridSelected()
        })

        window.addEventListener("resize", () => {
            this.#resizeTimer()
        })
    }

    _setupSvg(): void {
        this.#zoom = d3Zoom<SVGSVGElement, Event>()
            .scaleExtent([minMapScale, maxMapScale])
            .wheelDelta((event: Event) => -this.#wheelDelta * Math.sign((event as WheelEvent).deltaY))
            .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                this._naZoomed(event)
            })

        this._svg = d3Select<SVGSVGElement, Event>("#na-map")
            .append<SVGSVGElement>("svg")
            .attr("id", "na-svg")
            .attr("class", "fill-empty stroke-empty bg-map")
            .call(this.#zoom)

        this._svg.append<SVGDefsElement>("defs")
        this.#mainG = this._svg.append("g").attr("id", "map")

        this.#tileMap.setupSvg()
    }

    _doubleClickSelected(): void {
        this._doubleClickAction = this._doubleClickActionRadios.get()

        this._doubleClickActionCookie.set(this._doubleClickAction)

        this._clearMap()
    }

    _showGridSelected(): void {
        this._showGrid = this._showGridCheckbox.get()
        this._grid.show = this._showGrid

        this._showGridCookie.set(String(this._showGrid))

        this._grid.update()
    }

    _clearMap(): void {
        Select.resetAll()
        this.f11.clearMap()
        this._ports.clearMap()
        this._portSelect.clearMap()
        this.showTrades.clearMap()
        this.#windRose.clearMap()
    }

    _doDoubleClickAction(event: Event): void {
        const [mx, my] = d3Pointer(event as MouseEvent, this.#mainG.node())

        if (this._doubleClickAction === "f11") {
            this.f11.printCoord(mx, my)
        } else {
            this._journey.plotCourse(mx, my)
        }

        this.zoomAndPan(mx, my)
    }

    _setZoomLevelAndData(transform: ZoomTransform): void {
        const scale = TileMap.getMapScale(transform.k)

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

        void this._pbZone.refresh()
        this._ports.update(this.#currentMapScale)
    }

    /**
     * Zoom svg groups
     */
    _naZoomed(event: D3ZoomEvent<SVGSVGElement, unknown>): void {
        const { transform: zoomTransform } = event

        this.#tileMap.drawMap(zoomTransform)

        this._ports.setBounds(this.#extent)
        this._pbZone.setBounds(this.#extent)
        this.showTrades.setBounds(this.#extent)

        const mapTransform = this.#tileMap.getMapTransform(zoomTransform)
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

        this.#resize()
        this._checkF11Coord()

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
        this.#tileMap.setViewport(this.#extent)
    }

    _setSvgSize(): void {
        this._svg.attr("width", this.width).attr("height", this.height)
    }

    _setFlexOverlayHeight(): void {
        const height = this.height - (this._grid.show && this.zoomLevel !== "initial" ? this.xGridBackgroundHeight : 0)
        document.querySelector<HTMLDivElement>("#summary-column")?.setAttribute("style", `height:${height}px`)
    }

    _getInitialMapScale(): number {
        let initialMapScale = nearestPow2(Math.min(this.height, this.width) / tileSize)
        const screenArea = this.height * this.width
        const mapAreaSmall = (tileSize * initialMapScale) ** 2
        const mapAreaLarge = (tileSize * initialMapScale * 2) ** 2

        if (screenArea - mapAreaSmall > mapAreaLarge - screenArea) {
            const scaleFactor = 2
            this.#overfillZoom = true
            initialMapScale *= scaleFactor
        }

        return initialMapScale
    }

    /**
     * {@link https://stackoverflow.com/a/57660500}
     * @param transform - Transform
     */
    _setTranslateExtent(transform: ZoomTransform): void {
        let newTransform = transform
        if (this.#overfillZoom) {
            const scaleFactor = 2
            const scale = transform.k / scaleFactor
            const { x, y } = transform
            newTransform = d3ZoomIdentity.translate(x, y).scale(scale)
        }

        this.#zoom.translateExtent([
            newTransform.invert(this.#extent[0] as [number, number]),
            newTransform.invert(this.#extent[1] as [number, number]),
        ])
    }

    _initialZoomAndPan(): void {
        const transform = this.zoomAndPan(this.coord.max / 2, this.coord.max / 2, true)

        this._setTranslateExtent(transform)
    }

    /**
     * Zoom and pan to x,y coord
     * @param x - x coord
     * @param y - y coord
     * @param init - true if map zoomed to initial scale
     */
    zoomAndPan(x: number, y: number, init = false): ZoomTransform {
        const mapScale = init ? this.#initialMapScale : 32
        const transform = d3ZoomIdentity
            .scale(mapScale)
            .translate(
                Math.floor((-x + this.coord.max / 2 + this.width / 2) / mapScale),
                Math.floor(-y + this.coord.max / 2 + this.height / 2) / mapScale
            )

        this._svg.call(this.#zoom.transform, transform)
        return transform
    }

    goToPort(): void {
        if (this._ports.currentPort.id === 0) {
            this._initialZoomAndPan()
        } else {
            this.zoomAndPan(this._ports.currentPort.coord.x, this._ports.currentPort.coord.y)
        }
    }
}

export { NAMap }
