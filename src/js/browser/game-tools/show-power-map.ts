/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/list-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { max as d3Max, min as d3Min } from "d3-array"
import { color as d3Color } from "d3-color"
import { Delaunay as d3Delaunay } from "d3-delaunay"
import { ScaleLinear, scaleLinear as d3ScaleLinear, ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select } from "d3-selection"
import {
    colourList,
    getCanvasRenderingContext2D,
    loadJsonFiles,
    showCursorDefault,
    showCursorWait,
} from "common/common-browser"

import { BaseModal } from "./base-modal"

import { PortBasic, PortBattlePerServer, PortPerServer } from "common/gen-json"
import { DataSource, MinMaxCoord, PortIncome, PortJsonData } from "common/interface"

/**
 *
 */
export default class PowerMap extends BaseModal {
    readonly #coord
    readonly #colourScale: ScaleOrdinal<string, string>
    #portData = {} as Array<PortBasic & PortPerServer & PortBattlePerServer>

    #ctx = {} as CanvasRenderingContext2D
    #incomeScale = {} as ScaleLinear<number, number>

    constructor(serverId: string, coord: MinMaxCoord) {
        super(serverId, "Show power map")

        this.#coord = coord
        this.#colourScale = d3ScaleOrdinal<string>().range(colourList)

        void this._setupListener()
    }

    _setupData(data: PortJsonData): void {
        // Combine port data with port battle data
        this.#portData = data.ports.map((port: PortBasic) => {
            const serverData = data.server.find((d: PortPerServer) => d.id === port.id) ?? ({} as PortPerServer)
            const pbData = data.pb.find((d: PortBattlePerServer) => d.id === port.id) ?? ({} as PortBattlePerServer)
            const combinedData = { ...port, ...serverData, ...pbData } as PortIncome

            return combinedData
        })

        const minIncome = d3Min(this.#portData, (d) => (d.netIncome < 0 ? 0 : d.netIncome)) ?? 0
        const maxIncome = d3Max(this.#portData, (d) => (d.netIncome < 0 ? 0 : d.netIncome)) ?? 0
        this.#incomeScale = d3ScaleLinear().domain([minIncome, maxIncome]).range([0, 1]).clamp(true)
    }

    async _loadData(): Promise<PortJsonData> {
        const dataSources: DataSource[] = [
            {
                fileName: `${this.serverId}-ports.json`,
                name: "server",
            },
            {
                fileName: `${this.serverId}-pb.json`,
                name: "pb",
            },
        ]
        const readData = {} as PortJsonData

        readData.ports = (await import(/* webpackChunkName: "data-ports" */ "../../../lib/gen-generic/ports.json"))
            .default as PortBasic[]
        await loadJsonFiles<PortJsonData>(dataSources, readData)

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

    _drawPowerMap(): void {
        const points = this.#portData.map((port) => port.coordinates)
        const delaunay = d3Delaunay.from(points)
        console.log(delaunay)
        let maxY = d3Max(points, (point) => point[1])
        maxY = maxY ? maxY + 100 : this.#coord.max
        const bounds = [this.#coord.min, this.#coord.min, this.#coord.max, maxY]
        const voronoi = delaunay.voronoi(bounds)
        console.log(bounds, voronoi)

        // for (const [i, point] of points.entries()) {
        for (let i = 0; i < points.length; i++) {
            const nationColour = this.#colourScale(this.#portData[i].nation)
            this.#ctx.fillStyle = nationColour

            //            this.#ctx.save()
            this.#ctx.beginPath()

            voronoi.renderCell(i, this.#ctx)
            this.#ctx.fill()
            // this.#ctx.fill()

            //          this.#ctx.restore()

            /*
            if (this.#portData[i].netIncome > 0) {
                        const colour =
                (this.#portData[i].netIncome > 0
                    ? d3Color(nationColour)
                          ?.darker(this.#incomeScale(this.#portData[i].netIncome))
                          .toString()
                    : nationColour) ?? "#455"
                const radialGradient = this.#ctx.createRadialGradient(point[0], point[1], 100, point[0], point[1], 300)
                radialGradient.addColorStop(0, colour)
                radialGradient.addColorStop(0.8, nationColour)
                this.#ctx.fillStyle = radialGradient
            }

            this.#ctx.fillRect(point[0], point[1], 300, 300)
            */
        }
    }

    _initPowerMap(): void {
        const main = d3Select("#na-map")
        const svg = d3Select("#na-map svg")
        const heightCss = svg.style("height")
        const widthCss = svg.style("width")
        const div = main.append("div").style("position", "relative").style("top", `-${heightCss}`)
        const canvas = div.append("canvas")
        const canvasNode = canvas.node() as HTMLCanvasElement

        //        .attr("width", Number.parseFloat(width))
        //        .attr("height", Number.parseFloat(height))

        // Set display size (css pixels)
        canvasNode.style.height = heightCss
        canvasNode.style.width = widthCss

        // Set actual size in memory (scaled to account for extra pixel density).
        const pixelRatio = 8
        canvasNode.height = Math.floor(Number.parseFloat(heightCss) * pixelRatio)
        canvasNode.width = Math.floor(Number.parseFloat(widthCss) * pixelRatio)

        this.#ctx = getCanvasRenderingContext2D(canvasNode)
        const matrix = new DOMMatrixReadOnly(d3Select("#map").style("transform"))
        const scale = matrix.m11
        const tx = matrix.m41
        const ty = matrix.m42
        this.#ctx.translate(tx * pixelRatio, ty * pixelRatio)
        this.#ctx.scale(scale * pixelRatio, scale * pixelRatio)

        console.log(matrix, scale, tx, ty)
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
        showCursorDefault()
    }
}
