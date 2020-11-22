/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/list-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select/js/bootstrap-select"
import { hierarchy as d3Hierarchy, HierarchyNode, stratify as d3Stratify } from "d3-hierarchy"
import { ScaleLinear, scaleLinear as d3ScaleLinear, ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { voronoiTreemap as d3VoronoiTreemap } from "d3-voronoi-treemap"

import { registerEvent } from "../analytics"
import { findNationByName, findNationByNationShortName, nations, putImportError } from "../../common/common"
import { colourList, insertBaseModal } from "../../common/common-browser"
import { getContrastColour } from "../../common/common-game-tools"

import { PortBasic, PortBattlePerServer, PortPerServer } from "../../common/gen-json"
import { DataSource, HtmlString } from "../../common/interface"
import { formatSiCurrency } from "../../common/common-format"
import { simpleStringSort } from "../../common/common-node"
import { max as d3Max, min as d3Min } from "d3-array"

type PortIncome = PortBasic & PortPerServer & PortBattlePerServer
interface ReadData {
    [index: string]: PortBasic[] | PortPerServer[] | PortBattlePerServer[]
    ports: PortBasic[]
    pb: PortBattlePerServer[]
    server: PortPerServer[]
}
type PortHierarchyId = string | undefined
interface PortHierarchy {
    id: PortHierarchyId
    value: number
    parentId: PortHierarchyId
}

/**
 *
 */
export default class ShowIncomeMap {
    #height = 1000
    #width = 1000
    #nestedData = {} as HierarchyNode<PortHierarchy>
    #tree = {} as HierarchyNode<HierarchyNode<PortHierarchy>>
    #mainDiv = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #mainG = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #svg = {} as Selection<SVGSVGElement, unknown, HTMLElement, unknown>
    readonly #serverId: string
    readonly #baseName: string
    readonly #baseId: HtmlString
    readonly #buttonId: HtmlString
    readonly #modalId: HtmlString
    readonly #colourScale: ScaleOrdinal<string, string>
    #fontScale = {} as ScaleLinear<number, number>

    constructor(serverId: string) {
        this.#serverId = serverId
        this.#baseName = "Port ownership"
        this.#baseId = "income-list"
        this.#buttonId = `button-${this.#baseId}`
        this.#modalId = `modal-${this.#baseId}`

        this.#colourScale = d3ScaleOrdinal<string>().range(colourList)

        this._setupListener()
    }

    /**
     * Get <factor> height of current window
     */
    static getHeight(): number {
        const factor = 0.75
        return Math.floor(top.innerHeight * factor)
    }

    /**
     * Get width of baseId
     */
    _getWidth(): number {
        console.log(
            (this.#mainDiv.node()?.parentNode as HTMLDivElement).getBoundingClientRect(),
            (this.#mainDiv.node()?.parentNode as HTMLDivElement).offsetWidth
        )
        return Math.floor((this.#mainDiv.node() as HTMLDivElement).offsetWidth) ?? 0
    }

    _setupData(data: ReadData): void {
        // Combine port data with port battle data
        const portData = data.ports.map((port: PortBasic) => {
            const serverData = data.server.find((d: PortPerServer) => d.id === port.id) ?? ({} as PortPerServer)
            const pbData = data.pb.find((d: PortBattlePerServer) => d.id === port.id) ?? ({} as PortBattlePerServer)
            const combinedData = { ...port, ...serverData, ...pbData } as PortIncome

            return combinedData
        })

        const minIncome = d3Min(portData, (d) => d.netIncome) ?? 0
        const maxIncome = d3Max(portData, (d) => d.netIncome) ?? 0
        this.#fontScale = d3ScaleLinear().domain([minIncome, maxIncome]).range([6, 36]).clamp(true)

        const nationWithoutIncome = new Set(["NT", "FT"])
        const nationWithIncome = new Set()
        console.log("nationsWithoutIncome", nationWithoutIncome)

        const flatData: PortHierarchy[] = [
            // Port leaves
            ...portData
                .filter((port) => port.netIncome > 0 && !nationWithoutIncome.has(port.nation))
                .map((port) => {
                    nationWithIncome.add(port.nation)
                    return {
                        id: port.name,
                        value: port.netIncome,
                        parentId: findNationByNationShortName(port.nation)?.name,
                    }
                }),
            // Nation nodes
            ...nations
                .filter((nation) => nationWithIncome.has(nation.short))
                .map((nation) => ({
                    id: nation.name,
                    value: 0,
                    parentId: "World",
                })),
            // Root node
            { id: "World", value: 0, parentId: undefined },
        ]

        this.#nestedData = d3Stratify<PortHierarchy>()(flatData)
        this.#tree = d3Hierarchy(this.#nestedData).sum((d: HierarchyNode<PortHierarchy>) => d.data.value)
    }

    async _loadData(): Promise<ReadData> {
        const dataDirectory = "data"
        const dataSources: DataSource[] = [
            {
                fileName: `${this.#serverId}-ports.json`,
                name: "server",
            },
            {
                fileName: `${this.#serverId}-pb.json`,
                name: "pb",
            },
        ]
        const readData = {} as ReadData

        const loadEntries = async (dataSources: DataSource[]): Promise<void> => {
            for await (const dataSource of dataSources) {
                readData[dataSource.name] = await (await fetch(`${dataDirectory}/${dataSource.fileName}`)).json()
            }
        }

        try {
            readData.ports = (await import(/* webpackChunkName: "data-ports" */ "Lib/gen-generic/ports.json"))
                .default as PortBasic[]
            await loadEntries(dataSources)
        } catch (error: unknown) {
            putImportError(error as string)
        }

        return readData
    }

    async _loadAndSetupData(): Promise<void> {
        const readData = await this._loadData()
        this._setupData(readData)
    }

    /**
     * Setup listener
     */
    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this.#buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this.#baseName)

            this._incomeListSelected()
        })
    }

    _drawLegends(): void {
        const legendHeight = 13
        const interLegend = 4
        const colorWidth = legendHeight * 6
        const legendsMinY = this.#height + 200

        const nations = (this.#nestedData.children ?? []).sort((a, b) =>
            simpleStringSort(findNationByName(b.id as string)?.sortName, findNationByName(a.id as string)?.sortName)
        )

        const legendContainer = this.#mainG
            .append("g")
            .attr("class", "legend")
            .attr("transform", `translate(0,${legendsMinY})`)

        const legends = legendContainer.selectAll(".legend").data(nations).enter()

        const legend = legends
            .append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => {
                return `translate(0,-${i * (legendHeight + interLegend)})`
            })

        legend
            .append("rect")
            .attr("class", "legend-color")
            .attr("y", -legendHeight)
            .attr("width", colorWidth)
            .attr("height", legendHeight)
            .style("fill", (d) => {
                console.log("legend", d, this.#colourScale(d.id as string))
                return this.#colourScale(d.id as string)
            })
        legend
            .append("text")
            .attr("class", "tiny")
            .attr("transform", `translate(${colorWidth + 5},-2)`)
            .text((d) => `${d.id} (${d.data.value})`)

        legendContainer
            .append("text")
            .attr("transform", `translate(0,-${nations.length * (legendHeight + interLegend) - 5})`)
            .text("Nations")
    }

    _drawTreemap(): void {
        const leaves = this.#tree.leaves()

        const cells = this.#mainG
            .append("g")
            .attr("class", "cells")
            .selectAll(".cell")
            .data(leaves)
            .enter()
            .append("path")
            .attr("class", "cell")
            .attr("d", (d) => `M${d.polygon.join(",")}z`)
            .style("fill", (d) => this.#colourScale(d.parent?.data.id as string))

        const labels = this.#mainG
            .append("g")
            .attr("class", "labels")
            .selectAll(".label")
            .data(leaves)
            .enter()
            .append("g")
            .attr("class", "label")
            .attr("transform", (d) => {
                return `translate(${d.polygon.site.x},${d.polygon.site.y})`
            })
            .style("font-size", (d) => this.#fontScale(d.data.data.value))
            .style("fill", (d) => {
                return getContrastColour(this.#colourScale(d.parent?.data.id as string))
            })

        labels
            .append("text")
            .attr("class", "name")
            .text((d) => d.data.data.id as string)
        labels
            .append("text")
            .attr("class", "value")
            .html((d) => formatSiCurrency(d.data.data.value))

        const hoverers = this.#mainG
            .append("g")
            .attr("class", "hoverers")
            .selectAll(".hoverer")
            .data(leaves)
            .enter()
            .append("path")
            .attr("class", "hoverer")
            .attr("d", (d) => {
                return `M${d.polygon.join(",")}z`
            })

        hoverers.append("title").html((d) => `${d.data.id}\n${formatSiCurrency(d.data.data.value)}`)
    }

    _initTreemap(): void {
        const body = d3Select(`#${this.#modalId} .modal-body`)

        this.#mainDiv = body.append("div").attr("id", `${this.#baseId}`)

        this.#svg = this.#mainDiv
            .append("svg")
            .attr("class", "voronoi")
            .attr("width", this.#width)
            .attr("height", this.#height + 300)
        this.#mainG = this.#svg.append("g").attr("class", "drawingArea")

        d3VoronoiTreemap().clip([
            [0, 0],
            [0, this.#height],
            [this.#width, this.#height],
            [this.#width, 0],
        ])(this.#tree)
        console.log("tree after", this.#tree)
    }

    /**
     * Inject modal
     */
    _injectModal(): void {
        insertBaseModal({ id: this.#modalId, title: this.#baseName })

        this._initTreemap()
        this._drawLegends()
        this._drawTreemap()
    }

    /**
     * Init modal
     */
    _initModal(): void {
        this._injectModal()
    }

    /**
     * Action when menu item is clicked
     */
    _incomeListSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this.#modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this.#modalId}`).modal("show")
    }
}
