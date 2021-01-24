/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/list-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { max as d3Max } from "d3-array"
import { Delaunay, Delaunay as d3Delaunay, Voronoi } from "d3-delaunay"
import { ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { Timer, timer as d3Timer } from "d3-timer"
import loadImage from "image-promise"

import { capitalizeFirstLetter, nations, range, sleep } from "common/common"
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

dayjs.extend(customParseFormat)

interface JsonData {
    power: PowerMapList
}

interface ImagePromiseError {
    loaded: string[]
    errored: string[]
}

/**
 *
 */
export default class PowerMap extends BaseModal {
    #ctx = {} as CanvasRenderingContext2D
    #map = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #maxY: number | undefined
    #pattern = [] as Array<null | CanvasPattern>
    #portData = {} as PortBasic[]
    #powerData = {} as PowerMapList
    #stopCommand = true
    #rangeInput = {} as Selection<HTMLInputElement, unknown, HTMLElement, unknown>
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

    _drawPowerMap(): void {
        const delay = 0
        let dateIndex = -1

        const drawMap = (): void => {
            const date = this.#powerData[dateIndex][0]
            const ports = this.#powerData[dateIndex][1]

            console.timeLog("animation", dateIndex, date)

            for (const [index, nationId] of ports.entries()) {
                this.#ctx.beginPath()
                this.#voronoi.renderCell(index, this.#ctx)
                this.#ctx.fillStyle = this.#pattern[nationId] ?? "#000"
                this.#ctx.fill()
            }

            this._drawDate(date)
        }

        const drawPowerLoop = async () => {
            while (this.#stopCommand && dateIndex < this.#powerData.length - 410) {
                dateIndex += 1

                this.#rangeInput.attr("value", dateIndex)
                const t = d3Timer((elapsed) => {
                    drawMap()

                    if (elapsed > delay || this.#stopCommand) {
                        console.log("stop")
                        t.stop()
                    }
                })
                // eslint-disable-next-line no-await-in-loop
                await sleep(delay * 1.1)
            }

            this._drawEnd()
        }

        console.time("animation")
        const updateValue = (event: Event) => event
        ;(this.#rangeInput.node() as HTMLInputElement).addEventListener("change", updateValue)
        void drawPowerLoop()
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

    _initRange(dim: { top: number; left: number }): void {
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
            this.#stopCommand = !isPlayButton
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

        const div = d3Select("#na-map div")
            .append("div")
            .style("position", "relative")
            .style("width", "400px")
            .style("top", `-${dim.top}px`)
            .style("left", `${dim.left}px`)
            .style("background-color", colourWhite)
            .attr("class", "p-3")
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
            .attr("max", String(this.#powerData.length - 1))

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
        this._initDrawDate()
        this._initRange({ top: (this.#coord.max - (this.#maxY ?? 0)) * scale + ty, left: tx })
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
