/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/list-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select"
import { areaLabel as d3AreaLabel } from "d3-area-label"
import { extent as d3Extent, max as d3Max, min as d3Min } from "d3-array"
import { axisBottom as d3AxisBottom } from "d3-axis"
import {
    scaleLinear as d3ScaleLinear,
    ScaleOrdinal,
    scaleOrdinal as d3ScaleOrdinal,
    scaleTime as d3ScaleTime,
} from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import {
    Area,
    area as d3Area,
    curveBasis as d3CurveBasis,
    stack as d3Stack,
    stackOffsetNone as d3StackOffsetNone,
} from "d3-shape"

import { registerEvent } from "../analytics"
import { NationFullName, nations, NationShortName } from "common/common"
import { colourList, insertBaseModal, loadJsonFile } from "common/common-browser"
import { getContrastColour } from "common/common-game-tools"

import JQuery from "jquery"
import { Ownership, OwnershipNation } from "common/gen-json"
import { HtmlString } from "common/interface"
import { Group } from "timelines-chart"

/**
 *
 */
export default class ShowPortOwnerships {
    #serverId!: string
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private _ownershipData: Ownership[] = {} as Ownership[]
    // noinspection JSMismatchedCollectionQueryUpdate
    private _nationData: Array<OwnershipNation<number>> = {} as Array<OwnershipNation<number>>
    private readonly _colourScale: ScaleOrdinal<string, string>
    private _mainDiv!: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    private _div!: Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    private _svg!: Selection<SVGSVGElement, unknown, HTMLElement, unknown>

    constructor(serverId: string) {
        this.#serverId = serverId
        this._baseName = "Port ownership"
        this._baseId = "ownership-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._colourScale = d3ScaleOrdinal<string>().range(colourList)

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
        return Math.floor(this._mainDiv.node()!.offsetWidth) ?? 0
    }

    async _loadAndSetupData(): Promise<void> {
        this._nationData = await loadJsonFile<Array<OwnershipNation<number>>>(`${this.#serverId}-nation.json`)
        this._ownershipData = await loadJsonFile<Ownership[]>(`${this.#serverId}-ownership.json`)
    }

