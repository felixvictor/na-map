/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/list-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { max as d3Max, rollups as d3Rollups } from "d3-array"
import { Delaunay, Delaunay as d3Delaunay, Voronoi } from "d3-delaunay"
import { ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { timer as d3Timer } from "d3-timer"
import { zoomIdentity as d3ZoomIdentity, ZoomTransform } from "d3-zoom"

import loadImage from "image-promise"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
dayjs.extend(customParseFormat)

import { registerEvent } from "../analytics"
import { findNationById, nations, sleep } from "common/common"
import {
    getCanvasRenderingContext2D,
    loadJsonFiles,
    showCursorDefault,
    showCursorWait,
    colourWhite,
    getElementHeight,
    getElementWidth,
    getIdFromBaseName,
    nationFlags,
} from "common/common-browser"
import { getContrastColour } from "common/common-game-tools"
import { formatSiInt } from "common/common-format"
import { ϕ } from "common/common-math"

import { PortBasic } from "common/gen-json"
import { DataSource, HtmlString, MinMaxCoord, PowerMapList } from "common/interface"
import { ServerId } from "common/servers"

import { NAMap } from "../map/na-map"

interface JsonData {
    power: PowerMapList
}

interface ImagePromiseError {
    loaded: string[]
    errored: string[]
}

interface DivDimension {
    top: number
    left: number
    width: number
}

/**
 *
 */
export default class PowerMap {
    #serverId: ServerId
    readonly #baseId: HtmlString
    readonly #baseName = "Power map"
    readonly #menuId: HtmlString

    #columnsPerRow = 0
    #ctx = {} as CanvasRenderingContext2D
    #dateElem = {} as Selection<HTMLLabelElement, unknown, HTMLElement, unknown>
    #lastIndex = 0
    #index = -1
    #legendColumnPadding = 0
    #legendColumnWidth = 0
    #legendContainer = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #legendControllerHeight = 0
    #legendControllerElement = {} as HTMLDivElement
    #legendNationIndexContainer = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #legendNationItemContainer = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #legendRowHeight = 0
    #legendRowPadding = 0
    #mainDiv = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #map = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #maxY = 0
    #nationOldIndex = new Map<number, number>()
    #pattern = [] as Array<null | CanvasPattern>
    #playButton = {} as Selection<HTMLElement, unknown, HTMLElement, unknown>
    #portData = {} as PortBasic[]
    #powerData = {} as PowerMapList
    #rangeInput = {} as Selection<HTMLInputElement, unknown, HTMLElement, unknown>
    #rows = 0
    #stopCommand = false
    #voronoi = {} as Voronoi<Delaunay.Point>
    readonly #NAMap: NAMap
    readonly #colourScale: ScaleOrdinal<number, string>
    readonly #coord
    readonly #delayDefault = 200
    #delay = 200

    readonly #speedFactor = 2

    constructor(readonly map: NAMap, readonly serverId: ServerId, readonly coord: MinMaxCoord) {
        this.#serverId = serverId
        this.#NAMap = map

        this.#baseId = `show-${getIdFromBaseName(this.#baseName)}`
        this.#menuId = `menu-${this.#baseId}`

        this.#coord = coord
        this.#colourScale = d3ScaleOrdinal<number, string>()
            .domain(nations.map((nation) => nation.id))
            .range(nations.map((nation) => nation.colours[0]))

        this._setupListener()
    }

    _setupData(data: JsonData): void {
        this.#powerData = data.power
        this.#lastIndex = this.#powerData.length - 1

        this.#map = d3Select("g#map")
    }

    async _loadData(): Promise<JsonData> {
        const dataSources: DataSource[] = [
            {
                fileName: `${this.serverId}-power.json`,
                name: "power",
            },
        ]
        const readData = {} as JsonData

        this.#portData = (await import(/* webpackChunkName: "data-ports" */ "../../../../lib/gen-generic/ports.json"))
            .default as PortBasic[]
        await loadJsonFiles<JsonData>(dataSources, readData)

        return readData
    }

    async _loadAndSetupData(): Promise<void> {
        const readData = await this._loadData()
        this._setupData(readData)
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        await this._loadAndSetupData()
        showCursorWait()
        this._mapElementsOff()
        this._initialMapZoom()
        this._initVoronoi()
        void this._initCanvas()
        this._drawPowerMap()
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    _showMapElements(show: boolean): void {
        // Remove port icons
        this.#map.classed("d-none", !show)
        // Remove summary
        d3Select("main div.overlay").classed("d-none", !show)
    }

    _mapElementsOff(): void {
        this._showMapElements(false)
    }

    _mapElementsOn(): void {
        this._showMapElements(true)
    }

    _drawEnd(): void {
        showCursorDefault()
        this._mapElementsOn()
    }

    async _setPattern(): Promise<void> {
        const icons = Object.values(nationFlags)

        try {
            const images = await loadImage(icons)
            for (const [index, image] of images.entries()) {
                this.#pattern[index] = this.#ctx.createPattern(image, "repeat")
            }
        } catch (error: unknown) {
            console.error("One or more images have failed to load :(")
            console.error((error as ImagePromiseError).errored)
            console.info("But these loaded fine:")
            console.info((error as ImagePromiseError).loaded)
        }
    }

    _drawDate(date: string): void {
        const dateF = dayjs(date).format("D MMMM YYYY")

        this.#dateElem.text(dateF)
    }

    _drawMap(index: number, date: string, ports: number[]): void {
        for (const [index, nationId] of ports.entries()) {
            this.#ctx.beginPath()
            this.#voronoi.renderCell(index, this.#ctx)
            this.#ctx.fillStyle = this.#pattern[nationId] ?? "#000"
            this.#ctx.fill()
        }

        this._drawDate(date)
    }

    async _drawLoop(): Promise<void> {
        let date: string
        let ports: number[]

        while (!this.#stopCommand && this.#index < this.#lastIndex) {
            this.#index += 1
            this._setRangeValue()
            date = this.#powerData[this.#index][0]
            ports = this.#powerData[this.#index][1]

            // eslint-disable-next-line @typescript-eslint/no-loop-func
            const t = d3Timer((elapsed) => {
                this._drawMap(this.#index, date, ports)

                if (elapsed > this.#delay || this.#stopCommand) {
                    t.stop()
                }
            })
            this._drawNationLegend(ports)
            // eslint-disable-next-line no-await-in-loop
            await sleep(this.#delay * 1.1)
        }

        this._drawEnd()
    }

    _drawPowerMap(): void {
        void this._drawLoop()
    }

    _initVoronoi(): void {
        // Ignore free towns
        const freeTowns = new Set([
            96, // La Tortue
            112, // La Mona
            150, // Aves
            179, // Guayaguayare
            214, // Dariena
            231, // Great Corn
            286, // El Rancho
            343, // Tumbado
            366, // Shroud Cay
        ])
        const points = this.#portData.filter((port) => !freeTowns.has(port.id)).map((port) => port.coordinates)

        const delaunay = d3Delaunay.from(points)

        this.#maxY = d3Max(points, (point) => point[1]) ?? this.#coord.max
        const bounds = [this.#coord.min, this.#coord.min, this.#coord.max, this.#maxY]

        this.#voronoi = delaunay.voronoi(bounds)
    }

    _initLegend(dim: DivDimension): void {
        this.#legendContainer = d3Select("#na-map div")
            .append("div")
            .style("position", "relative")
            .style("width", `${dim.width}px`)
            .style("top", `-${dim.top}px`)
            .style("left", `${dim.left}px`)
            .attr("class", "d-flex flex-column")

        this._initController()
        this._initNationLegend(dim)
    }

    _initNationLegend(dim: DivDimension): void {
        this.#legendRowHeight = Math.floor(40 * ϕ)
        this.#legendRowPadding = Math.floor(ϕ)
        this.#legendColumnPadding = Math.floor(5 * ϕ)

        const { width } = dim
        const minColumnWidth = 75 + this.#legendColumnPadding * 2 // Width of "Verenigde Provinciën" plus padding
        const totalWidth = nations.length * minColumnWidth - this.#legendColumnPadding * 2
        this.#rows = Math.ceil(totalWidth / width)
        this.#columnsPerRow = Math.ceil(nations.length / this.#rows)
        this.#legendColumnWidth = Math.ceil(width / this.#columnsPerRow - this.#legendColumnPadding * 2)
        const legendNationContainer = this.#legendContainer.append("div")
        this.#legendNationItemContainer = legendNationContainer.append("div")
        this.#legendNationIndexContainer = legendNationContainer.append("div")
    }

    _getTopPosition(index: number): string {
        let top =
            index === -1
                ? -this.#legendRowHeight
                : Math.floor(index / this.#columnsPerRow) * (this.#legendRowPadding * 10 + this.#legendRowHeight)
        // Add padding
        top += 16 + this.#legendControllerHeight

        return `${top}px`
    }

    _getLeftPosition(index: number): string {
        const left =
            index === -1
                ? -this.#legendColumnWidth
                : Math.floor((index % this.#columnsPerRow) * (this.#legendColumnPadding + this.#legendColumnWidth))

        return `${left}px`
    }

    _resetOldIndex(): void {
        this.#nationOldIndex = new Map<number, number>()
    }

    _drawNationLegend(ports: number[]): void {
        const nations = d3Rollups(
            ports,
            (d) => d.length,
            (d) => d
        ).sort((a, b) => b[1] - a[1] || a[0] - b[0])
        const totalPorts = ports.length

        this.#legendNationItemContainer
            .selectAll<HTMLDivElement, [number, number]>("svg.legend")
            .data(nations, (d, index) => String(index).padStart(2, "0") + String(d[0]).padStart(2, "0"))
            .join(
                (enter) => {
                    const svg = enter
                        .append("svg")
                        .attr("class", "legend")
                        .attr("width", this.#legendColumnWidth)
                        .attr("height", this.#legendRowHeight + this.#legendRowPadding)
                        .style("position", "absolute")

                        .style("top", (d) => this._getTopPosition(this.#nationOldIndex.get(d[0]) ?? -1))
                        .style("left", (d) => this._getLeftPosition(this.#nationOldIndex.get(d[0]) ?? -1))
                        .transition()
                        .duration(this.#delay)
                        .style("top", (d, index) => this._getTopPosition(index))
                        .style("left", (d, index) => this._getLeftPosition(index))
                        .selection()

                    svg.append("rect")
                        .attr("class", "nation-header")
                        .attr("width", this.#legendColumnWidth)
                        .attr("height", Math.floor(this.#legendRowHeight / 2))
                        .style("fill", (d) => this.#colourScale(d[0]))

                    svg.append("text")
                        .attr("class", "nation-name")
                        .attr("x", Math.floor(this.#legendColumnPadding / 2))
                        .attr("y", "25%")
                        .html((d) => `${findNationById(d[0])?.sortName}`)
                        .style("fill", (d) => getContrastColour(this.#colourScale(d[0])))

                    svg.append("rect")
                        .attr("class", "opacity-low")
                        .attr("y", Math.floor(this.#legendRowHeight / 2 + this.#legendRowPadding))
                        .attr("width", "100%")
                        .attr("height", Math.floor(this.#legendRowHeight / 2))
                        .style("fill", (d) => this.#colourScale(d[0]))

                    svg.append("rect")
                        .attr("class", "value")
                        .attr("y", Math.floor(this.#legendRowHeight / 2 + this.#legendRowPadding))
                        .attr("height", Math.floor(this.#legendRowHeight / 2))
                        .attr("width", (d) => this.#legendColumnWidth * (d[1] / totalPorts))
                        .style("fill", (d) => this.#colourScale(d[0]))

                    svg.append("text")
                        .attr("class", "value")
                        .attr("x", this.#legendColumnWidth - this.#legendColumnPadding)
                        .attr("y", "75%")
                        .style("text-anchor", "end")
                        .html((d) => formatSiInt(d[1], true))

                    return svg
                },

                (update) => {
                    update
                        .select("rect.value")
                        .attr("width", (d) => this.#legendColumnWidth * (d[1] / totalPorts))
                        .style("fill", (d) => this.#colourScale(d[0]))

                    update.select("text.value").html((d) => formatSiInt(d[1], true))

                    return update
                }
            )

        this.#legendNationIndexContainer
            .selectAll<HTMLDivElement, [number, number]>("svg.index")
            .data(nations, (d, index) => index)
            .join(
                (enter) => {
                    const svg = enter
                        .append("svg")
                        .attr("class", "index")
                        .attr("width", this.#legendColumnWidth)
                        .attr("height", this.#legendRowHeight + this.#legendRowPadding)
                        .style("position", "absolute")
                        .style("top", (d, index) => this._getTopPosition(index))
                        .style("left", (d, index) => this._getLeftPosition(index))

                    svg.append("text")
                        .attr("x", this.#legendColumnWidth / 2)
                        .attr("y", (this.#legendRowHeight + this.#legendRowPadding) / 2)
                        .attr("fill", colourWhite)
                        .attr("opacity", 0)
                        .attr("text-anchor", "middle")
                        .attr("dominant-baseline", "mathematical")
                        .attr("font-variant", "normal")
                        .attr("font-size", `${this.#legendRowHeight}px`)
                        .text((d, index) => index + 1)

                        .transition()
                        .duration(this.#delay)
                        .attr("opacity", 0.3)
                        .selection()

                    return svg
                },
                (update) => update,
                (exit) =>
                    exit.attr("opacity", 0.3).transition().duration(this.#delay).attr("opacity", 0).remove().selection()
            )

        // Remember old indexes
        this._resetOldIndex()
        for (const [index, nation] of nations.entries()) {
            this.#nationOldIndex.set(nation[0], index)
        }
    }

    _getRangeValue(): string {
        return this.#rangeInput.property("value")
    }

    _setRangeValue(): void {
        this.#rangeInput.property("value", this.#index)
    }

    _updateRangeValue(updateDateOnly = false): void {
        this.#index = Number.parseFloat(this._getRangeValue())
        this._updateController(updateDateOnly)
    }

    _initRange(formRow: Selection<HTMLDivElement, unknown, HTMLElement, unknown>): void {
        const inputId = `range-${this.#baseId}`

        const formGroup = formRow.append("div").attr("class", "row col-md-7 mb-0")
        this.#rangeInput = formGroup
            .append("div")
            .attr("class", "col-md-5")
            .append("input")
            .attr("id", inputId)
            .attr("type", "range")
            .attr("class", "form-range px-md-2")
            .attr("style", "height:100%")
            .attr("min", "0")
            .attr("max", String(this.#lastIndex))
        formGroup.append("div").attr("class", "col-md-1")

        this.#dateElem = formGroup
            .append("label")
            .attr("for", inputId)
            .attr("class", "col-md-6 col-form-label")
            .attr("style", "font-size:120%")
            .attr("title", "Date")
            .text("Start")

        let down = false
        this.#rangeInput
            .on("change", () => {
                this._updateRangeValue()
            })
            .on("mousedown", () => {
                down = true
                this.#stopCommand = true
                this._togglePlayButton()
            })
            .on("mousemove", () => {
                if (down) {
                    this._updateRangeValue(true)
                }
            })
            .on("mouseup", () => {
                down = false
            })
    }

    _getYear(index: number): number {
        return dayjs(this.#powerData[index][0]).year()
    }

    _togglePlayButton(): void {
        this.#playButton.classed("icon-pause", !this.#stopCommand).classed("icon-play", this.#stopCommand)
    }

    _initialMapZoom(): void {
        this.#NAMap.zoomAndPan(this.#coord.max / 2, this.#coord.max / 2, true)
    }

    _updateController(updateDateOnly = false): void {
        const date = this.#powerData[this.#index][0]
        const ports = this.#powerData[this.#index][1]

        this._setRangeValue()
        this._drawDate(date)
        this._adjustControllerHeight()
        this.#stopCommand = true
        this._togglePlayButton()

        if (!updateDateOnly) {
            this._resetOldIndex()
            this._drawMap(this.#index, date, ports)
            this._drawNationLegend(ports)
        }
    }

    _initButtons(formRow: Selection<HTMLDivElement, unknown, HTMLElement, unknown>): void {
        const buttonBaseId = `menu-${this.#baseId}`

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const playButtonClicked = () => {
            this.#stopCommand = !this.#stopCommand
            this._togglePlayButton()

            if (!this.#stopCommand) {
                void this._drawLoop()
            }
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const startButtonClicked = () => {
            this.#index = 0
            this._updateController()
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const backButtonClicked = () => {
            let index = this.#index
            const currentYear = this._getYear(index)
            let previousYear = currentYear

            for (; index > 0 && previousYear === currentYear; index--) {
                previousYear = this._getYear(index)
            }

            this.#index = index + 1
            this._updateController()
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const forwardButtonClicked = () => {
            let index = this.#index
            const currentYear = this._getYear(index)
            let nextYear = currentYear

            for (; index < this.#lastIndex && nextYear === currentYear; index++) {
                nextYear = this._getYear(index)
            }

            this.#index = index - 1
            this._updateController()
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const endButtonClicked = () => {
            this.#index = this.#lastIndex
            this._updateController()
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const slowerButtonClicked = () => {
            this.#delay *= this.#speedFactor
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const normalButtonClicked = () => {
            this.#delay = this.#delayDefault
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const fasterButtonClicked = () => {
            this.#delay = Math.max(10, this.#delay / this.#speedFactor)
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const closeButtonClicked = () => {
            this._drawEnd()
            this.#mainDiv.remove()
            this._initialMapZoom()
        }

        const addButton = (icon: string, title: string): Selection<HTMLElement, unknown, HTMLElement, unknown> =>
            buttonGroup
                .append("button")
                .attr("type", "button")
                .attr("id", `${buttonBaseId}-${icon}`)
                .attr("class", "btn btn-default icon-button p-0")
                .attr("title", title)
                .append("i")
                .attr("class", `icon icon-large icon-${icon}`)

        const buttonToolbar = formRow.append("div").attr("class", "btn-toolbar col-md-4").attr("role", "toolbar")

        let buttonGroup = buttonToolbar.append("div").attr("class", "btn-group").attr("role", "group")
        const startButton = addButton("start", "Start")
        const backButton = addButton("back", "Year back")

        buttonGroup = buttonToolbar.append("div").attr("class", "btn-group").attr("role", "group")
        this.#playButton = addButton("pause", "Pause")

        buttonGroup = buttonToolbar.append("div").attr("class", "btn-group me-3").attr("role", "group")
        const forwardButton = addButton("forward", "Year forward")
        const endButton = addButton("end", "End")

        startButton.on("click", startButtonClicked)
        backButton.on("click", backButtonClicked)
        this.#playButton.on("click", playButtonClicked)
        forwardButton.on("click", forwardButtonClicked)
        endButton.on("click", endButtonClicked)

        buttonGroup = buttonToolbar.append("div").attr("class", "btn-group").attr("role", "group")
        const slowerButton = addButton("slower", "Slower")
        const normalButton = addButton("normal", "Normal speed")
        const fasterButton = addButton("faster", "Faster")
        slowerButton.on("click", slowerButtonClicked)
        normalButton.on("click", normalButtonClicked)
        fasterButton.on("click", fasterButtonClicked)

        buttonGroup = formRow.append("div").attr("class", "btn-group col-md-1").attr("role", "group")
        const closeButton = addButton("close", "Close")
        closeButton.on("click", closeButtonClicked)
    }

    _adjustControllerHeight(): void {
        this.#legendControllerHeight = getElementHeight(this.#legendControllerElement)
        this.#legendContainer.selectAll("svg.legend").style("top", (d, index) => this._getTopPosition(index))
        this.#legendContainer.selectAll("svg.index").style("top", (d, index) => this._getTopPosition(index))
    }

    _initController(): void {
        const legendController = this.#legendContainer
            .append("div")
            .style("background-color", colourWhite)
            .attr("class", "p-2")
        this.#legendControllerElement = legendController.node() as HTMLDivElement

        const formRow = legendController
            .append("form")
            .append("div")
            .attr("class", "row input-group align-items-center")

        const ro = new ResizeObserver(() => {
            this._adjustControllerHeight()
        })

        this._initRange(formRow)
        this._initButtons(formRow)

        this.#legendControllerHeight = getElementHeight(this.#legendControllerElement)
        ro.observe(this.#legendControllerElement)
    }

    _getTopAlignedTransform(element: SVGGElement): ZoomTransform {
        const { a: scale, e: tx } = element.transform.baseVal.consolidate()?.matrix || {}
        return scale && tx ? d3ZoomIdentity.scale(scale).translate(tx / scale, 0) : ({} as ZoomTransform)
    }

    async _initCanvas(): Promise<void> {
        const pixelRatio = 2

        // Move map to top
        const gMapTiles = d3Select("#na-map svg g.map-tiles")
        const mapTransform = this._getTopAlignedTransform(this.#map.node() as SVGGElement)
        const mapTilesTransform = this._getTopAlignedTransform(gMapTiles.node() as SVGGElement)
        this.#map.attr("transform", mapTransform.toString())
        gMapTiles.attr("transform", mapTilesTransform.toString())

        // Get svg size
        const svg = d3Select("#na-map svg")
        const heightCss = svg.style("height")
        const widthCss = svg.style("width")

        // Position canvas on top of svg
        this.#mainDiv = d3Select("#na-map")
            .append("div")
            .style("position", "relative")
            .style("top", `-${heightCss}`)
            .style("height", "100%")
            .style("opacity", 0.7)

        // Add canvas
        const canvas = this.#mainDiv.append("canvas")
        const canvasNode = canvas.node() as HTMLCanvasElement

        // Set display size (css pixels)
        canvasNode.style.height = heightCss
        canvasNode.style.width = widthCss

        // Set actual size in memory
        canvasNode.height = Math.floor(Number.parseFloat(heightCss) * pixelRatio)
        canvasNode.width = Math.floor(Number.parseFloat(widthCss) * pixelRatio)

        // Set context and transformation
        this.#ctx = getCanvasRenderingContext2D(canvasNode)
        this.#ctx.translate(mapTransform.x * pixelRatio, mapTransform.y * pixelRatio)
        this.#ctx.scale(mapTransform.k * pixelRatio, mapTransform.k * pixelRatio)

        const tilesWidth = getElementWidth(gMapTiles.node() as SVGGElement)
        const dim: DivDimension = {
            top: Math.floor(this.map.height - this.#maxY * mapTransform.k + mapTransform.y),
            left: mapTransform.x,
            width: tilesWidth,
        }
        this._initLegend(dim)
        await this._setPattern()
    }
}
