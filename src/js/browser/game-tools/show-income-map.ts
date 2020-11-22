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
import { extent as d3Extent, max as d3Max, min as d3Min } from "d3-array"
import { hierarchy as d3Hierarchy, HierarchyNode, stratify as d3Stratify } from "d3-hierarchy"
import {
    scaleLinear as d3ScaleLinear,
    ScaleOrdinal,
    scaleOrdinal as d3ScaleOrdinal,
    scaleTime as d3ScaleTime,
} from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import { line as d3Line } from "d3-shape"
import { voronoiTreemap as d3VoronoiTreemap } from "d3-voronoi-treemap"

import { registerEvent } from "../analytics"
import {
    findNationByNationShortName,
    NationFullName,
    nations,
    NationShortName,
    putImportError,
} from "../../common/common"
import { colourList, insertBaseModal } from "../../common/common-browser"
import { getContrastColour } from "../../common/common-game-tools"

import JQuery from "jquery"
import { PortBasic, PortBattlePerServer, PortPerServer } from "../../common/gen-json"
import { DataSource, HtmlString } from "../../common/interface"

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
    netIncome: number
    parentId: PortHierarchyId
}

/**
 *
 */
export default class ShowIncomeMap {
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

        const flatData: PortHierarchy[] = [
            // Port leaves
            ...portData
                .filter((port) => port.netIncome !== 0)
                .map((port) => ({
                    id: port.name,
                    netIncome: port.netIncome,
                    parentId: findNationByNationShortName(port.nation)?.name,
                })),
            // Nation nodes
            ...nations.map((nation) => ({
                id: nation.name,
                netIncome: 0,
                parentId: "World",
            })),
            // Root node
            { id: "World", netIncome: 0, parentId: undefined },
        ]

        console.log("flatData", flatData)
        this.#nestedData = d3Stratify<PortHierarchy>()(flatData)
        console.log("nestedData", this.#nestedData)

        this.#tree = d3Hierarchy(this.#nestedData).sum((d: HierarchyNode<PortHierarchy>) => d.data.netIncome)
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
        const nations = this.#nestedData.children?.reverse() ?? []

        const legendContainer = this.#mainG
            .append("g")
            .classed("legend", true)
            .attr("transform", `translate(${[0, legendsMinY]})`)

        const legends = legendContainer.selectAll(".legend").data(nations).enter()

        const legend = legends
            .append("g")
            .classed("legend", true)
            .attr("transform", function (d, i) {
                return `translate(${[0, -i * (legendHeight + interLegend)]})`
            })

        legend
            .append("rect")
            .classed("legend-color", true)
            .attr("y", -legendHeight)
            .attr("width", colorWidth)
            .attr("height", legendHeight)
            .style("fill", function (d) {
                return d.color
            })
        legend
            .append("text")
            .classed("tiny", true)
            .attr("transform", `translate(${[colorWidth + 5, -2]})`)
            .text(function (d) {
                return d.name
            })

        legendContainer
            .append("text")
            .attr("transform", `translate(${[0, -nations.length * (legendHeight + interLegend) - 5]})`)
            .text("Continents")
    }

    _drawTreemap(): void {
        const leaves = this.#tree.leaves()

        const cells = this.#mainG
            .append("g")
            .classed("cells", true)
            .attr("transform", `translate(${[-treemapRadius, -treemapRadius]})`)
            .selectAll(".cell")
            .data(leaves)
            .enter()
            .append("path")
            .classed("cell", true)
            .attr("d", function (d) {
                return `M${d.polygon.join(",")}z`
            })
            .style("fill", function (d) {
                return d.parent.data.color
            })

        const labels = this.#mainG
            .append("g")
            .classed("labels", true)
            .attr("transform", `translate(${[-treemapRadius, -treemapRadius]})`)
            .selectAll(".label")
            .data(leaves)
            .enter()
            .append("g")
            .classed("label", true)
            .attr("transform", function (d) {
                return `translate(${[d.polygon.site.x, d.polygon.site.y]})`
            })
            .style("font-size", function (d) {
                return fontScale(d.data.weight)
            })

        labels
            .append("text")
            .classed("name", true)
            .html(function (d) {
                return d.data.weight < 1 ? d.data.code : d.data.name
            })
        labels
            .append("text")
            .classed("value", true)
            .text(function (d) {
                return `${d.data.weight}%`
            })

        const hoverers = this.#mainG
            .append("g")
            .classed("hoverers", true)
            .attr("transform", `translate(${[-treemapRadius, -treemapRadius]})`)
            .selectAll(".hoverer")
            .data(leaves)
            .enter()
            .append("path")
            .classed("hoverer", true)
            .attr("d", function (d) {
                return `M${d.polygon.join(",")}z`
            })

        hoverers.append("title").text(function (d) {
            return `${d.data.name}\n${d.value}%`
        })
    }

    _drawMap(): void {
        const body = d3Select(`#${this.#modalId} .modal-body`)

        this.#mainDiv = body.append("div").attr("id", `${this.#baseId}`)
        // const height = ShowIncomeMap.getHeight()
        const height = 500
        // const width = this._getWidth()
        const width = 500

        this.#svg = this.#mainDiv.append("svg").attr("class", "voronoi").attr("width", width).attr("height", height)
        this.#mainG = this.#svg.append("g").classed("drawingArea", true)

        d3VoronoiTreemap().clip([
            [0, 0],
            [0, height],
            [width, height],
            [width, 0],
        ])(this.#tree)
        console.log("tree after", this.#tree)
        this._drawTreemap()
    }

    /**
     * Inject modal
     */
    _injectModal(): void {
        insertBaseModal({ id: this.#modalId, title: this.#baseName })

        this._drawMap()
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