    /**
     * Setup listener
     */
    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async () => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)

            this._ownershipListSelected()
        })
    }

    /**
     * Inject modal
     */
    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName })

        const select = `${this._baseId}-select`
        const body = d3Select(`#${this._modalId} .modal-body`)

        body.append("label").append("select").attr("name", select).attr("id", select)

        this._mainDiv = body.append("div").attr("id", `${this._baseId}`)
        this._div = this._mainDiv.append("div")
        this._svg = this._mainDiv.append("svg").attr("class", "area")
    }

    _getOptions(): HtmlString {
        return `${this._ownershipData
            .map((region) => `<option value="${region.region}">${region.region}</option>;`)
            .join("")}`
    }

    _setupSelect(): void {
        const select$ = $(`#${this._baseId}-select`)
        const options = this._getOptions()
        select$.append(options)
    }

    _setupSelectListener(): void {
        const select$ = $(`#${this._baseId}-select`)

        select$
            .addClass("selectpicker")
            .on("change", (event) => {
                this._regionSelected(event)
            })
            .selectpicker({ noneSelectedText: "Select region" })
            .val("default")
            .selectpicker("refresh")
    }

    /**
     * Init modal
     */
    _initModal(): void {
        this._injectModal()
        this._setupSelect()
        this._setupSelectListener()
    }

    /**
     * Action when menu item is clicked
     */
    _ownershipListSelected(): void {
        let emptyModal = false

        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            emptyModal = true
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`)
            .on("shown.bs.modal", () => {
                // Inject chart after modal is shown to calculate modal width
                if (emptyModal) {
                    this._injectArea()
                    emptyModal = false
                }
            })
            .modal("show")
    }

    /**
     * Inject stacked area
     */
    _injectArea(): void {
        interface KeyData {
            keys: NationShortName[]
        }

        const width = this._getWidth()
        const maxHeight = 1000
        const height = Math.min(maxHeight, ShowPortOwnerships.getHeight())
        const margin = { right: 32, bottom: 32, left: 32 }

        const keys = nations.filter((nation) => nation.id !== 9).map((nation) => nation.short)
        const nationData = this._nationData
        // @ts-expect-error
        nationData.keys = keys

        const stacked = d3Stack<
            Array<OwnershipNation<number>> & KeyData,
            { [K in NationShortName]: number },
            NationShortName
        >()
            .offset(d3StackOffsetNone)
            .keys(keys)(nationData)

        /**
         * Set x axis
         * @param g - g element
         */
        const setXAxis = (g: Selection<SVGGElement, unknown, HTMLElement, unknown>): void => {
            const xTimeScale = d3ScaleTime<number, Date>()
                .domain(d3Extent(nationData, (d) => new Date(d.date)) as [Date, Date])
                .range([margin.left, width - margin.right])
            g.attr("transform", `translate(0,${height - margin.bottom})`).call(
                // @ts-expect-error
                d3AxisBottom<Date>(xTimeScale)
                    .ticks(width / 80)
                    .tickSizeOuter(0)
            )
            g.attr("font-size", ".8rem").attr("font-family", "")
        }

        type NationArea = { 0: number; 1: number; data: OwnershipNation<number> }

        /**
         * Get area
         */
        const getArea = (): Area<NationArea> => {
            const xScale = d3ScaleLinear<number, number>()
                .domain(d3Extent(nationData, (d) => new Date(d.date)) as [Date, Date])
                .range([margin.left, width - margin.right])
            const yScale = d3ScaleLinear<number, number>()
                .domain([d3Min(stacked[0], (d) => d[0]), d3Max(stacked[stacked.length - 1], (d) => d[1])] as [
                    number,
                    number
                ])
                .range([height - margin.bottom, 0])

            const area = d3Area<NationArea>()
                .x((d: NationArea): number => xScale(new Date(d.data.date)) ?? 0)
                .y0((d: NationArea) => yScale(d[0]) ?? 0)
                .y1((d: NationArea) => yScale(d[1]) ?? 0)
                .curve(d3CurveBasis)

            return area
        }

        /**
         * Render chart
         */
        const render = (): void => {
            const area = getArea()
            const labelNames = new Map<NationShortName, NationFullName>(
                nations.map((nation) => [nation.short, nation.name])
            )
            this._colourScale.domain(keys)

            // Paths
            this._svg
                .selectAll("path")
                .data(stacked)
                .join((enter) =>
                    enter
                        .append("path")
                        .attr("fill", (d) => this._colourScale(d.key))
                        .attr("stroke", (d) => this._colourScale(d.key))
                        // @ts-expect-error
                        .attr("d", area)
                )

            // Labels
            this._svg
                .selectAll(".area-label")
                .data(stacked)
                .join((enter) =>
                    // @ts-expect-error
                    enter
                        .append("text")
                        .attr("class", "area-label")
                        .text((d) => labelNames.get(d.key))
                        .attr("fill", (d) => getContrastColour(this._colourScale(d.key)))
                        .attr("transform", d3AreaLabel(area))
                )
        }

        this._svg.attr("width", width).attr("height", height)
        render()
        this._svg.append("g").call(setXAxis)
    }

    /**
     * Inject chart
     * @param data - Data
     */
    async _injectChart(data: Group[]): Promise<void> {
        const TimelinesChart = await import(/* webpackChunkName: "timelines-chart" */ "timelines-chart")

        TimelinesChart.default()
            .data(data)
            .enableAnimations(false)
            .timeFormat("%-d %B %Y")
            .zQualitative(true)
            .zColorScale(this._colourScale as ScaleOrdinal<string | number, string>)
            .width(this._getWidth())(this._div.node()!)
    }

    /**
     * Show data for selected region
     * @param event - Event
     */
    _regionSelected(event: JQuery.ChangeEvent): void {
        const regionSelected = $(event.currentTarget).find(":selected").val()

        // Remove current display
        this._div.selectAll("*").remove()

        const regionData = this._ownershipData
            .filter((region) => region.region === regionSelected)
            .map((region) => region.data)[0]
        void this._injectChart(regionData)
    }
}
