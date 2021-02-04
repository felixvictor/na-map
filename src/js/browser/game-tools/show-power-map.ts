/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/list-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { group as d3Group, max as d3Max, rollups as d3Rollups } from "d3-array"
import { Delaunay, Delaunay as d3Delaunay, Voronoi } from "d3-delaunay"
import { ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select, selectAll as d3SelectAll, Selection } from "d3-selection"
import { timer as d3Timer } from "d3-timer"
import loadImage from "image-promise"

import { capitalizeFirstLetter, findNationById, nations, range, sleep } from "common/common"
import {
    nationColourList,
    getCanvasRenderingContext2D,
    loadJsonFiles,
    showCursorDefault,
    showCursorWait,
    getIcons,
    colourWhite,
    colourRedDark,
} from "common/common-browser"
import dayjs from "dayjs"

import customParseFormat from "dayjs/plugin/customParseFormat"

import { BaseModal } from "./base-modal"
import { PortBasic } from "common/gen-json"
import { DataSource, MinMaxCoord, PowerMapList } from "common/interface"
import { getContrastColour } from "common/common-game-tools"
import { formatSiInt } from "common/common-format"
import { getOrdinal } from "common/common-math"

dayjs.extend(customParseFormat)

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
export default class PowerMap extends BaseModal {
    #ctx = {} as CanvasRenderingContext2D
    #controllerWidth = 330
    #columnsPerRow = 0
    #delay = 4000
    #lastIndex = 0
    #legendColumnPadding = 0
    #legendColumnWidth = 0
    #legendContainer = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #legendNationContainer = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #legendRowHeight = 0
    #legendRowPadding = 0
    #map = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #maxY: number | undefined
    #nationOldIndex = new Map<number, number>()
    #pattern = [] as Array<null | CanvasPattern>
    #portData = {} as PortBasic[]
    #powerData = {} as PowerMapList
    #rangeInput = {} as Selection<HTMLInputElement, unknown, HTMLElement, unknown>
    #rows = 0
    #stopCommand = true
    #textBackgroundHeight = 0
    #textBackgroundWidth = 0
    #textBackgroundX = 0
    #textBackgroundY = 0
    #textRectX = 0
    #textRectY = 0

    #voronoi = {} as Voronoi<Delaunay.Point>

    readonly #colourScale: ScaleOrdinal<number, string>

    readonly #coord

    constructor(serverId: string, coord: MinMaxCoord) {
        super(serverId, "Show power map")

        this.#coord = coord
        this.#colourScale = d3ScaleOrdinal<number, string>()
            .domain(range(0, nations.length - 1))
            .range(nationColourList)

        void this._setupListener()
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

        this.#portData = (await import(/* webpackChunkName: "data-ports" */ "../../../lib/gen-generic/ports.json"))
            .default as PortBasic[]
        await loadJsonFiles<JsonData>(dataSources, readData)

        return readData
    }

    async _loadAndSetupData(): Promise<void> {
        const readData = await this._loadData()
        this._setupData(readData)
    }

    /**
     * Setup listener
     */
    async _setupListener(): Promise<void> {
        await this._loadAndSetupData()
        this._menuItemSelected()

        /*
        const firstClick = true
        document.querySelector(`#${this.buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this.baseName)

            this._menuItemSelected()
        })
         */
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
        console.timeEnd("animation")
        showCursorDefault()
        this._mapElementsOn()
    }

