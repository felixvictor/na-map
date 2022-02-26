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
import { scaleLinear as d3ScaleLinear } from "d3-scale"
import { D3ZoomEvent, zoom as d3Zoom, ZoomBehavior, zoomIdentity as d3ZoomIdentity, ZoomTransform } from "d3-zoom"

import { registerEvent } from "../../analytics"
import { defaultFontSize, Extent, nearestPow2, Point } from "common/common-math"
import {
    initScale,
    labelScaleThreshold,
    mapSize,
    maxScale,
    minScale,
    pbZoneScaleThreshold,
    zoomAndPanScale,
} from "common/common-var"

import { MinMaxCoord, ZoomLevel } from "common/interface"
import { ServerId } from "common/servers"

import Cookie from "util/cookie"
import RadioButton from "util/radio-button"
import Select from "util/select"

import DisplayPbZones from "../display-pb-zones"
import DisplayPorts from "../display-ports"
import MakeJourney from "../make-journey"
import PowerMap from "../../game-tools/show-power-map"
import SelectPorts from "../select-ports"
import ShowF11 from "../show-f11"
import ShowTrades from "../show-trades"
import TrilateratePosition from "../get-position"
import WindRose from "../wind-rose"

import About from "./about"
import TileMap from "./tile-map"

/**
 * Display naval action map
 */
