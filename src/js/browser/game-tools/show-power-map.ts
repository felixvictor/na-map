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
import { Delaunay as d3Delaunay } from "d3-delaunay"
import { ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { timer as d3Timer } from "d3-timer"
import loadImage from "image-promise"

// eslint-disable-next-line no-warning-comments
/*
TODO
- Remove free town?
- Smoothen polygons
- Add controls (speed, date range)
 */

import { nations, range, sleep } from "common/common"
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

export interface JsonData {
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
    #pattern = [] as Array<null | CanvasPattern>
    #map = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #portData = {} as PortBasic[]
    #powerData = {} as PowerMapList
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
            images.forEach((image, index) => {
                this.#pattern[index] = this.#ctx.createPattern(image, "repeat")
            })
        } catch (error: unknown) {
            console.error("One or more images have failed to load :(")
            console.error((error as ImagePromiseError).errored)
            console.info("But these loaded fine:")
            console.info((error as ImagePromiseError).loaded)
        }
    }

    _getTextHeight(text: string): number {
        const { actualBoundingBoxAscent, actualBoundingBoxDescent } = this.#ctx.measureText(text)
        return Math.floor(Math.abs(actualBoundingBoxDescent - actualBoundingBoxAscent))
    }

    _getTextWidth(text: string): number {
        const { actualBoundingBoxLeft, actualBoundingBoxRight } = this.#ctx.measureText(text)
        return Math.floor(actualBoundingBoxLeft + actualBoundingBoxRight)
    }

    _getTextDim(): { height: number; width: number } {
        const height = this._getTextHeight("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
        const width = this._getTextWidth("25 September 2020")

        return {
            height,
            width,
        }
    }

    async _drawPowerMap(): Promise<void> {
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
        const nationNotShown = new Set([
            9, // Free Town
        ])
        const points = this.#portData.filter((port) => !freeTowns.has(port.id)).map((port) => port.coordinates)
        const delaunay = d3Delaunay.from(points)
        console.log(delaunay)
        let maxY = d3Max(points, (point) => point[1])
        maxY = maxY ? maxY + 100 : this.#coord.max
        const bounds = [this.#coord.min, this.#coord.min, this.#coord.max, maxY]
        console.log(bounds)
        const voronoi = delaunay.voronoi(bounds)
        console.log(voronoi)

        const textPosX = 300
        const textPosY = 200
        const textPadding = 50
        const delay = 100
        let dateIndex = -1

        await this._setPattern()
        const textDim = this._getTextDim()

        const drawMap = (): void => {
            const date = this.#powerData[dateIndex][0]
            const ports = this.#powerData[dateIndex][1].filter((nationId) => !nationNotShown.has(nationId))
            console.timeLog("animation", dateIndex, date)
            for (const [index, nationId] of ports.entries()) {
                this.#ctx.beginPath()
                voronoi.renderCell(index, this.#ctx)
                this.#ctx.fillStyle = this.#pattern[nationId] ?? "#000"
                this.#ctx.fill()
            }

            this.#ctx.fillStyle = colourWhite
            this.#ctx.fillRect(
                this.#coord.max - textDim.width - textPosX - textPadding,
                textPosY - textPadding,
                textDim.width + 2 * textPadding,
                textDim.height + 2 * textPadding
            )
            this.#ctx.fillStyle = colourRedDark
            const dateF = dayjs(date).format("D MMMM YYYY")
            const currentTextWidth = this._getTextWidth(dateF)
            this.#ctx.fillText(
                dateF,
                this.#coord.max - textDim.width + (textDim.width - currentTextWidth - textPadding) - textPosX,
                textPosY + textPadding / 2
            )
        }

        const drawPowerLoop = async () => {
            while (dateIndex < this.#powerData.length - 415) {
                dateIndex += 1
                const t = d3Timer((elapsed) => {
                    drawMap()
                    if (elapsed > delay) {
                        t.stop()
                    }
                })
                // eslint-disable-next-line no-await-in-loop
                await sleep(delay * 1.1)
            }

            this._drawEnd()
        }

        console.time("animation")
        void drawPowerLoop()
    }

    _initPowerMap(): void {
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
        this.#ctx.textBaseline = "top"
    }

    /**
     * Action when menu item is clicked
     */
    _menuItemSelected(): void {
        showCursorWait()
        this._mapElementsOff()
        this._initPowerMap()
        void this._drawPowerMap()
    }
}
