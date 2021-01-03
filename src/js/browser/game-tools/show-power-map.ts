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
import {
    colourList,
    getCanvasRenderingContext2D,
    loadJsonFiles,
    showCursorDefault,
    showCursorWait,
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

/**
 *
 */
export default class PowerMap extends BaseModal {
    #ctx = {} as CanvasRenderingContext2D
    #portData = {} as PortBasic[]
    #powerData = {} as PowerMapList
    readonly #colourScale: ScaleOrdinal<number, string>
    readonly #coord

    constructor(serverId: string, coord: MinMaxCoord) {
        super(serverId, "Show power map")

        this.#coord = coord
        this.#colourScale = d3ScaleOrdinal<number, string>().range(colourList)

        void this._setupListener()
    }

    _setupData(data: JsonData): void {
        this.#powerData = data.power
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

    _drawEnd(): void {
        console.timeEnd("animation")
        showCursorDefault()
    }

    _drawPowerMap(): void {
        const points = this.#portData.map((port) => port.coordinates)
        const delaunay = d3Delaunay.from(points)
        console.log(delaunay)
        let maxY = d3Max(points, (point) => point[1])
        maxY = maxY ? maxY + 100 : this.#coord.max
        const bounds = [this.#coord.min, this.#coord.min, this.#coord.max, maxY]
        console.log(bounds)
        const voronoi = delaunay.voronoi(bounds)
        console.log(voronoi)

        let dateIndex = -1
        const drawMap = (): void => {
            dateIndex += 1
            const date = this.#powerData[dateIndex][0]
            const ports = this.#powerData[dateIndex][1]
            console.timeLog("animation", dateIndex, date)
            for (const [index, nation] of ports.entries()) {
                const nationColour = this.#colourScale(nation)

                this.#ctx.beginPath()
                voronoi.renderCell(index, this.#ctx)
                this.#ctx.fillStyle = nationColour
                this.#ctx.fill()
            }

            this.#ctx.fillStyle = "black"
            this.#ctx.fillText(dayjs(date).format("D MMMM YYYY"), 500, 500)
        }

        const drawPowerLoop = () => {
            if (dateIndex < this.#powerData.length - 1) {
                window.requestAnimationFrame(drawPowerLoop)
                drawMap()
            } else {
                this._drawEnd()
            }
        }

        console.time("animation")
        drawPowerLoop()
    }

    _initPowerMap(): void {
        const pixelRatio = 2

        // Get elements
        const main = d3Select("#na-map")
        const svg = d3Select("#na-map svg")
        const map = d3Select("g#map")
        const div = main.append("div")
        const canvas = div.append("canvas")
        const canvasNode = canvas.node() as HTMLCanvasElement

        // Get svg size and map transform
        const heightCss = svg.style("height")
        const widthCss = svg.style("width")

        // Position canvas on top of svg
        div.style("position", "relative").style("top", `-${heightCss}`).style("opacity", 0.5)

        // Get current transformation
        const currentTransformMatrix = (map?.node() as SVGGElement)?.transform.baseVal.consolidate().matrix
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
        this.#ctx.font = `${300 * pixelRatio}px Junicode`

        // Remove port icons
        map.remove()

        console.log(map, currentTransformMatrix, scale, tx, ty)
        console.log(pixelRatio, scale, scale * pixelRatio)
        console.log(
            `${heightCss} x ${widthCss}`,
            `${Math.floor(Number.parseFloat(heightCss) * pixelRatio)} x ${Math.floor(
                Number.parseFloat(widthCss) * pixelRatio
            )}`
        )
    }

    /**
     * Action when menu item is clicked
     */
    _menuItemSelected(): void {
        showCursorWait()
        this._initPowerMap()
        this._drawPowerMap()
    }
}
