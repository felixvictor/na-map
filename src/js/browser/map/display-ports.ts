/*!
 * This file is part of na-map.
 *
 * @file      Display ports.
 * @module    map/display-ports
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { default as BSTooltip } from "bootstrap/js/dist/tooltip"

import { min as d3Min, max as d3Max, sum as d3Sum } from "d3-array"
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate"
// import { polygonCentroid as d3PolygonCentroid, polygonHull as d3PolygonHull } from "d3-polygon";
import { ScaleLinear, scaleLinear as d3ScaleLinear, ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import htm from "htm"
import { h, VNode } from "preact"
import render from "preact-render-to-string"
// import { curveCatmullRomClosed as d3CurveCatmullRomClosed, line as d3Line } from "d3-shape";

import dayjs from "dayjs"
import "dayjs/locale/en-gb"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import relativeTime from "dayjs/plugin/relativeTime.js"
import utc from "dayjs/plugin/utc.js"
dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale("en-gb")

import {
    capitalizeFirstLetter,
    findNationByNationShortName,
    nations,
    NationShortName,
    simpleStringSort,
} from "common/common"
import {
    colourGreenDark,
    colourLight,
    colourList,
    colourRedDark,
    loadJsonFile,
    loadJsonFiles,
    nationFlags,
    primary300,
} from "common/common-browser"
import { formatInt, formatPercentHtml, formatSiCurrency, formatSiInt, formatSiIntHtml } from "common/common-format"
import {
    Coordinate,
    defaultCircleSize,
    defaultFontSize,
    degreesHalfCircle,
    degreesToRadians,
    distancePoints,
    Extent,
    getOrdinalSVG,
    Point,
    roundToThousands,
    ϕ,
} from "common/common-math"
import { displayClanLitHtml } from "common/common-game-tools"
import { serverMaintenanceHour } from "common/common-var"

import {
    PortBattlePerServer,
    PortBasic,
    PortPerServer,
    PortWithTrades,
    TradeItem,
    TradeGoodProfit,
    GoodList,
} from "common/gen-json"
import { DataSource, DivDatum, HtmlResult, HtmlString, PortJsonData, SVGGDatum, ZoomLevel } from "common/interface"
import { PortBonus, portBonusType } from "common/types"
import { Area, countyPolygon, patrolZones, regionPolygon } from "./map-data"

import Cookie from "util/cookie"
import RadioButton from "util/radio-button"
import { default as swordsIcon } from "icons/icon-swords.svg"
import { NAMap } from "./na-map"
import ShowF11 from "./show-f11"

const html = htm.bind(h)

type PortCircleStringF = (d: PortWithTrades) => string
type PortCircleNumberF = (d: PortWithTrades) => number

interface CurrentPort {
    id: number
    coord: Coordinate
}
interface Profit {
    profit: HtmlResult[]
    profitPerTon: HtmlResult[]
}

interface PortForDisplay {
    name: string
    icon: NationShortName
    availableForAll: boolean
    shallow: boolean
    county: string
    region: string
    countyCapital: boolean
    capital: boolean
    capturer: HtmlResult
    captureTime: string
    cooldownTime?: HtmlResult
    attack: HtmlResult
    isNPCAttacker: boolean
    pbTimeRange: HtmlResult
    brLimit: string
    portPoints: string
    taxIncome: HtmlResult
    portTax: HtmlResult
    netIncome: HtmlResult
    tradingCompany: number
    laborHoursDiscount: number
    dropsTrading: string
    consumesTrading: string
    producesNonTrading: string
    dropsNonTrading: string
    tradePort: string
    tradePortId?: number
    goodsToSellInTradePort: Profit
    goodsToBuyInTradePort: Profit
    portBonus?: PortBonus
}

interface ReadData {
    [index: string]: PortBasic[] | PortPerServer[] | PortBattlePerServer[]
    ports: PortBasic[]
    server: PortPerServer[]
    pb: PortBattlePerServer[]
}

export default class DisplayPorts {
    #circleType = ""
    #currentPort: CurrentPort = { id: 366, coord: { x: 4396, y: 2494 } } // Shroud Cay
    #portData = {} as PortWithTrades[]
    #portDataDefault!: PortWithTrades[]
    #showCurrentGood = false
    #showRadius = ""
    #showTradePortPartners = false
    #tradeItem = {} as Map<number, TradeItem>
    #tradePortId = 0
    #zoomLevel: ZoomLevel = "initial"
    #attackRadius!: ScaleLinear<number, number>
    #colourScaleCounty!: ScaleOrdinal<string, string>
    #colourScaleHostility!: ScaleLinear<string, string>
    #colourScaleNet!: ScaleLinear<string, string>
    #colourScalePoints!: ScaleLinear<string, string>
    #colourScaleTax!: ScaleLinear<string, string>
    #countyPolygon = countyPolygon
    #countyPolygonFiltered = [] as Area[]
    #divPortSummary!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #gCounty!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gIcon!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gPort!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gPortCircle!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gPZ!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gRegion!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gText!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #lowerBound = {} as Point
    #maxNetIncome!: number
    #maxPortPoints!: number
    #maxTaxIncome!: number
    #minNetIncome!: number
    #minPortPoints!: number
    #minTaxIncome!: number
    #portDataFiltered!: PortWithTrades[]
    #portRadius!: ScaleLinear<number, number>
    #portSummaryNetIncome!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryNumPorts!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTaxIncome!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextNetIncome!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextNumPorts!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextTaxIncome!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #regionPolygon = regionPolygon
    #regionPolygonFiltered = [] as Area[]
    #scale = 0
    #tooltip: BSTooltip | undefined = undefined
    #upperBound = {} as Point
    readonly #baseId = "show-radius"
    readonly #circleSize = defaultCircleSize
    readonly #cookie: Cookie
    readonly #f11: ShowF11
    readonly #fontSize = defaultFontSize
    readonly #iconSize = 48
    readonly #minRadiusFactor = ϕ
    readonly #maxRadiusFactor = ϕ * 4
    readonly #minScale: number
    readonly #radioButtonValues: string[]
    readonly #radios: RadioButton
    readonly #serverName: string
    readonly #showPBZones = "all"

    constructor(readonly map: NAMap) {
        this.#serverName = this.map.serverName
        this.#minScale = this.map.minMapScale
        this.#scale = this.#minScale
        this.#f11 = this.map.f11

        /**
         * Possible values for show radius (first is default value)
         */
        this.#radioButtonValues = ["attack", "county", "points", "position", "tax", "net", "off"]

        /**
         * Show radius cookie
         */
        this.#cookie = new Cookie({ id: this.#baseId, values: this.#radioButtonValues })

        /**
         * Show radius radio buttons
         */
        this.#radios = new RadioButton(this.#baseId, this.#radioButtonValues)

        /**
         * Get showRadius setting from cookie or use default value
         */
        this.showRadius = this._getShowRadiusSetting()
    }

    async init(): Promise<void> {
        await this._loadAndSetupData()
    }

    _setupData(data: ReadData): void {
        // Combine port data with port battle data
        this.#portDataDefault = data.ports.map((port: PortBasic) => {
            const serverData = data.server.find((d: PortPerServer) => d.id === port.id) ?? ({} as PortPerServer)
            const pbData = data.pb.find((d: PortBattlePerServer) => d.id === port.id) ?? ({} as PortBattlePerServer)
            const combinedData = { ...port, ...serverData, ...pbData } as PortWithTrades

            return combinedData
        })
        this.#portData = this.#portDataDefault

        this._setupScales()
        this._setupListener()
        this._setupSvg()
        this._setupCounties()
        this._setupPatrolZones()
        this._setupSummary()
        this._setupFlags()
    }

    async _loadData(): Promise<ReadData> {
        const dataSources: DataSource[] = [
            {
                fileName: `${this.#serverName}-ports.json`,
                name: "server",
            },
            {
                fileName: `${this.#serverName}-pb.json`,
                name: "pb",
            },
        ]

        const tradeItems = await loadJsonFile<TradeItem[]>(`${this.#serverName}-items.json`)
        this.tradeItem = new Map(tradeItems.map((item) => [item.id, item]))

        const readData = {} as ReadData
        readData.ports = (await import(/* webpackChunkName: "data-ports" */ "../../../../lib/gen-generic/ports.json"))
            .default as PortBasic[]
        await loadJsonFiles<PortJsonData>(dataSources, readData)

        return readData
    }

    async _loadAndSetupData(): Promise<void> {
        const readData = await this._loadData()
        this._setupData(readData)
    }

    _setupScales(): void {
        this.#portRadius = d3ScaleLinear()
        this.#attackRadius = d3ScaleLinear().domain([0, 1])

        this.#colourScaleHostility = d3ScaleLinear<string, string>()
            .domain([0, 1])
            .range([colourLight, colourRedDark])
            .interpolate(d3InterpolateHcl)
        this.#colourScaleCounty = d3ScaleOrdinal<string, string>().range(colourList)

        this.#minTaxIncome = d3Min(this.portData, (d) => d.taxIncome) ?? 0
        this.#maxTaxIncome = d3Max(this.portData, (d) => d.taxIncome) ?? 0
        this.#colourScaleTax = d3ScaleLinear<string, string>()
            .domain([this.#minTaxIncome, this.#maxTaxIncome])
            .range([colourLight, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.#minNetIncome = d3Min(this.portData, (d) => d.netIncome) ?? 0
        this.#maxNetIncome = d3Max(this.portData, (d) => d.netIncome) ?? 0
        this.#colourScaleNet = d3ScaleLinear<string, string>()
            .domain([this.#minNetIncome, 0, this.#maxNetIncome])
            .range([colourRedDark, colourLight, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.#minPortPoints = d3Min(this.portData, (d) => d.portPoints) ?? 0
        this.#maxPortPoints = d3Max(this.portData, (d) => d.portPoints) ?? 0
        this.#colourScalePoints = d3ScaleLinear<string, string>()
            .domain([this.#minPortPoints, this.#maxPortPoints])
            .range([colourLight, colourGreenDark])
            .interpolate(d3InterpolateHcl)
    }

    _setupListener(): void {
        document.querySelector("#show-radius")?.addEventListener("change", () => {
            this._showRadiusSelected()
        })
    }

    /**
     * Get show setting from cookie or use default value
     * @returns Show setting
     */
    _getShowRadiusSetting(): string {
        let r = this.#cookie.get()

        // Radius "position" after reload is useless
        if (r === "position") {
            ;[r] = this.#radioButtonValues
            this.#cookie.set(r)
        }

        this.#radios.set(r)

        return r
    }

    _showRadiusSelected(): void {
        this.showRadius = this.#radios.get()
        this.#cookie.set(this.showRadius)
        this.update()
    }

    _setupSvg(): void {
        this.#gPort = d3Select<SVGGElement, SVGGDatum>("#map")
            .insert("g", "g.f11")
            .attr("data-ui-component", "ports")
            .attr("id", "ports")
        this.#gRegion = this.#gPort.append<SVGGElement>("g").attr("data-ui-component", "region").attr("class", "title")
        this.#gCounty = this.#gPort
            .append<SVGGElement>("g")
            .attr("data-ui-component", "county")
            .attr("class", "sub-title")
        this.#gPortCircle = this.#gPort.append<SVGGElement>("g").attr("data-ui-component", "port-circles")
        this.#gIcon = this.#gPort
            .append<SVGGElement>("g")
            .attr("data-ui-component", "port-icons")
            .attr("class", "click-circle")
        this.#gText = this.#gPort
            .append<SVGGElement>("g")
            .attr("data-ui-component", "port-names")
            .attr("class", "fill-white")
        this.#gPZ = this.#gPort
            .append<SVGGElement>("g")
            .attr("data-ui-component", "patrol-zone")
            .attr("class", "fill-yellow-dark")
    }

    _setupCounties(): void {
        // Sort by distance, origin is top left corner
        const origin = { x: this.map.coord.max / 2, y: this.map.coord.max / 2 }
        this.#countyPolygon = this.#countyPolygon.sort((a, b) => {
            const pointA = { x: a.centroid[0], y: a.centroid[1] }
            const pointB = { x: b.centroid[0], y: b.centroid[1] }

            return distancePoints(origin, pointA) - distancePoints(origin, pointB)
        })
        this.#colourScaleCounty.domain(this.#countyPolygon.map((county) => county.name))
    }

    _setupPatrolZones(): void {
        const start = dayjs.utc("2021-01-17").hour(serverMaintenanceHour)
        const index = dayjs.utc().diff(start, "day") % patrolZones.length
        // console.log(start.format("YYYY-MM-DD hh.mm"), index)
        const { radius, name, shallow, shipClass } = patrolZones[index]
        const swordSize = radius * 1.6
        const [x, y] = patrolZones[index].coordinates
        const dyFactor = 1.3
        const dy = Math.round(radius / dyFactor)
        const fontSize = Math.round((this.#fontSize * radius) / 100)

        this.#gPZ.append("circle").attr("class", "background-yellow").attr("cx", x).attr("cy", y).attr("r", radius)
        this.#gPZ
            .append("image")
            .attr("height", swordSize)
            .attr("width", swordSize)
            .attr("x", x)
            .attr("y", y)
            .attr("transform", `translate(${Math.floor(-swordSize / 2)},${Math.floor(-swordSize / 1.6)})`)
            .attr("xlink:href", swordsIcon)
            .attr("alt", "Patrol zone")
        this.#gPZ
            .append("text")
            .attr("class", "svg-text-center")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", dy)
            .attr("font-size", Math.round(fontSize * 1.6))
            .text(name)
        this.#gPZ
            .append("text")
            .attr("class", "svg-text-center")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", dy - fontSize * 1.6)
            .attr("font-size", fontSize)
            .html(
                shallow
                    ? "Shallow water ships"
                    : `${
                          shipClass ? `${getOrdinalSVG(shipClass.min)} to ${getOrdinalSVG(shipClass.max)} rate` : "All"
                      } ships`
            )
    }

    _setupSummary(): void {
        // Main box
        this.#divPortSummary = d3Select<HTMLDivElement, DivDatum>("main #summary-column")
            .append<HTMLDivElement>("div")
            .attr("id", "port-summary")
            .attr("class", "port-summary shadow port-summary-no-wind")

        // Number of selected ports
        this.#portSummaryNumPorts = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextNumPorts = this.#portSummaryNumPorts.append<HTMLDivElement>("div")
        this.#portSummaryNumPorts.append<HTMLDivElement>("div").attr("class", "overlay-des").html("selected<br>ports")

        // Total tax income
        this.#portSummaryTaxIncome = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextTaxIncome = this.#portSummaryTaxIncome.append<HTMLDivElement>("div")
        this.#portSummaryTaxIncome.append<HTMLDivElement>("div").attr("class", "overlay-des").html("tax<br>income")

        // Total net income
        this.#portSummaryNetIncome = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextNetIncome = this.#portSummaryNetIncome.append<HTMLDivElement>("div")
        this.#portSummaryNetIncome.append<HTMLDivElement>("div").attr("class", "overlay-des").html("net<br>income")
    }

    _setupFlags(): void {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getPattern = (id: string): SVGPatternElement => {
            const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern")
            pattern.id = id
            pattern.setAttribute("width", "133%")
            pattern.setAttribute("height", "100%")
            pattern.setAttribute("viewBox", `6 6 ${this.#iconSize} ${this.#iconSize * 0.75}`)

            return pattern
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getImage = (nation: NationShortName): SVGImageElement => {
            const image = document.createElementNS("http://www.w3.org/2000/svg", "image")
            image.setAttribute("width", String(this.#iconSize))
            image.setAttribute("height", String(this.#iconSize))
            image.setAttribute("href", nationFlags[nation].replace('"', "").replace('"', ""))

            return image
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getCircleCapital = (): SVGCircleElement => {
            const circleCapital = document.createElementNS("http://www.w3.org/2000/svg", "circle")
            circleCapital.setAttribute("cx", String(this.#iconSize / 2))
            circleCapital.setAttribute("cy", String(this.#iconSize / 2))
            circleCapital.setAttribute("r", "16")
            circleCapital.setAttribute("class", "circle-highlight-yellow")

            return circleCapital
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getCircleRegionCapital = (): SVGCircleElement => {
            const circleCapital = document.createElementNS("http://www.w3.org/2000/svg", "circle")
            circleCapital.setAttribute("cx", String(this.#iconSize / 2))
            circleCapital.setAttribute("cy", String(this.#iconSize / 2))
            circleCapital.setAttribute("r", "16")
            circleCapital.setAttribute("class", "circle-highlight")

            return circleCapital
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getRectAvail = (): SVGRectElement => {
            const rectAvail = document.createElementNS("http://www.w3.org/2000/svg", "rect")
            rectAvail.setAttribute("height", "480")
            rectAvail.setAttribute("width", "640")
            rectAvail.setAttribute("fill", primary300)
            rectAvail.setAttribute("fill-opacity", "0.7")

            return rectAvail
        }

        const svgDefNode = document.querySelector<SVGDefsElement>("#na-svg defs")!

        for (const nation of nations.map((d) => d.short)) {
            const patternElement = getPattern(nation)
            patternElement.append(getImage(nation))
            // eslint-disable-next-line unicorn/prefer-dom-node-append
            const patternNode = svgDefNode.appendChild(patternElement)

            if (nation !== "FT") {
                const patternRegionCapital = patternNode.cloneNode(true) as SVGPatternElement
                patternRegionCapital.id = `${nation}r`
                patternRegionCapital.append(getCircleRegionCapital())
                svgDefNode.append(patternRegionCapital)
            }

            if (nation !== "NT" && nation !== "FT") {
                const patternCapital = patternNode.cloneNode(true) as SVGPatternElement
                patternCapital.id = `${nation}c`
                patternCapital.append(getCircleCapital())
                svgDefNode.append(patternCapital)

                const patternAvail = patternNode.cloneNode(true) as SVGPatternElement
                patternAvail.id = `${nation}a`
                patternAvail.append(getRectAvail())
                svgDefNode.append(patternAvail)

                const patternRegionCapitalAvail = patternAvail.cloneNode(true) as SVGPatternElement
                patternRegionCapitalAvail.id = `${nation}ra`
                patternRegionCapitalAvail.append(getCircleRegionCapital())
                svgDefNode.append(patternRegionCapitalAvail)
            }
        }
    }

    _getPortName(id: number): string {
        return id ? this.#portDataDefault.find((port) => port.id === id)?.name ?? "" : ""
    }

    _formatItems = (items: GoodList | undefined): string =>
        items
            ?.map((item) => this.tradeItem.get(item)?.name ?? "")
            .sort(simpleStringSort)
            .join(", ") ?? ""

    _sortByProfit = (a: TradeGoodProfit, b: TradeGoodProfit): number => b.profit.profit - a.profit.profit

    _sortByProfitPerTon = (a: TradeGoodProfit, b: TradeGoodProfit): number =>
        b.profit.profitPerTon - a.profit.profitPerTon

    _formatProfits = (profits: TradeGoodProfit[]): HtmlResult =>
        html`${profits
            ?.sort(this._sortByProfit)
            ?.map(
                (good, index) =>
                    html`<span style="white-space: nowrap;">${good.name} (${formatSiIntHtml(good.profit.profit)})</span
                        >${index === profits.length - 1 ? html`` : html`, `}`
            )}`

    _formatProfitsPerTon = (profits: TradeGoodProfit[]): HtmlResult =>
        html`${profits
            ?.sort(this._sortByProfitPerTon)
            ?.map(
                (good, index) =>
                    html`<span style="white-space: nowrap;"
                            >${good.name} (${formatSiIntHtml(good.profit.profitPerTon)})</span
                        >${index === profits.length - 1 ? html`` : html`, `}`
            )}`

    // eslint-disable-next-line complexity
    _getText(portProperties: PortWithTrades): PortForDisplay {
        /*
        const getCoord = (portId: number): Coordinate => {
            const port = this.#portDataDefault.find((port) => port.id === portId)!
            return { x: port.coordinates[0], y: port.coordinates[1] }
        }

        const getKDistance = (fromPortId: number, toPortId: number): number => {
            const fromPortCoord = getCoord(fromPortId)
            const toPortCoord = getCoord(toPortId)
            return getDistance(fromPortCoord, toPortCoord)
        }
        */

        const formatFromToTime = (from: number, to: number): HtmlResult =>
            html`<span style="white-space: nowrap;">${String(from)} ‒ ${String(to)}</span>`

        const formatTime = (from: number, to: number): HtmlResult => {
            const fromLocal = Number(dayjs.utc().hour(from).local().format("H"))
            const toLocal = Number(dayjs.utc().hour(to).local().format("H"))
            return html`${formatFromToTime(from, to)} (${formatFromToTime(fromLocal, toLocal)})`
        }

        const portBattleST = dayjs.utc(portProperties.portBattle)
        const portBattleLT = dayjs.utc(portProperties.portBattle).local()
        const localTime = portBattleST === portBattleLT ? "" : ` (${portBattleLT.format("H.mm")} local)`

        const cooldownTimeST = dayjs.utc(portProperties.cooldownTime)
        const cooldownTimeLT = dayjs.utc(portProperties.cooldownTime).local()
        const cooldownTimeLocal = cooldownTimeST === cooldownTimeLT ? "" : ` (${cooldownTimeLT.format("H.mm")} local)`
        const portBattleStartTime = portProperties.portBattleStartTime
            ? formatTime((portProperties.portBattleStartTime + 10) % 24, (portProperties.portBattleStartTime + 13) % 24)
            : formatTime(11, 8)
        const endSyllable = portBattleST.isAfter(dayjs.utc()) ? "s" : "ed"
        const attackHostility = portProperties.portBattle
            ? html`<span
                      class="flag-icon-${portProperties.attackerNation} flag-icon-small me-1"
                      role="img"
                      title="${findNationByNationShortName(portProperties?.attackerNation ?? "")?.sortName ?? ""}"
                  ></span
                  >${displayClanLitHtml(portProperties.attackerClan)} attack${portProperties.portBattle
                      ? html`${endSyllable} ${portBattleST.fromNow()} at ${portBattleST.format("H.mm")}${localTime}`
                      : html`s: ${formatPercentHtml(portProperties.attackHostility ?? 0)} hostility`}`
            : html``

        const port = {
            name: portProperties.name,
            icon: portProperties.nation,
            availableForAll: portProperties.availableForAll,
            shallow: portProperties.shallow,
            county: portProperties.county === "" ? "" : portProperties.county,
            region: portProperties.region === "" ? "" : portProperties.region,
            countyCapital: portProperties.countyCapital,
            capital: !portProperties.capturable && portProperties.nation !== "FT",
            capturer: portProperties.capturer ? displayClanLitHtml(portProperties.capturer) : html``,
            captureTime: portProperties.captured
                ? `${capitalizeFirstLetter(dayjs.utc(portProperties.captured).fromNow())}`
                : "",
            attack: portProperties.attackHostility ? attackHostility : html``,
            isNPCAttacker: portProperties.attackerNation === "NT",
            pbTimeRange: portProperties.capturable ? portBattleStartTime : "",
            brLimit: formatInt(portProperties.brLimit),
            portPoints: portProperties.capturable ? formatInt(portProperties.portPoints) : "",
            taxIncome: formatSiIntHtml(portProperties.taxIncome),
            portTax: formatPercentHtml(portProperties.portTax),
            netIncome: formatSiIntHtml(portProperties.netIncome),
            tradingCompany: portProperties.tradingCompany,
            laborHoursDiscount: portProperties.laborHoursDiscount,
            dropsTrading: this._formatItems(portProperties.dropsTrading),
            consumesTrading: this._formatItems(portProperties.consumesTrading),
            producesNonTrading: this._formatItems(portProperties.producesNonTrading),
            dropsNonTrading: this._formatItems(portProperties.dropsNonTrading),
            tradePort: this._getPortName(this.tradePortId),
            goodsToSellInTradePort: {
                profit: this._formatProfits(portProperties.goodsToSellInTradePort),
                profitPerTon: this._formatProfitsPerTon(portProperties.goodsToSellInTradePort),
            },
            goodsToBuyInTradePort: {
                profit: this._formatProfits(portProperties.goodsToBuyInTradePort),
                profitPerTon: this._formatProfitsPerTon(portProperties.goodsToBuyInTradePort),
            },
        } as PortForDisplay

        if (port.dropsTrading.length > 0 && port.dropsNonTrading.length > 0) {
            port.dropsNonTrading += "\u00A0\u2012 "
        }

        if (portProperties.cooldownTime) {
            port.cooldownTime = html`${cooldownTimeST.fromNow()} at <em>approximately</em> ${cooldownTimeST.format(
                    "H.mm"
                )}${cooldownTimeLocal}`
        }

        if (portProperties.portBonus) {
            port.portBonus = portProperties.portBonus
        }

        return port
    }

    _showProfits = (goods: Profit, tradePort: string, tradeDirection: string): HtmlResult => {
        const colour = tradeDirection === "buy" ? "alert-success" : "alert-danger"
        const instruction =
            tradeDirection === "buy" ? `Buy here and sell in ${tradePort}` : `Buy in ${tradePort} and sell here`

        return goods.profit?.[0] === undefined
            ? html``
            : html`<div class="alert ${colour} mt-2 mb-2 text-start" role="alert">
                  <div class="alert-heading"><span class="caps">${instruction}</span> (net value in reales)</div>
                  <p class="my-1"><em>By profit per item</em>: ${goods.profit}</p>
                  <p class="my-1"><em>By profit per ton</em>: ${goods.profitPerTon}</p>
              </div>`
    }

    // eslint-disable-next-line complexity
    _tooltipData(port: PortForDisplay): VNode {
        const getPortBonus = (): HtmlResult => {
            return html`${portBonusType.map((bonus) => {
                return html`${port?.portBonus?.[bonus]
                    ? html`<div class="me-1">
                          <i class="icon icon-light icon-${bonus}" role="img" aria-label="${bonus} bonus"></i>
                          <div class="x-large text-lighter text-center">${port.portBonus[bonus]}</div>
                      </div>`
                    : html``}`
            })}`
        }

        const iconBorder = port.capital ? "flag-icon-border-middle" : port.countyCapital ? "flag-icon-border-light" : ""

        const h = html`
            <div class="d-flex justify-content-between mb-4">
                <div class="d-flex">
                    <i class="flag-icon-${port.icon} flag-icon-large ${iconBorder}" role="img" />

                    <div class="text-start align-self-center compress mx-3">
                        <div class="large mb-1">${port.name}</div>
                        <div class="caps">${port.county}</div>
                        <div class="caps">${port.region}</div>
                    </div>
                </div>

                ${port.portBonus ? html`<div class="d-flex align-self-end me-1">${getPortBonus()}</div>` : html``}

                <div class="d-flex flex-column justify-content-end align-self-center">
                    <div class="ms-auto">
                        ${port.portPoints ? html`<span class="x-large text-lighter">${port.portPoints}</span>` : html``}
                    </div>
                    <div class="ms-auto">
                        ${port.laborHoursDiscount
                            ? html`<i
                                  class="icon icon-light icon-labour me-1"
                                  role="img"
                                  aria-label="Labour hour discount level ${port.laborHoursDiscount}"
                              ></i>`
                            : html``}
                        ${port.tradingCompany
                            ? html`<i
                                  class="icon icon-light icon-trading me-1"
                                  role="img"
                                  aria-label="Trading company level ${port.tradingCompany}"
                              ></i>`
                            : html``}
                        ${port.availableForAll
                            ? html`<i
                                  class="icon icon-light icon-open me-1"
                                  role="img"
                                  aria-label="Accessible to all"
                              ></i>`
                            : html``}
                        ${port.shallow
                            ? html`<i class="icon icon-light icon-shallow" role="img" aria-label="Shallow"></i>`
                            : html`<i class="icon icon-light icon-deep" role="img" aria-label="Deep"></i>`}
                    </div>
                </div>
            </div>

            ${port.attack === undefined
                ? html`${port.cooldownTime
                      ? html`<div class="alert alert-success mt-2" role="alert">
                            Port battle cooldown ends ${port.cooldownTime}
                        </div>`
                      : html``}`
                : html`<div class="alert mt-2 ${port.isNPCAttacker ? "alert-warning" : "alert-danger"}" role="alert">
                      ${port.attack}
                  </div>`}

            <div class="d-flex text-start mb-2 compress">
                ${port.capital || port.icon === "FT"
                    ? html`<div>${port.portTax}<br /><span class="des top-0">Tax rate</span></div>`
                    : html`
                          <div class="me-3">
                              ${port.pbTimeRange}<br />
                              <span class="des top-0">Battle timer</span>
                          </div>
                          <div class="me-3">
                              ${port.brLimit}<br />
                              <span class="des top-0">Rating</span>
                          </div>
                          ${port.capturer
                              ? html` <div class="me-3">
                                        ${port.capturer}<br />
                                        <span class="des top-0">Capturer</span>
                                    </div>
                                    <div class="me-5">
                                        ${port.captureTime}<br />
                                        <span class="des top-0">Capture</span>
                                    </div>`
                              : html``}

                          <div class="ms-auto me-3">
                              ${port.taxIncome} (${port.portTax})<br />
                              <span class="des top-0">Tax income</span>
                          </div>
                          <div>
                              ${port.netIncome}<br />
                              <span class="des top-0">Net income</span>
                          </div>
                      `}
            </div>

            ${this.showRadius === "tradePorts"
                ? html`${this._showProfits(port.goodsToSellInTradePort, port.tradePort, "buy")}${this._showProfits(
                      port.goodsToBuyInTradePort,
                      port.tradePort,
                      "sell"
                  )}`
                : html` ${port.producesNonTrading.length > 0
                      ? html`<p class="mb-2">
                            <span class="caps">Produces—</span
                            ><span class="non-trading">${port.producesNonTrading}</span>
                        </p>`
                      : html``}
                  ${port.dropsTrading.length > 0 || port.dropsNonTrading.length > 0
                      ? html`<p class="mb-2">
                            <span class="caps">Drops—</span>
                            ${port.dropsNonTrading
                                ? html`<span class="non-trading">${port.dropsNonTrading}</span>`
                                : html``}
                            ${port.dropsTrading}
                        </p> `
                      : html``}
                  ${port.consumesTrading.length > 0
                      ? html`<p class="mb-2"><span class="caps">Consumes—</span>${port.consumesTrading}</p>`
                      : html``}`}
        `
        return h as VNode
    }

    _getInventory(port: PortWithTrades): HtmlString {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getItemName = (id: number): string => this.tradeItem.get(id)?.name ?? ""

        let h: HtmlString = ""
        const buy = port.inventory
            .filter((good) => good.buyQuantity > 0 && good.buyPrice > 0)
            .sort((a, b) => getItemName(a.id).localeCompare(getItemName(b.id)))
            .map((good) => {
                return `${formatInt(good.buyQuantity)} ${getItemName(good.id)} @ ${formatSiCurrency(good.buyPrice)}`
            })
            .join("<br>")
        const sell = port.inventory
            .filter((good) => good.sellQuantity > 0 && good.sellPrice > 0)
            .sort((a, b) => getItemName(a.id).localeCompare(getItemName(b.id)))
            .map((good) => {
                return `${formatInt(good.sellQuantity)} ${getItemName(good.id)} @ ${formatSiCurrency(good.sellPrice)}`
            })
            .join("<br>")

        h += `<h5 class="caps">${port.name} <span class="small">${port.nation}</span></h5>`
        if (buy.length > 0) {
            h += "<h6>Buy</h6>"
            h += buy
        }

        if (buy.length > 0 && sell.length > 0) {
            h += "<p></p>"
        }

        if (sell.length > 0) {
            h += "<h6>Sell</h6>"
            h += sell
        }

        return h
    }

    _hideDetails(): void {
        if (this.#tooltip !== undefined) {
            this.#tooltip.dispose()
            this.#tooltip = undefined
        }
    }

    _showDetails(event: Event, d: PortWithTrades): void {
        const element = event.currentTarget as Element

        this._hideDetails()
        this.#tooltip = new BSTooltip(element, {
            html: true,
            placement: "auto",
            trigger: "manual",
            title: render(this._tooltipData(this._getText(d))),
            sanitize: false,
        })
        this.#tooltip.show()

        if (this.map.showTrades.show) {
            if (this.map.showTrades.listType !== "inventory") {
                this.map.showTrades.listType = "inventory"
            }

            this.map.showTrades.update(this._getInventory(d))
        }
    }

    _updateIcons(): void {
        const circleScale = this.#scale < 0.5 ? this.#scale * 2 : this.#scale
        const circleSize = this.#circleSize / circleScale
        const data = this.#portDataFiltered

        this.#gIcon
            .selectAll<SVGCircleElement, PortWithTrades>("circle")
            .data(data, (d) => String(d.id))
            .join((enter) =>
                enter
                    .append("circle")
                    .attr("fill", (d) => {
                        const appendix = `${d.nation === "FT" || d.nation === "NT" || d.capturable ? "" : "c"}${
                            d.countyCapital && d.capturable ? "r" : ""
                        }${d.availableForAll && d.nation !== "NT" ? "a" : ""}`
                        return `url(#${d.nation}${appendix})`
                    })
                    .attr("cx", (d) => d.coordinates[0])
                    .attr("cy", (d) => d.coordinates[1])
                    .on("click", (event: Event, d: PortWithTrades) => {
                        this._showDetails(event, d)
                    })
                    .on("mouseleave", () => {
                        this._hideDetails()
                    })
            )
            .attr("r", circleSize)
    }

    _getTradePortMarker(port: PortWithTrades): string {
        let marker = ""
        if (port.id === this.tradePortId) {
            marker = "here"
        } else if (port.sellInTradePort && port.buyInTradePort) {
            marker = "both"
        } else if (port.sellInTradePort) {
            marker = "pos"
        } else if (port.buyInTradePort) {
            marker = "neg"
        }

        return marker
    }

    _getAttackMarker(port: PortWithTrades): string {
        let marker = ""
        if (port.cooldownTime) {
            marker = "cooldown"
        } else if (port.attackerNation === "NT") {
            marker = "raider"
        }

        return marker
    }

    _getFrontlineMarker(port: PortWithTrades): string {
        let marker = ""
        if (port.ownPort) {
            marker = "pos"
        } else if (port.enemyPort) {
            marker = "neg"
        }

        return marker
    }

    _updatePortCircles(): void {
        const circleScale = this.#scale < 0.5 ? this.#scale * 2 : this.#scale
        const scaledCircleSize = this.#circleSize / circleScale
        const rMin = roundToThousands(scaledCircleSize * this.#minRadiusFactor)
        const rMax = roundToThousands(scaledCircleSize * this.#maxRadiusFactor)

        const incomeThreshold = 100_000
        const portPointThreshold = 30
        let data = this.#portDataFiltered
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let cssClass: PortCircleStringF = () => ""
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let r: PortCircleNumberF = () => 0
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let fill: PortCircleStringF = () => ""

        // noinspection IfStatementWithTooManyBranchesJS
        switch (this.showRadius) {
            case "tax":
                data = this.#portDataFiltered.filter((d) => d.capturable && d.taxIncome > incomeThreshold)
                this.#portRadius.domain([this.#minTaxIncome, this.#maxTaxIncome]).range([rMin, rMax])
                cssClass = (): string => "bubble"
                fill = (d): string => this.#colourScaleTax(d.taxIncome) ?? ""
                r = (d): number => this.#portRadius(d.taxIncome) ?? 0

                break

            case "net":
                data = this.#portDataFiltered.filter((d) => d.capturable && Math.abs(d.netIncome) > incomeThreshold)
                this.#portRadius.domain([this.#minNetIncome, this.#maxNetIncome]).range([rMin, rMax])
                cssClass = (): string => "bubble"
                fill = (d): string => this.#colourScaleNet(d.netIncome) ?? ""
                r = (d): number => this.#portRadius(Math.abs(d.netIncome)) ?? 0

                break

            case "points":
                data = this.#portDataFiltered.filter((d) => d.capturable && d.portPoints > portPointThreshold)
                this.#portRadius.domain([this.#minPortPoints, this.#maxPortPoints]).range([rMin, rMax / 2])
                cssClass = (): string => "bubble"
                fill = (d): string => this.#colourScalePoints(d.portPoints) ?? ""
                r = (d): number => this.#portRadius(d.portPoints) ?? 0

                break

            case "position":
                cssClass = (): string => "bubble here"
                r = (d): number => d.distance ?? 0

                break

            case "attack":
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                data = this.#portDataFiltered.filter((port) => port.attackHostility || port.cooldownTime)
                this.#attackRadius.range([rMin, rMax / 1.5])
                cssClass = (d): string => `bubble ${this._getAttackMarker(d)}`
                fill = (d): string =>
                    d.attackerNation === "NT" ? "" : this.#colourScaleHostility(d.attackHostility ?? 0) ?? ""
                r = (d): number => this.#attackRadius(d.attackHostility ?? (d.cooldownTime ? 0.2 : 0)) ?? 0

                break

            default:
                if (this.circleType === "currentGood") {
                    cssClass = (d): string => `bubble ${d.isSource ? "pos" : "neg"}`
                    r = (): number => rMax / 2
                } else {
                    switch (this.showRadius) {
                        case "county":
                            cssClass = (d): string =>
                                d.capturable
                                    ? d.countyCapital
                                        ? "bubble capital"
                                        : "bubble non-capital"
                                    : "bubble not-capturable"
                            fill = (d): string => (d.capturable ? this.#colourScaleCounty(d.county) : "")
                            r = (d): number => (d.capturable ? rMax / 2 : rMax / 3)

                            break

                        case "tradePorts":
                            cssClass = (d): string => `bubble ${this._getTradePortMarker(d)}`
                            r = (d): number => (d.id === this.tradePortId ? rMax : rMax / 2)

                            break

                        case "frontline":
                            cssClass = (d): string => `bubble ${this._getFrontlineMarker(d)}`
                            r = (d): number => (d.ownPort ? rMax / 3 : rMax / 2)
                            data = data.filter((d) => d.enemyPort ?? d.ownPort)

                            break

                        case "currentGood":
                            cssClass = (d): string => `bubble ${d.isSource ? "pos" : "neg"}`
                            r = (): number => rMax / 2

                            break

                        case "off":
                            data = []

                            break

                        // No default
                    }
                }
        }

        this.#gPortCircle
            .selectAll<SVGCircleElement, PortWithTrades>("circle")
            .data(data, (d) => String(d.id))
            .join((enter) =>
                enter
                    .append("circle")
                    .attr("cx", (d) => d.coordinates[0])
                    .attr("cy", (d) => d.coordinates[1])
            )
            .attr("class", (d) => cssClass(d))
            .attr("r", (d) => r(d))
            .attr("fill", (d) => fill(d))
    }

    _updateTextsX(d: PortWithTrades, circleSize: number): number {
        return this.zoomLevel === "pbZone" &&
            (this.#showPBZones === "all" || (this.#showPBZones === "single" && d.id === this.currentPort.id))
            ? d.coordinates[0] + Math.round(circleSize * 1.3 * Math.cos(degreesToRadians(d.angle)))
            : d.coordinates[0]
    }

    _updateTextsY(d: PortWithTrades, circleSize: number, fontSize: number): number {
        const deltaY = circleSize + fontSize * 1.2

        if (this.zoomLevel !== "pbZone") {
            return d.coordinates[1] + deltaY
        }

        const dy = d.angle > 90 && d.angle < 270 ? fontSize : 0
        return this.#showPBZones === "all" || (this.#showPBZones === "single" && d.id === this.currentPort.id)
            ? d.coordinates[1] + Math.round(circleSize * 1.3 * Math.sin(degreesToRadians(d.angle))) + dy
            : d.coordinates[1] + deltaY
    }

    _updateTextsAnchor(d: PortWithTrades): string {
        if (
            this.zoomLevel === "pbZone" &&
            (this.#showPBZones === "all" || (this.#showPBZones === "single" && d.id === this.currentPort.id))
        ) {
            return d.angle > 0 && d.angle < degreesHalfCircle ? "start" : "end"
        }

        return "middle"
    }

    updateTexts(): void {
        if (this.zoomLevel === "initial") {
            this.#gText.classed("d-none", true)
        } else {
            const circleSize = roundToThousands(this.#circleSize / this.#scale)
            const fontSize = roundToThousands(this.#fontSize / this.#scale)
            const data = this.#portDataFiltered

            this.#gText
                .selectAll<SVGTextElement, PortWithTrades>("text")
                .data(data, (d) => String(d.id))
                .join((enter) => enter.append("text").text((d) => d.name))
                .attr("x", (d) => this._updateTextsX(d, circleSize))
                .attr("y", (d) => this._updateTextsY(d, circleSize, fontSize))
                .style("text-anchor", (d) => this._updateTextsAnchor(d))
                .style("dominant-baseline", "auto")

            this.#gText.attr("font-size", `${fontSize}px`).classed("d-none", false)
        }
    }

    _updateSummary(): void {
        const numberPorts = Object.keys(this.#portData).length
        let taxTotal = 0
        let netTotal = 0

        if (numberPorts) {
            taxTotal = d3Sum(this.#portData, (d) => d.taxIncome)
            netTotal = d3Sum(this.#portData, (d) => d.netIncome)
        }

        this.#portSummaryTextNumPorts.text(`${numberPorts}`)
        this.#portSummaryTextTaxIncome.html(`${formatSiInt(taxTotal)}`)
        this.#portSummaryTextNetIncome.html(`${formatSiInt(netTotal)}`)
    }

    _updateCounties(): void {
        if (this.zoomLevel === "portLabel") {
            const data = this.#countyPolygonFiltered

            this.#gCounty
                .selectAll<SVGTextElement, Area>("text")
                .data(data, (d) => d.name)
                .join(
                    (enter) =>
                        enter
                            .append("text")
                            .attr("class", "svg-text-center")
                            .attr("transform", (d) => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`)
                            .text((d) => d.name),
                    (update) =>
                        update.attr("fill", (d: Area): string =>
                            this.showRadius === "county" ? this.#colourScaleCounty(d.name) : ""
                        )
                )

            /*
            const curve = d3CurveCatmullRomClosed;
            const line = d3Line().curve(curve);
            this._gCounty
                .selectAll("path")
                .data(data, d => d.name)
                .join(enter =>
                    enter
                        .append("path")
                        .attr("d", d => line(d.polygon))
                        .attr("fill", "#373")
                );
            */

            this.#gCounty.classed("d-none", false)
        } else {
            this.#gCounty.classed("d-none", true)
        }
    }

    _updateRegions(): void {
        if (this.zoomLevel === "initial") {
            const data = this.#regionPolygonFiltered

            this.#gRegion
                .selectAll<SVGTextElement, Area>("text")
                .data(data, (d) => d.name)
                .join((enter) =>
                    enter
                        .append("text")
                        .attr("class", "svg-text-center")
                        .attr("transform", (d) => `translate(${d.centroid[0]},${d.centroid[1]})rotate(${d.angle})`)
                        .text((d) => d.name)
                )

            /* Show polygon for test purposes
            const d3line2 = d3
                .line()
                .x(d => d[0])
                .y(d => d[1]);

            this._gRegion
                .selectAll("path")
                .data(data)
                .enter()
                .append("path")
                .attr("d", d => d3line2(d.polygon))
                .attr("fill", "#999");
                */
            this.#gRegion.classed("d-none", false)
        } else {
            this.#gRegion.classed("d-none", true)
        }
    }

    _updatePZ(): void {
        if (this.zoomLevel === "pbZone") {
            this.#gPZ.classed("d-none", true)
        } else {
            this.#gPZ.classed("d-none", false)
        }
    }

    update(scale?: number): void {
        this.#scale = scale ?? this.#scale

        this._filterVisible()
        this._updateIcons()
        this._updatePortCircles()
        this.updateTexts()
        this._updateSummary()
        this._updateCounties()
        this._updateRegions()
        this._updatePZ()
    }

    _filterVisible(): void {
        if (this.showRadius === "position") {
            this.#portDataFiltered = this.#portData
        } else {
            this.#portDataFiltered = this.#portData.filter(
                (port) =>
                    port.coordinates[0] >= this.#lowerBound[0] &&
                    port.coordinates[0] <= this.#upperBound[0] &&
                    port.coordinates[1] >= this.#lowerBound[1] &&
                    port.coordinates[1] <= this.#upperBound[1]
            )
        }

        this.#countyPolygonFiltered = this.#countyPolygon.filter(
            (county) =>
                county.centroid[0] >= this.#lowerBound[0] &&
                county.centroid[0] <= this.#upperBound[0] &&
                county.centroid[1] >= this.#lowerBound[1] &&
                county.centroid[1] <= this.#upperBound[1]
        )

        this.#regionPolygonFiltered = this.#regionPolygon.filter(
            (region) =>
                region.centroid[0] >= this.#lowerBound[0] &&
                region.centroid[0] <= this.#upperBound[0] &&
                region.centroid[1] >= this.#lowerBound[1] &&
                region.centroid[1] <= this.#upperBound[1]
        )
    }

    /**
     * Set bounds of current viewport
     * @param viewport - Current viewport
     */
    setBounds(viewport: Extent): void {
        this.#lowerBound = viewport[0]
        this.#upperBound = viewport[1]
    }

    _showSummary(): void {
        this.#divPortSummary.classed("hidden", false)
    }

    setShowRadiusSetting(showRadius = this.#radioButtonValues[0]): void {
        this.showRadius = showRadius
        this.#radios.set(this.showRadius)
        this.#cookie.set(this.showRadius)
    }

    clearMap(scale?: number): void {
        this._showSummary()
        this.#portData = this.#portDataDefault
        this.circleType = ""
        this.setShowRadiusSetting()
        this.update(scale)
    }

    get circleType(): string {
        return this.#circleType
    }

    set circleType(newCircleType: string) {
        this.#circleType = newCircleType
    }

    get currentPort(): CurrentPort {
        return this.#currentPort
    }

    set currentPort(newCurrentPort: CurrentPort) {
        this.#currentPort = newCurrentPort
    }

    get portData(): PortWithTrades[] {
        return this.#portData
    }

    set portData(newPortData: PortWithTrades[]) {
        this.#portData = newPortData
    }

    get portDataDefault(): PortWithTrades[] {
        return this.#portDataDefault
    }

    get showRadius(): string {
        return this.#showRadius
    }

    set showRadius(newShowRadius: string) {
        this.#showRadius = newShowRadius
    }

    get tradeItem(): Map<number, TradeItem> {
        return this.#tradeItem
    }

    set tradeItem(newTradeItem: Map<number, TradeItem>) {
        this.#tradeItem = newTradeItem
    }

    get showTradePortPartners(): boolean {
        return this.#showCurrentGood
    }

    set showTradePortPartners(newShowTradePortPartners: boolean) {
        this.#showTradePortPartners = newShowTradePortPartners
    }

    get tradePortId(): number {
        return this.#tradePortId
    }

    set tradePortId(newTradePortId: number) {
        this.#tradePortId = newTradePortId
    }

    get zoomLevel(): ZoomLevel {
        return this.#zoomLevel
    }

    set zoomLevel(newZoomLevel: ZoomLevel) {
        this.#zoomLevel = newZoomLevel
    }
}
