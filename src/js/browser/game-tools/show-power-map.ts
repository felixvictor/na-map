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

        /*
        const nationWithoutIncomeData = new Set(["NT", "FT"])
        const nationWithIncome = new Set()

        const flatData: PortHierarchy[] = [
            // Port leaves
            ...portData
                .filter((port) => port.netIncome > 0 && !nationWithoutIncomeData.has(port.nation))
                .map((port) => {
                    nationWithIncome.add(port.nation)
                    return {
                        id: port.name,
                        value: port.netIncome,
                        parentId: findNationByNationShortName(port.nation)?.sortName,
                    }
                }),
            // Nation nodes
            ...nations
                .filter((nation) => nationWithIncome.has(nation.short))
                .map((nation) => ({
                    id: nation.sortName,
                    value: 0,
                    parentId: "World",
                })),
            // Root node
            { id: "World", value: 0, parentId: undefined },
        ]

        this.#nestedData = d3Stratify<PortHierarchy>()(flatData)
        this.#tree = d3Hierarchy(this.#nestedData).sum((d: HierarchyNode<PortHierarchy>) => d.data.value)

         */
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
        const maxY = d3Max(points, (point) => point[1])
        const bounds = [this.#coord.min, this.#coord.min, this.#coord.max, maxY ? maxY + 100 : this.#coord.max]
        const voronoi = delaunay.voronoi(bounds)
        console.log(bounds, voronoi)

        for (let i = 0; i < points.length; i++) {
            this.#ctx.save()
            const nationColour = this.#colourScale(this.#portData[i].nation)
            this.#ctx.fillStyle =
                (this.#portData[i].netIncome > 0
                    ? d3Color(nationColour)
                          ?.darker(this.#incomeScale(this.#portData[i].netIncome))
                          .toString()
                    : nationColour) ?? "#455"
            this.#ctx.beginPath()
            voronoi.renderCell(i, this.#ctx)
            this.#ctx.fill()
            this.#ctx.stroke()
            this.#ctx.restore()
        }
    }

    _initPowerMap(): void {
        const main = d3Select("#na-map")
        const svg = d3Select("#na-map svg")
        const height = svg.style("height")
        const width = svg.style("width")
        const div = main.append("div").style("position", "relative").style("top", `-${height}`)
        const canvas = div
            .append("canvas")
            .attr("width", Number.parseFloat(width))
            .attr("height", Number.parseFloat(height))
        this.#ctx = getCanvasRenderingContext2D(canvas.node() as HTMLCanvasElement)
        const matrix = new DOMMatrixReadOnly(d3Select("#map").style("transform"))
        const scale = matrix.m11
        const tx = matrix.m41
        const ty = matrix.m42
        this.#ctx.translate(tx, ty)
        this.#ctx.scale(scale, scale)
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