class NAMap {
    #currentMapScale = 0
    #doubleClickAction: string
    #extent = [
        [0, 0],
        [mapSize, mapSize],
    ] as Extent
    #journey!: MakeJourney
    #mainG = {} as Selection<SVGGElement, Event, HTMLElement, unknown>
    #pbZone!: DisplayPbZones
    #portSelect!: SelectPorts
    #ports!: DisplayPorts
    #svg!: Selection<SVGSVGElement, Event, HTMLElement, unknown>
    #tileMap: TileMap
    #timeoutId = 0
    #windRose!: WindRose
    #zoom = {} as ZoomBehavior<SVGSVGElement, Event>
    #zoomLevel!: ZoomLevel
    #zoomScale = d3ScaleLinear().domain([0, mapSize])
    coord: MinMaxCoord
    f11!: ShowF11
    height = 0
    readonly #doubleClickActionCookie: Cookie
    readonly #doubleClickActionId: string
    readonly #doubleClickActionRadios: RadioButton
    readonly #doubleClickActionValues: string[]
    readonly #searchParams: URLSearchParams
    readonly rem = defaultFontSize // Font size in px
    serverName: ServerId
    showTrades!: ShowTrades
    width = 0

    /**
     * @param serverName - Naval action server name
     * @param searchParams - Query arguments
     */
    constructor(serverName: ServerId, searchParams: URLSearchParams) {
        /**
         * Naval action server name
         */
        this.serverName = serverName
        this.#searchParams = searchParams

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
        this.#doubleClickActionId = "double-click-action"

        /**
         * DoubleClickAction settings
         */
        this.#doubleClickActionValues = ["compass", "f11"]

        this.#doubleClickActionCookie = new Cookie({
            id: this.#doubleClickActionId,
            values: this.#doubleClickActionValues,
        })
        this.#doubleClickActionRadios = new RadioButton(this.#doubleClickActionId, this.#doubleClickActionValues)

        /**
         * Get DoubleClickAction setting from cookie or use default value
         */
        this.#doubleClickAction = this.#getDoubleClickAction()

        this.#setHeightWidth()
        this.#tileMap = new TileMap(this.width, this.height)
        this.#setupSvg()
        this.#setupListener()
    }

    async MapInit(): Promise<void> {
        await this.#setupData()
    }

    /**
     * Read cookie for doubleClickAction
     */
    #getDoubleClickAction(): string {
        const r = this.#doubleClickActionCookie.get()

        this.#doubleClickActionRadios.set(r)

        return r
    }

    async #setupData(): Promise<void> {
        //        Const marks = [];

        //        marks.push("setupData");
        //        performance.mark(`${marks[marks.length - 1]}-start`);
        // function();
        //        performance.mark(`${marks[marks.length - 1]}-end`);

        this.#ports = new DisplayPorts(this)
        await this.#ports.init()
        this.#pbZone = new DisplayPbZones(this.#ports, this.serverName)

        this.#portSelect = new SelectPorts(this.#ports)

        this.showTrades = new ShowTrades(this.#ports, this.serverName)
        await this.showTrades.init()
        this.#ports.portIcons.showTrades = this.showTrades
        this.f11 = new ShowF11(this, this.coord)

        this.#init()
        this.#journey = new MakeJourney(this.rem)
        this.#windRose = new WindRose()
        void new TrilateratePosition(this.#ports)
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
        this.#setHeightWidth()
        this.#initialZoomAndPan()
        this.#setFlexOverlayHeight()
    }

    #resizeTimer(): void {
        const delay = 250

        window.clearTimeout(this.#timeoutId)
        this.#timeoutId = window.setTimeout(() => {
            this.#resize()
        }, delay)
    }

    #setupSvg(): void {
        this.#svg = d3Select<SVGSVGElement, Event>("#na-map")
            .append<SVGSVGElement>("svg")
            .attr("id", "na-svg")
            .attr("class", "fill-empty stroke-empty bg-map")
            .attr("width", this.width)
            .attr("height", this.height)

        this.#svg.append<SVGDefsElement>("defs")
        this.#mainG = this.#svg.append("g").attr("id", "map")
        this.#tileMap.setupSvg()
    }

    #setupListener(): void {
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
            this.#clearMap()
        })
        document.querySelector("#double-click-action")?.addEventListener("change", () => {
            this.#doubleClickSelected()
        })

        window.addEventListener("resize", () => {
            this.#resizeTimer()
        })
    }

    #doubleClickSelected(): void {
        this.#doubleClickAction = this.#doubleClickActionRadios.get()

        this.#doubleClickActionCookie.set(this.#doubleClickAction)

        this.#clearMap()
    }

    #clearMap(): void {
        Select.resetAll()
        this.f11.clearMap()
        this.#ports.clearMap()
        this.#portSelect.clearMap()
        this.showTrades.clearMap()
        this.#windRose.clearMap()
    }

    #doDoubleClickAction(event: Event): void {
        const [mx, my] = d3Pointer(event as MouseEvent, this.#mainG.node())

        if (this.#doubleClickAction === "f11") {
            this.f11.printCoord(mx, my)
        } else {
            this.#journey.plotCourse(mx, my)
        }

        this.zoomAndPan(mx, my)
    }

    #setZoomLevelAndData(transform: ZoomTransform): void {
        const scale = transform.k

        if (scale !== this.#currentMapScale) {
            this.#currentMapScale = scale
            if (this.#currentMapScale > pbZoneScaleThreshold) {
                if (this.zoomLevel !== "pbZone") {
                    this.zoomLevel = "pbZone"
                }
            } else if (this.#currentMapScale > labelScaleThreshold) {
                if (this.zoomLevel !== "portLabel") {
                    this.zoomLevel = "portLabel"
                }
            } else if (this.zoomLevel !== "initial") {
                this.zoomLevel = "initial"
            }
        }

        void this.#pbZone.refresh()
        this.#ports.update(this.#currentMapScale)
    }

    #getMapTransform(zoomTransform: ZoomTransform): ZoomTransform {
        const tileMapTransform = this.#tileMap.mapTileTransform
        const scale = 2 ** (Math.log2(zoomTransform.k) - Math.log2(mapSize))
        const tx = tileMapTransform.x
        const ty = tileMapTransform.y

        return d3ZoomIdentity.translate(tx, ty).scale(scale)
    }

    #getDOMPoint(x: number, y: number, screen = true): DOMPoint {
        const node = this.#mainG.node() as SVGGElement
        const point = node.ownerSVGElement?.createSVGPoint()

        if (point) {
            point.x = x
            point.y = y

            const matrix = node.getCTM()

            if (matrix) {
                return screen ? point.matrixTransform(matrix) : point.matrixTransform(matrix.inverse())
            }
        }

        return {
            x: 0,
            y: 0,
        } as DOMPoint
    }

    #getScreenCoordinate(x: number, y: number): Point {
        const { x: wx, y: wy } = this.#getDOMPoint(x, y, true)

        return [wx, wy]
    }

    #getWorldCoordinate(x: number, y: number): Point {
        const { x: wx, y: wy } = this.#getDOMPoint(x, y, false)

        return [wx, wy]
    }

    #getWorldCoordinates(): Extent {
        // Limit coordinates to [0, 0] and [mapSize, mapSize]
        const topLeft = this.#getWorldCoordinate(0, 0).map((coord) => Math.max(0, coord)) as Point
        const bottomRight = this.#getWorldCoordinate(this.width, this.height).map((coord) =>
            Math.min(coord, mapSize)
        ) as Point

        return [topLeft, bottomRight]
    }

    /**
     * Zoom svg groups
     */
    #naZoomed(event: D3ZoomEvent<SVGSVGElement, unknown>): void {
        const { transform: svgTransform } = event

        this.#tileMap.drawMap(svgTransform)

        const mapTransform = this.#getMapTransform(svgTransform)
        this.showTrades.transform(mapTransform)
        this.#mainG.attr("transform", mapTransform.toString())

        this.#extent = this.#getWorldCoordinates()
        this.#ports.setBounds(this.#extent)
        this.#pbZone.setBounds(this.#extent)
        this.showTrades.setBounds(this.#extent)

        this.#setZoomLevelAndData(svgTransform)
    }

    #setupZoom(): void {
        this.#zoom = d3Zoom<SVGSVGElement, Event>()
            .extent([
                [0, 0],
                [this.width, this.height],
            ])
            .scaleExtent([minScale, maxScale])
            .wheelDelta((event: Event) => -Math.sign((event as WheelEvent).deltaY))
            .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                this.#naZoomed(event)
            })

        this.#svg
            .call(this.#zoom)
            .on("dblclick.zoom", () => ({}))
            .on("click", () => ({}))
            .on("dblclick", (event: Event) => {
                this.#doDoubleClickAction(event)
            })
    }

    #checkF11Coord(): void {
        if (this.#searchParams.has("x") && this.#searchParams.has("z")) {
            this.f11.goToF11FromParam(this.#searchParams)
        }
    }

    #init(): void {
        this.zoomLevel = "initial"

        this.#setupZoom()
        this.#resize()
        this.#checkF11Coord()

        document.querySelector<HTMLElement>("#navbar-left")?.classList.remove("d-none")
    }

    get zoomLevel(): ZoomLevel {
        return this.#zoomLevel
    }

    set zoomLevel(zoomLevel: ZoomLevel) {
        this.#zoomLevel = zoomLevel
        this.#ports.zoomLevel = zoomLevel
    }

    getDimensions(): DOMRect {
        const selector = document.querySelectorAll<HTMLDivElement>(".overlay")[0]

        return selector.getBoundingClientRect()
    }

    #getWidth(): number {
        const { width } = this.getDimensions()

        return Math.floor(width)
    }

    #getHeight(): number {
        const { top } = this.getDimensions()
        const fullHeight = document.documentElement.clientHeight - this.rem

        return Math.floor(fullHeight - top)
    }

    #setHeightWidth(): void {
        /**
         * Width of map svg (screen coordinates)
         */
        this.width = this.#getWidth()

        /**
         * Height of map svg (screen coordinates)
         */
        this.height = this.#getHeight()
    }

    #setFlexOverlayHeight(): void {
        document.querySelector<HTMLDivElement>("#summary-column")?.setAttribute("style", `height:${this.height}px`)
    }

    #transform(tx: number, ty: number, tk: number): void {
        const transform = d3ZoomIdentity.translate(tx, ty).scale(tk)

        this.#svg.call(this.#zoom.transform, transform)
    }

    #initialZoomAndPan(): void {
        this.#transform(this.width / 2, this.height / 2, initScale)
    }

    /**
     * Zoom and pan to world coord
     * @param x - x world coord
     * @param y - y world coord
     * @param showAll - zoom in to show full map
     */
    zoomAndPan(x: number, y: number, showAll = false): void {
        const scale = showAll ? nearestPow2(Math.min(this.width, this.height)) : zoomAndPanScale
        this.#zoomScale.range([scale / 2, -scale / 2])

        const tx = this.#zoomScale(x) + this.width / 2
        const ty = this.#zoomScale(y) + this.height / 2

        this.#transform(tx, ty, scale)
    }

    goToPort(): void {
        if (this.#ports.currentPort.id === 0) {
            this.#initialZoomAndPan()
        } else {
            this.zoomAndPan(this.#ports.currentPort.coord.x, this.#ports.currentPort.coord.y)
        }
    }
}

export { NAMap }
