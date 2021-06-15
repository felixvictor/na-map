/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/show-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { areaLabel as d3AreaLabel } from "d3-area-label"
import { extent as d3Extent, max as d3Max, min as d3Min } from "d3-array"
import { axisBottom as d3AxisBottom } from "d3-axis"
import {
    scaleLinear as d3ScaleLinear,
    ScaleOrdinal,
    scaleOrdinal as d3ScaleOrdinal,
    scaleTime as d3ScaleTime,
} from "d3-scale"
import { Selection } from "d3-selection"
import {
    Area,
    area as d3Area,
    curveBasis as d3CurveBasis,
    stack as d3Stack,
    stackOffsetNone as d3StackOffsetNone,
} from "d3-shape"
import textures, { Textures } from "textures"

import { registerEvent } from "../analytics"
import {
    findNationByNationShortName,
    NationFullName,
    nations,
    NationShortName,
    NationShortNameList,
} from "common/common"
import {
    colourList,
    getIdFromBaseName,
    loadJsonFile,
    primary300,
    showCursorDefault,
    showCursorWait,
} from "common/common-browser"

import { getContrastColour } from "common/common-game-tools"
import { Group } from "timelines-chart"
import { Ownership, OwnershipNation } from "common/gen-json"
import { ServerId } from "common/servers"
import { HtmlString } from "common/interface"
import Modal from "util/modal"
import Select from "util/select"

/**
 *
 */
export default class ShowPortOwnerships {
    #modal: Modal | undefined = undefined
    #select = {} as Select
    #serverId: ServerId
    #mainDiv = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #div = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #svg = {} as Selection<SVGSVGElement, unknown, HTMLElement, unknown>
    #textures = {} as NationShortNameList<Textures>
    readonly #baseId: HtmlString
    readonly #baseName = "Ownership overview"

    readonly #menuId: HtmlString
    private _ownershipData = {} as Ownership[]
    private _nationData = {} as Array<OwnershipNation<number>>

    private readonly _colourScale: ScaleOrdinal<string, string>

    constructor(serverId: ServerId) {
        this.#serverId = serverId

        this.#baseId = `show-${getIdFromBaseName(this.#baseName)}`
        this.#menuId = `menu-${this.#baseId}`

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
        return Math.floor(this.#mainDiv.node()!.offsetWidth) ?? 0
    }

    async _loadAndSetupData(): Promise<void> {
        showCursorWait()
        this._nationData = await loadJsonFile<Array<OwnershipNation<number>>>(`${this.#serverId}-nation.json`)
        this._ownershipData = await loadJsonFile<Ownership[]>(`${this.#serverId}-ownership.json`)
        showCursorDefault()
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new Modal(this.#baseName, "xl")
            this._setupOutput()
            this._setupTextures()
            this._setupSelect()
            this._setupSelectListener()
            this._injectArea()
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    _setupOutput(): void {
        this.#mainDiv = this.#modal!.outputSel
        this.#div = this.#mainDiv.append("div")
        this.#svg = this.#mainDiv.append("svg").attr("class", "area")
    }

    _setupTextures(): void {
        const orientation = ["2/8", "4/8", "6/8"]
        let index = 0
        for (const { short: nationShortName, colours } of nations) {
            if (colours.length === 1) {
                this.#textures[nationShortName] = textures
                    .lines()
                    .stroke(colours[0])
                    .background(colours[0])
                    .id(`texture-${nationShortName}`)
            } else if (colours.length === 2) {
                this.#textures[nationShortName] = textures
                    .lines()
                    .orientation(orientation[index])
                    .size(40)
                    .strokeWidth(20)
                    .stroke(colours[0])
                    .background(colours[1])
                    .id(`texture-${nationShortName}`)

                index = (index + 1) % orientation.length
            } else {
                this.#textures[nationShortName] = textures
                    .circles()
                    .radius(5)
                    .strokeWidth(3)
                    .stroke(colours[1])
                    .fill(colours[2])
                    .background(colours[0])
                    .id(`texture-${nationShortName}`)
            }

            // @ts-expect-error
            // eslint-disable-next-line unicorn/prefer-prototype-methods
            this.#svg.call(this.#textures[nationShortName])
        }
    }

    _getOptions(): HtmlString {
        return `${this._ownershipData
            .map((region) => `<option value="${region.region}">${region.region}</option>;`)
            .join("")}`
    }

    _setupSelect(): void {
        const bsSelectOptions: BootstrapSelectOptions = { noneSelectedText: "Select region" }

        this.#select = new Select(this.#baseId, this.#modal!.baseIdSelects, bsSelectOptions, this._getOptions())
    }

    _setupSelectListener(): void {
        this.#select.select$.on("change", () => {
            this._regionSelected()
        })
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
        const margin = { right: 0, bottom: 32, left: 0 }

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
            this.#svg
                .selectAll("path.nation")
                .data(stacked)
                .join((enter) =>
                    enter
                        .append("path")
                        .attr("class", "nation")
                        .attr("fill", (d) => this.#textures[d.key].url())
                        .attr("stroke", primary300)
                        .attr("stroke-width", "3px")
                        // @ts-expect-error
                        .attr("d", area)
                )

            // Labels
            this.#svg
                .selectAll(".area-label")
                .data(stacked)
                .join((enter) =>
                    // @ts-expect-error
                    enter
                        .append("text")
                        .attr("class", "area-label text-shadow")
                        .text((d) => labelNames.get(d.key))
                        .attr("fill", (d) => getContrastColour(findNationByNationShortName(d.key)?.colours[0] ?? ""))
                        .attr("transform", d3AreaLabel(area))
                )
        }

        this.#svg.attr("width", width).attr("height", height)
        render()
        this.#svg.append("g").call(setXAxis)
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
            .width(this._getWidth())(this.#div.node()!)
    }

    /**
     * Show data for selected region
     */
    _regionSelected(): void {
        const regionSelected = String(this.#select.getValues())

        // Remove current display
        this.#div.selectAll("*").remove()

        const regionData = this._ownershipData
            .filter((region) => region.region === regionSelected)
            .map((region) => region.data)[0]
        void this._injectChart(regionData)
    }
}
