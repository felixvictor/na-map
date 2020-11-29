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
import "bootstrap/js/dist/tooltip"

import { hierarchy as d3Hierarchy, HierarchyNode, stratify as d3Stratify } from "d3-hierarchy"
import { ScaleLinear, scaleLinear as d3ScaleLinear, ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { Point, voronoiTreemap as d3VoronoiTreemap } from "d3-voronoi-treemap"

import { registerEvent } from "../analytics"
import { findNationByNationShortName, nations, putImportError } from "../../common/common"
import { colourList, insertBaseModal } from "../../common/common-browser"
import { getContrastColour } from "../../common/common-game-tools"

import { PortBasic, PortBattlePerServer, PortPerServer } from "../../common/gen-json"
import { DataSource, HtmlString } from "../../common/interface"
import { formatPercentSig, formatSiCurrency, formatSiInt } from "../../common/common-format"
import { max as d3Max, min as d3Min } from "d3-array"
import { Vertex } from "d3-weighted-voronoi"
import JQuery from "jquery"

interface TreeMapPolygon extends Array<Point> {
    0: Point
    1: Point
    2: Point
    3: Point
    site: Vertex
}
interface TreeMapHierarchyNode<T> extends HierarchyNode<T> {
    polygon: TreeMapPolygon
}

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
    #height = 0
    #width = 0
    #nestedData = {} as HierarchyNode<PortHierarchy>
    #tree = {} as TreeMapHierarchyNode<HierarchyNode<PortHierarchy>>
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
        this.#baseName = "Port net income"
        this.#baseId = "income-list"
        this.#buttonId = `button-${this.#baseId}`
        this.#modalId = `modal-${this.#baseId}`

        this.#colourScale = d3ScaleOrdinal<string>().range(colourList)

        this._setupListener()
    }

    static _hideDetails(this: JQuery.PlainObject): void {
        $(this).tooltip("dispose")
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
        this.#fontScale = d3ScaleLinear().domain([minIncome, maxIncome]).range([8, 48]).clamp(true)

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
        this.#tree = d3Hierarchy(this.#nestedData).sum(
            (d: HierarchyNode<PortHierarchy>) => d.data.value
        ) as TreeMapHierarchyNode<HierarchyNode<PortHierarchy>>
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
        const rowHeight = Math.floor(20 * 1.618)
        const rowPadding = Math.floor(2 * 1.618)
        const columnPadding = Math.floor(10 * 1.618)
        const nations = (this.#tree.children ?? []).sort((a, b) => (b.value as number) - (a.value as number))

        const minColumnWidth = 190 // Width of "Verenigde Provinciën"
        const totalWidth = nations.length * (minColumnWidth + columnPadding)
        const rows = Math.ceil(totalWidth / this.#width)
        const columnsPerRow = nations.length / rows
        const columnWidth = Math.floor(this.#width / columnsPerRow - columnPadding)

        const legendContainer = this.#mainDiv
            .append("div")
            .attr("class", "d-flex flex-wrap justify-content-between mt-3")

        legendContainer
            .selectAll(".legend")
            .data(nations)
            .join((enter) => {
                const div = enter.append("div").attr("class", "mt-3")

                const svg = div
                    .append("svg")
                    .attr("class", "svg-text")
                    .attr("width", columnWidth)
                    .attr("height", rowHeight * 2 + rowPadding)

                svg.append("rect")
                    .attr("width", columnWidth)
                    .attr("height", rowHeight)
                    .style("fill", (d) => this.#colourScale(d.data.id as string))

                svg.append("text")
                    .attr("x", columnPadding)
                    .attr("y", "25%")
                    .text((d) => d.data.id as string)
                    .style("fill", (d) => getContrastColour(this.#colourScale(d.data.id as string)))

                svg.append("rect")
                    .attr("class", "rect-background")
                    .attr("y", rowHeight + rowPadding)
                    .attr("width", columnWidth)
                    .attr("height", rowHeight)
                    .style("fill", (d) => this.#colourScale(d.data.id as string))

                svg.append("rect")
                    .attr("y", rowHeight + rowPadding)
                    .attr("width", (d) => columnWidth * ((d.value as number) / (d.parent?.value as number)))
                    .attr("height", rowHeight)
                    .style("fill", (d) => this.#colourScale(d.data.id as string))

                svg.append("text")
                    .attr("x", columnWidth - columnPadding)
                    .attr("y", "75%")
                    .html((d) => formatSiInt(d.value as number, true))
                    // .style("fill", (d) => (this.#colourScale(d.data.id as string)))
                    .style("text-anchor", "end")

                return div
            })
    }

    _showDetails(event: Event, d: TreeMapHierarchyNode<HierarchyNode<PortHierarchy>>): void {
        const title = `
            <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex flex-column text-left mt-1 mr-3 p-0">
                <div><span class="x-large">${d.data.id as string}</span><br />${d.parent?.data.id as string}</div>
            </div>
            <div class="d-flex flex-column text-left mt-1 p-0">
                <div class="mr-3">
                    ${formatSiInt(d.data.data.value)}<br />
                    <span class="des">Port</span>
                </div>
                <div class="mr-3">
                    ${formatPercentSig(d.data.data.value / (d.parent?.value as number))}<br />
                    <span class="des">Nation</span>
                </div>
                <div class="mr-3">
                    ${formatPercentSig(d.data.data.value / (d.parent?.parent?.value as number))}<br />
                    <span class="des">World</span>
                </div>
            </div>
            </div>`

        $(event.currentTarget as JQuery.PlainObject)
            .tooltip("dispose")
            .tooltip({
                html: true,
                template:
                    '<div class="tooltip" role="tooltip">' +
                    '<div class="tooltip-block tooltip-inner tooltip-inner-smaller">' +
                    "</div></div>",
                title,
                sanitize: false,
            })
            .tooltip("show")
    }

    _drawTreemap(): void {
        const leaves = this.#tree.leaves()

        this.#mainG
            .append("g")
            .attr("class", "cells")
            .selectAll(".cell")
            .data(leaves)
            .join((enter) =>
                enter
                    .append("path")
                    .attr("class", "cell")
                    .attr("d", (d) => `M${d.polygon.join(",")}z`)
                    .style("fill", (d) => this.#colourScale(d.parent?.data.id as string))
            )

        const labels = this.#mainG
            .append("g")
            .attr("class", "labels")
            .selectAll(".label")
            .data(leaves)
            .join((enter) =>
                enter
                    .append("g")
                    .attr("class", "label")
                    .attr("transform", (d) => `translate(${d.polygon.site.x},${d.polygon.site.y})`)
                    .style("font-size", (d) => this.#fontScale(d.data.data.value))
                    .style("fill", (d) => getContrastColour(this.#colourScale(d.parent?.data.id as string)))
            )
        labels
            .append("text")
            .attr("class", "name")
            .text((d) => d.data.data.id as string)
        labels
            .append("text")
            .attr("class", "value")
            .html((d) => formatSiCurrency(d.data.data.value, true))

        this.#mainG
            .append("g")
            .selectAll(".hoverer")
            .data(leaves)
            .join((enter) =>
                enter
                    .append("path")
                    .attr("class", "hoverer")
                    .attr("d", (d) => {
                        return `M${d.polygon.join(",")}z`
                    })
                    .on("mouseover", (event: Event, d) => this._showDetails(event, d))
                    .on("mouseleave", ShowIncomeMap._hideDetails)
            )
    }

    _initTreemap(): void {
        this.#height = ShowIncomeMap.getHeight()
        this.#width = this._getWidth()

        this.#svg = this.#mainDiv
            .append("svg")
            .attr("class", "voronoi")
            .attr("width", this.#width)
            .attr("height", this.#height)
        this.#mainG = this.#svg.append("g").attr("class", "drawingArea")

        d3VoronoiTreemap()
            .clip([
                [0, 0],
                [0, this.#height],
                [this.#width, this.#height],
                [this.#width, 0],
            ])
            .minWeightRatio(1e-10)(this.#tree)
    }

    /**
     * Inject modal
     */
    _injectModal(): void {
        insertBaseModal({ id: this.#modalId, title: this.#baseName })

        const body = d3Select(`#${this.#modalId} .modal-body`)
        this.#mainDiv = body.append("div").attr("id", `${this.#baseId}`)
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
        let emptyModal = false

        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this.#modalId}`)) {
            emptyModal = true
            this._initModal()
        }

        // Show modal
        $(`#${this.#modalId}`)
            .on("shown.bs.modal", () => {
                // Inject chart after modal is shown to calculate modal width
                if (emptyModal) {
                    emptyModal = false
                    this._initTreemap()
                    this._drawTreemap()
                    this._drawLegends()
                }
            })
            .modal("show")
    }
}