    async _setPattern(): Promise<void> {
        const icons = Object.values(getIcons())

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

    _getTextHeight(text: string): number {
        const { actualBoundingBoxAscent, actualBoundingBoxDescent } = this.#ctx.measureText(text)
        return Math.floor(actualBoundingBoxAscent + actualBoundingBoxDescent)
    }

    _getTextWidth(text: string): number {
        const { actualBoundingBoxLeft, actualBoundingBoxRight } = this.#ctx.measureText(text)
        return Math.floor(actualBoundingBoxLeft + actualBoundingBoxRight)
    }

    _getTextDim(): { height: number; width: number } {
        const height = this._getTextHeight("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
        const width = this._getTextWidth("26 September 2020")

        return {
            height,
            width,
        }
    }

    _initDrawDate(): void {
        const textMarginX = 300
        const textMarginY = 200
        const textPaddingY = 50

        const textPaddingX = textPaddingY * 2
        const textDim = this._getTextDim()

        this.#textBackgroundX = this.#coord.max - textMarginX - textPaddingX - textDim.width
        this.#textBackgroundY = textMarginY - textPaddingY
        this.#textBackgroundHeight = textDim.height + 2 * textPaddingY
        this.#textBackgroundWidth = textDim.width + 2 * textPaddingX

        this.#textRectX = this.#coord.max - textMarginX
        this.#textRectY = textMarginY + textDim.height
    }

    _drawDate(date: string): void {
        const dateF = dayjs(date).format("D MMMM YYYY")

        // Date background
        this.#ctx.globalAlpha = 0.8
        this.#ctx.fillStyle = colourWhite
        this.#ctx.fillRect(
            this.#textBackgroundX,
            this.#textBackgroundY,
            this.#textBackgroundWidth,
            this.#textBackgroundHeight
        )

        // Date
        this.#ctx.globalAlpha = 1
        this.#ctx.fillStyle = colourRedDark
        this.#ctx.fillText(dateF, this.#textRectX, this.#textRectY)
    }

    _drawMap(index: number, date: string, ports: number[]): void {
        console.timeLog("animation", index, date)

        for (const [index, nationId] of ports.entries()) {
            this.#ctx.beginPath()
            this.#voronoi.renderCell(index, this.#ctx)
            this.#ctx.fillStyle = this.#pattern[nationId] ?? "#000"
            this.#ctx.fill()
        }

        this._drawDate(date)
    }

    async _drawLoop(index: number): Promise<void> {
        let date: string
        let ports: number[]
        this.#lastIndex = 200

        while (this.#stopCommand && index < this.#lastIndex) {
            index += 1
            date = this.#powerData[index][0]
            ports = this.#powerData[index][1]

            this.#rangeInput.attr("value", index)
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            const t = d3Timer((elapsed) => {
                this._drawMap(index, date, ports)

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
        const index = -1

        console.time("animation")
        const updateValue = (event: Event) => event
        ;(this.#rangeInput.node() as HTMLInputElement).addEventListener("change", updateValue)
        void this._drawLoop(index)
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
        console.log("delaunay", delaunay)

        this.#maxY = d3Max(points, (point) => point[1])
        this.#maxY = this.#maxY ? Math.floor(this.#maxY * 1.05) : this.#coord.max
        const bounds = [this.#coord.min, this.#coord.min, this.#coord.max, this.#maxY]
        console.log("bounds", bounds)

        this.#voronoi = delaunay.voronoi(bounds)
        console.log("voronoi", this.#voronoi)
    }

    _initLegend(dim: DivDimension): void {
        this.#legendContainer = d3Select("#na-map div")
            .append("div")
            .style("position", "relative")
            .style("width", `${dim.width}px`)
            .style("top", `-${dim.top}px`)
            .style("left", `${dim.left}px`)
            .attr("class", "d-flex justify-content-between")
    }

    _initNationLegend(dim: DivDimension): void {
        this.#legendRowHeight = Math.floor(20 * 1.618)
        this.#legendRowPadding = Math.floor(0.5 * 1.618)
        this.#legendColumnPadding = Math.floor(2 * 1.618)

        const width = dim.width - this.#controllerWidth
        const minColumnWidth = 160 + this.#legendColumnPadding * 2 // Width of "Verenigde Provinciën" plus padding
        const totalWidth = nations.length * minColumnWidth - this.#legendColumnPadding * 2
        this.#rows = Math.ceil(totalWidth / width)
        this.#columnsPerRow = Math.ceil(nations.length / this.#rows)
        this.#legendColumnWidth = Math.ceil(width / this.#columnsPerRow - this.#legendColumnPadding * 2)
        this.#legendNationContainer = this.#legendContainer
            .append("div")
            // .style("position", "relative")
            .style("width", `${width}px`)
            // .style("top", `-${dim.top}px`)
            // .style("left", `${dim.left + this.#controllerWidth * 1.1}px`)
            // .style("background-color", colourWhite)
            // .attr("class", "d-flex flex-wrap justify-content-between pl-3")
            .attr("class", "pl-3")

        console.log(
            dim,
            this.#controllerWidth,
            width,
            minColumnWidth,
            totalWidth,
            this.#legendColumnWidth,
            this.#rows,
            this.#columnsPerRow
        )
    }

    _getTopPosition(index: number): string {
        const top =
            index === -1
                ? -this.#legendRowHeight
                : Math.floor(index / this.#columnsPerRow) * (this.#legendRowHeight + this.#legendRowPadding)
        console.log("_getTopPosition", index, Math.floor(index / this.#columnsPerRow), top)
        return `${top + 16}px`
    }

    _getLeftPosition(index: number): string {
        const left =
            index === -1
                ? -this.#legendColumnWidth
                : Math.ceil(((index % this.#columnsPerRow) * this.#legendColumnWidth) / this.#columnsPerRow)
        console.log("_getLeftPosition", index, left)
        return `${left}px`
    }

    _drawNationLegend(ports: number[]): void {
        const nations = d3Rollups(
            ports,
            (d) => d.length,
            (d) => d
        ).sort((a, b) => b[1] - a[1] || a[0] - b[0])
        const totalPorts = ports.length

        console.log(ports, nations, this.#nationOldIndex)

        this.#legendNationContainer
            .selectAll<HTMLDivElement, [number, number]>("svg.svg-text")
            .data(nations, (d, index) => String(index).padStart(2, "0") + String(d[0]).padStart(2, "0"))
            .join(
                (enter) => {
                    const svg = enter
                        .append("svg")
                        .attr("class", "svg-text")
                        .attr("width", this.#legendColumnWidth)
                        .attr("height", this.#legendRowHeight * 2 + this.#legendRowPadding)
                        .style("position", "relative")

                        .style("top", (d, index) => {
                            console.log("old", this.#nationOldIndex.get(d[0]) ?? -1, "current", index)
                            return this._getTopPosition(this.#nationOldIndex.get(d[0]) ?? -1)
                        })
                        .style("left", (d, index) => {
                            console.log("old", this.#nationOldIndex.get(d[0]) ?? -1, "current", index)
                            return this._getLeftPosition(this.#nationOldIndex.get(d[0]) ?? -1)
                        })

                        .transition()
                        .duration(this.#delay)
                        .style("top", (d, index) => this._getTopPosition(index))
                        .style("left", (d, index) => this._getLeftPosition(index))
                        .selection()

                    svg.append("rect")
                        .attr("class", "nation-header")
                        .attr("width", this.#legendColumnWidth)
                        .attr("height", this.#legendRowHeight)
                        .style("fill", (d) => this.#colourScale(d[0]))

                    svg.append("text")
                        .attr("class", "nation-name")
                        .attr("x", this.#legendColumnPadding)
                        .attr("y", "25%")
                        .html((d, index) => `${index + 1}. ${findNationById(d[0]).sortName}`)
                        .style("fill", (d) => getContrastColour(this.#colourScale(d[0])))

                    svg.append("rect")
                        .attr("class", "rect-background")
                        .attr("y", this.#legendRowHeight + this.#legendRowPadding)
                        .attr("width", this.#legendColumnWidth)
                        .attr("height", this.#legendRowHeight)
                        .style("fill", (d) => this.#colourScale(d[0]))

                    svg.append("rect")
                        .attr("class", "value")
                        .attr("y", this.#legendRowHeight + this.#legendRowPadding)
                        .attr("height", this.#legendRowHeight)
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

        this.#nationOldIndex = new Map<number, number>()
        for (const [index, nation] of nations.entries()) {
            this.#nationOldIndex.set(nation[0], index)
        }
    }

    _initController(dim: DivDimension): void {
        const baseName = "power-map"
        const inputId = `range-${baseName}`
        const buttonBaseId = `button-${baseName}`

        const startButtonClicked = (event: Event) => {
            console.log(event, event.currentTarget)
        }

        const backButtonClicked = (event: Event) => {
            console.log(event, event.currentTarget)
        }

        const playButtonClicked = (event: Event) => {
            console.log(event, event.currentTarget)
            const isPlayButton = d3Select(event.currentTarget as HTMLButtonElement).classed("icon-play")
            this.#stopCommand = isPlayButton
            d3Select(event.currentTarget as HTMLButtonElement)
                .classed("icon-pause", isPlayButton)
                .classed("icon-play", !isPlayButton)
        }

        const forwardButtonClicked = (event: Event) => {
            console.log(event, event.currentTarget)
        }

        const endButtonClicked = (event: Event) => {
            console.log(event, event.currentTarget)
        }

        const addButton = (icon: string): Selection<HTMLElement, unknown, HTMLElement, unknown> =>
            buttonGroup
                .append("button")
                .attr("type", "button")
                .attr("id", `${buttonBaseId}-${icon}`)
                .attr("class", "btn btn-default icon-outline-button")
                .attr("title", capitalizeFirstLetter(icon))
                .append("i")
                .attr("class", `icon icon-large icon-${icon}`)

        const div = this.#legendContainer
            .append("div")
            // .style("position", "relative")
            .style("width", `${this.#controllerWidth}px`)
            // .style("top", `-${dim.top}px`)
            // .style("left", `${dim.left}px`)
            .style("background-color", colourWhite)
            .attr("class", "p-3 mt-3")
            .append("form")
            .append("div")
            .attr("class", "form-group mb-1")
        div.append("label").attr("for", inputId).text("Date range")
        this.#rangeInput = div
            .append("input")
            .attr("id", inputId)
            .attr("type", "range")
            .attr("class", "form-control-range custom-range mb-1")
            .attr("width", "750")
            .attr("min", "0")
            .attr("max", String(this.#lastIndex))

        const buttonGroup = div.append("div").attr("class", "btn-group").attr("role", "group")
        // icon-start
        const startButton = addButton("start")
        // icon-back
        const backButton = addButton("back")
        const playButton = addButton("pause")
        // icon-forward
        const forwardButton = addButton("forward")
        // icon-end
        const endButton = addButton("end")

        startButton.on("click", startButtonClicked)
        backButton.on("click", backButtonClicked)
        playButton.on("click", playButtonClicked)
        forwardButton.on("click", forwardButtonClicked)
        endButton.on("click", endButtonClicked)
    }

    async _initCanvas(): Promise<void> {
        const pixelRatio = 2

        // Get elements
        const main = d3Select("#na-map")
        const svg = d3Select("#na-map svg")
        const div = main.append("div")
        const canvas = div.append("canvas")
        const canvasNode = canvas.node() as HTMLCanvasElement

        // Get svg size and map transform
        const heightCss = svg.style("height")
        const widthCss = svg.style("width")

        // Position canvas on top of svg
        div.style("position", "relative").style("top", `-${heightCss}`).style("opacity", 0.7)

        // Get current transformation
        const currentTransformMatrix = (this.#map?.node() as SVGGElement)?.transform.baseVal.consolidate().matrix
        const scale = currentTransformMatrix.a
        const tx = currentTransformMatrix.e
        const ty = currentTransformMatrix.f

        // Set display size (css pixels)
        canvasNode.style.height = heightCss
        canvasNode.style.width = widthCss

        // Set actual size in memory
        canvasNode.height = Math.floor(Number.parseFloat(heightCss) * pixelRatio)
        canvasNode.width = Math.floor(Number.parseFloat(widthCss) * pixelRatio)

        // Set context and transformation
        this.#ctx = getCanvasRenderingContext2D(canvasNode)
        this.#ctx.translate(tx * pixelRatio, ty * pixelRatio)
        this.#ctx.scale(scale * pixelRatio, scale * pixelRatio)
        this.#ctx.font = `${200 * pixelRatio}px Junicode`
        this.#ctx.textBaseline = "bottom"
        this.#ctx.textAlign = "end"

        const gTiles = d3Select("#na-map svg g.map-tiles")
        const tilesWidth = (gTiles.node() as SVGGElement).getBoundingClientRect().width
        console.log("tiles", gTiles, tilesWidth)
        const dim: DivDimension = {
            top: (this.#coord.max - (this.#maxY ?? 0)) * scale + ty,
            left: tx,
            width: Math.floor(tilesWidth),
        }
        this._initDrawDate()
        this._initLegend(dim)
        this._initController(dim)
        this._initNationLegend(dim)
        await this._setPattern()
    }

    /**
     * Action when menu item is clicked
     */
    _menuItemSelected(): void {
        showCursorWait()
        this._mapElementsOff()
        this._initVoronoi()
        void this._initCanvas()
        this._drawPowerMap()
    }
}
