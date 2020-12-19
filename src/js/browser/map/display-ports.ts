/*!
 * This file is part of na-map.
 *
 * @file      Display ports.
 * @module    map/display-ports
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="webpack-env" />

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/tooltip"

import { min as d3Min, max as d3Max, sum as d3Sum } from "d3-array"
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate"
// import { polygonCentroid as d3PolygonCentroid, polygonHull as d3PolygonHull } from "d3-polygon";
import { ScaleLinear, scaleLinear as d3ScaleLinear, ScaleOrdinal, scaleOrdinal as d3ScaleOrdinal } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"
import htm from "htm"
import { h, render } from "preact"
// import { curveCatmullRomClosed as d3CurveCatmullRomClosed, line as d3Line } from "d3-shape";

import dayjs from "dayjs"
import "dayjs/locale/en-gb"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import relativeTime from "dayjs/plugin/relativeTime.js"
import utc from "dayjs/plugin/utc.js"

import { capitalizeFirstLetter, nations, NationShortName } from "../../common/common"
import {
    colourGreenDark,
    colourList,
    colourRedDark,
    colourWhite,
    loadJsonFile,
    loadJsonFiles,
    primary300,
} from "../../common/common-browser"
import { formatInt, formatPercent, formatSiCurrency, formatSiInt, formatSiIntHtml } from "../../common/common-format"
import {
    Coordinate,
    defaultCircleSize,
    defaultFontSize,
    degreesHalfCircle,
    degreesToRadians,
    distancePoints,
    getOrdinalSVG,
    Point,
    roundToThousands,
} from "../../common/common-math"
import { simpleStringSort } from "../../common/common-node"
import { displayClanLitHtml } from "../../common/common-game-tools"

import JQuery from "jquery"
import {
    PortBattlePerServer,
    PortBasic,
    PortPerServer,
    PortWithTrades,
    NationListAlternative,
    TradeItem,
    TradeGoodProfit,
} from "../../common/gen-json"
import {
    Bound,
    DataSource,
    DivDatum,
    HtmlResult,
    HtmlString,
    PortJsonData,
    SVGGDatum,
    ZoomLevel,
} from "../../common/interface"
import { PortBonus, portBonusType } from "../../common/types"

import Cookie from "../util/cookie"
import RadioButton from "../util/radio-button"
import { default as swordsIcon } from "../../../icons/icon-swords.svg"
import { NAMap } from "./na-map"
import ShowF11 from "./show-f11"

dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale("en-gb")

const html = htm.bind(h)

type PortCircleStringF = (d: PortWithTrades) => string
type PortCircleNumberF = (d: PortWithTrades) => number

interface Area {
    name: string
    centroid: Point
    angle: number
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
    portTax: string
    netIncome: HtmlResult
    tradingCompany: number
    laborHoursDiscount: number
    dropsTrading: string
    consumesTrading: string
    producesNonTrading: string
    dropsNonTrading: string
    tradePort: string
    tradePortId?: number
    goodsToSellInTradePort: HtmlResult[]
    goodsToBuyInTradePort: HtmlResult[]
    portBonus?: PortBonus
}

interface ReadData {
    [index: string]: PortBasic[] | PortPerServer[] | PortBattlePerServer[]
    ports: PortBasic[]
    server: PortPerServer[]
    pb: PortBattlePerServer[]
}

interface PatrolZone {
    name: string
    coordinates: Point
    radius: number
    shallow: boolean
    shipClass?: MinMax<number>
}

interface MinMax<amount> {
    min: amount
    max: amount
}

export default class DisplayPorts {
    circleType = ""
    currentPort!: { id: number; coord: Coordinate }
    portData!: PortWithTrades[]
    portDataDefault!: PortWithTrades[]
    showCurrentGood: boolean
    showRadius: string
    showTradePortPartners: boolean
    tradeItem!: Map<number, TradeItem>
    tradePortId!: number
    zoomLevel: ZoomLevel = "initial"
    #attackRadius!: ScaleLinear<number, number>
    #colourScaleCounty!: ScaleOrdinal<string, string>
    #colourScaleHostility!: ScaleLinear<string, string>
    #colourScaleNet!: ScaleLinear<string, string>
    #colourScalePoints!: ScaleLinear<string, string>
    #colourScaleTax!: ScaleLinear<string, string>
    #countyPolygon!: Area[]
    #countyPolygonFiltered!: Area[]
    #divPortSummary!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #gCounty!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gIcon!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gPort!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gPortCircle!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gPZ!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gRegion!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gText!: Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #lowerBound!: Bound
    #maxNetIncome!: number
    #maxPortPoints!: number
    #maxTaxIncome!: number
    #minNetIncome!: number
    #minPortPoints!: number
    #minTaxIncome!: number
    #nationIcons!: NationListAlternative<string>
    #portDataFiltered!: PortWithTrades[]
    #portRadius!: ScaleLinear<number, number>
    #portSummaryNetIncome!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryNumPorts!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTaxIncome!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextNetIncome!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextNumPorts!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #portSummaryTextTaxIncome!: Selection<HTMLDivElement, DivDatum, HTMLElement, unknown>
    #regionPolygon!: Area[]
    #regionPolygonFiltered!: Area[]
    #scale: number
    #upperBound!: Bound
    readonly #baseId = "show-radius"
    readonly #circleSize = defaultCircleSize
    readonly #cookie: Cookie
    readonly #f11: ShowF11
    readonly #fontSize = defaultFontSize
    readonly #iconSize = 48
    readonly #maxRadiusFactor = 1.618 * 3
    readonly #minRadiusFactor = 1.618
    readonly #minScale: number
    readonly #radioButtonValues: string[]
    readonly #radios: RadioButton
    readonly #serverName: string
    readonly #showPBZones = "all"

    constructor(readonly map: NAMap) {
        this.#serverName = this.map.serverName
        this.#minScale = this.map.minScale
        this.#scale = this.#minScale
        this.#f11 = this.map.f11

        this.showCurrentGood = false
        this.showTradePortPartners = false

        // Shroud Cay
        this.currentPort = { id: 366, coord: { x: 4396, y: 2494 } }

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

    /**
     * {@link https://stackoverflow.com/questions/42118296/dynamically-import-images-from-a-directory-using-webpack}
     * @param r - webpack require.context
     * @returns Images
     */
    static _importAll(r: __WebpackModuleApi.RequireContext): NationListAlternative<string> {
        const images = {} as NationListAlternative<string>
        r.keys().forEach((item) => {
            images[item.replace("./", "").replace(".svg", "")!] = r(item)
        })
        return images
    }

    static _hideDetails(this: JQuery.PlainObject): void {
        $(this).tooltip("dispose")
    }

    async init(): Promise<void> {
        await this._loadAndSetupData()
    }

    _setupData(data: ReadData): void {
        // Combine port data with port battle data
        this.portDataDefault = data.ports.map((port: PortBasic) => {
            const serverData = data.server.find((d: PortPerServer) => d.id === port.id) ?? ({} as PortPerServer)
            const pbData = data.pb.find((d: PortBattlePerServer) => d.id === port.id) ?? ({} as PortBattlePerServer)
            const combinedData = { ...port, ...serverData, ...pbData } as PortWithTrades

            return combinedData
        })
        this.portData = this.portDataDefault

        this._setupScales()
        this._setupListener()
        this._setupSvg()
        this._setupCounties()
        this._setupRegions()
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
        readData.ports = (await import(/* webpackChunkName: "data-ports" */ "../../../lib/gen-generic/ports.json"))
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
            .range([colourWhite, colourRedDark])
            .interpolate(d3InterpolateHcl)
        this.#colourScaleCounty = d3ScaleOrdinal<string, string>().range(colourList)

        this.#minTaxIncome = d3Min(this.portData, (d) => d.taxIncome) ?? 0
        this.#maxTaxIncome = d3Max(this.portData, (d) => d.taxIncome) ?? 0
        this.#colourScaleTax = d3ScaleLinear<string, string>()
            .domain([this.#minTaxIncome, this.#maxTaxIncome])
            .range([colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.#minNetIncome = d3Min(this.portData, (d) => d.netIncome) ?? 0
        this.#maxNetIncome = d3Max(this.portData, (d) => d.netIncome) ?? 0
        this.#colourScaleNet = d3ScaleLinear<string, string>()
            .domain([this.#minNetIncome, 0, this.#maxNetIncome])
            .range([colourRedDark, colourWhite, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.#minPortPoints = d3Min(this.portData, (d) => d.portPoints) ?? 0
        this.#maxPortPoints = d3Max(this.portData, (d) => d.portPoints) ?? 0
        this.#colourScalePoints = d3ScaleLinear<string, string>()
            .domain([this.#minPortPoints, this.#maxPortPoints])
            .range([colourWhite, colourGreenDark])
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
        this.#gRegion = this.#gPort.append<SVGGElement>("g").attr("class", "region")
        this.#gCounty = this.#gPort.append<SVGGElement>("g").attr("class", "county")
        this.#gPortCircle = this.#gPort.append<SVGGElement>("g").attr("data-ui-component", "port-circles")
        this.#gIcon = this.#gPort.append<SVGGElement>("g").attr("class", "port")
        this.#gText = this.#gPort.append<SVGGElement>("g").attr("class", "port-names")
        this.#gPZ = this.#gPort.append<SVGGElement>("g").attr("class", "pz")
    }

    _setupCounties(): void {
        /*
        // Automatic calculation of text position
        // https://stackoverflow.com/questions/40774697/how-to-group-an-array-of-objects-by-key
        const counties = this._portDataDefault
            .filter(port => port.county !== "")
            .reduce(
                (r, a) =>
                    Object.assign(r, {
                        [a.county]: (r[a.county] || []).concat([a.coordinates])
                    }),
                {}
            );
        this._countyPolygon = [];
        Object.entries(counties).forEach(([key, value]) => {
            this._countyPolygon.push({
                name: key,
                polygon: d3PolygonHull(value),
                centroid: d3PolygonCentroid(d3PolygonHull(value)),
                angle: 0
            });
        });
         */

        // noinspection SpellCheckingInspection
        this.#countyPolygon = [
            { name: "Abaco", centroid: [4500, 1953], angle: 0 },
            { name: "Andros", centroid: [3870, 2350], angle: 0 },
            { name: "Apalache", centroid: [2800, 1330], angle: 0 },
            { name: "Bacalar", centroid: [2050, 3646], angle: 0 },
            { name: "Baracoa", centroid: [4750, 3320], angle: 25 },
            { name: "Basse-Terre", centroid: [7540, 4450], angle: 0 },
            { name: "Belize", centroid: [1900, 4300], angle: 0 },
            { name: "Benedenwinds", centroid: [6187, 5340], angle: 0 },
            { name: "Bermuda", centroid: [7550, 210], angle: 0 },
            { name: "Bovenwinds", centroid: [7280, 4180], angle: 350 },
            { name: "Campeche", centroid: [980, 3791], angle: 0 },
            { name: "Cap-Français", centroid: [5270, 3480], angle: 0 },
            { name: "Caracas", centroid: [6430, 5750], angle: 0 },
            { name: "Cartagena", centroid: [4450, 6024], angle: 0 },
            { name: "Caymans", centroid: [3116, 3811], angle: 0 },
            { name: "Cayos del Golfo", centroid: [1240, 3120], angle: 0 },
            { name: "Comayaqua", centroid: [1920, 4500], angle: 0 },
            { name: "Cornwall", centroid: [4100, 3845], angle: 0 },
            { name: "Costa de los Calos", centroid: [2850, 1928], angle: 0 },
            { name: "Costa del Fuego", centroid: [3700, 1670], angle: 70 },
            { name: "Costa Rica", centroid: [3140, 5920], angle: 0 },
            { name: "Crooked", centroid: [4925, 2950], angle: 0 },
            { name: "Ciudad de Cuba", centroid: [4500, 3495], angle: 0 },
            { name: "Cumaná", centroid: [7280, 5770], angle: 0 },
            { name: "Dominica", centroid: [7640, 4602], angle: 0 },
            { name: "Exuma", centroid: [4700, 2560], angle: 0 },
            { name: "Filipina", centroid: [2850, 3100], angle: 340 },
            { name: "Florida Occidental", centroid: [2172, 1200], angle: 0 },
            { name: "Georgia", centroid: [3670, 747], angle: 0 },
            { name: "Golfo de Maracaibo", centroid: [5635, 5601], angle: 0 },
            { name: "Grand Bahama", centroid: [3950, 1850], angle: 320 },
            { name: "Grande-Terre", centroid: [8000, 4400], angle: 35 },
            { name: "Gustavia", centroid: [7720, 3990], angle: 0 },
            { name: "Inagua", centroid: [4970, 3220], angle: 0 },
            { name: "Isla de Pinos", centroid: [3150, 3300], angle: 0 },
            { name: "Kidd’s Island", centroid: [5950, 1120], angle: 0 },
            { name: "La Habana", centroid: [2850, 2800], angle: 340 },
            { name: "La Vega", centroid: [5830, 3530], angle: 20 },
            { name: "Lago de Maracaibo", centroid: [5550, 6040], angle: 0 },
            { name: "Leeward Islands", centroid: [7850, 4150], angle: 0 },
            { name: "Les Cayes", centroid: [5145, 4050], angle: 0 },
            { name: "Los Llanos", centroid: [3640, 2770], angle: 30 },
            { name: "Los Martires", centroid: [3300, 2360], angle: 0 },
            { name: "Louisiane", centroid: [1420, 1480], angle: 0 },
            { name: "Margarita", centroid: [7150, 5584], angle: 0 },
            { name: "Martinique", centroid: [7700, 4783], angle: 0 },
            { name: "Mérida", centroid: [1858, 3140], angle: 0 },
            { name: "New Providence", centroid: [4500, 2330], angle: 0 },
            { name: "North Carolina", centroid: [4580, 150], angle: 0 },
            { name: "North Mosquito", centroid: [2420, 4480], angle: 0 },
            { name: "Nuevitas del Principe", centroid: [4350, 3050], angle: 35 },
            { name: "Nuevo Santander", centroid: [450, 2594], angle: 0 },
            { name: "Orinoco", centroid: [7620, 6000], angle: 0 },
            { name: "Ponce", centroid: [6720, 4040], angle: 0 },
            { name: "Port-au-Prince", centroid: [5000, 3800], angle: 0 },
            { name: "Portobelo", centroid: [3825, 5990], angle: 0 },
            { name: "Providencia", centroid: [3436, 5033], angle: 0 },
            { name: "Quatro Villas", centroid: [3780, 3100], angle: 35 },
            { name: "Royal Mosquito", centroid: [3130, 4840], angle: 0 },
            { name: "Sainte-Lucie", centroid: [7720, 4959], angle: 0 },
            { name: "San Juan", centroid: [6760, 3800], angle: 0 },
            { name: "Santa Marta", centroid: [5150, 5500], angle: 340 },
            { name: "Santo Domingo", centroid: [5880, 4000], angle: 350 },
            { name: "South Carolina", centroid: [4200, 416], angle: 0 },
            { name: "South Cays", centroid: [4170, 4361], angle: 0 },
            { name: "South Mosquito", centroid: [3080, 5540], angle: 0 },
            { name: "Surrey", centroid: [4350, 4100], angle: 0 },
            { name: "Texas", centroid: [750, 1454], angle: 0 },
            { name: "Timucua", centroid: [3620, 1220], angle: 0 },
            { name: "Trinidad", centroid: [7880, 5660], angle: 350 },
            { name: "Turks and Caicos", centroid: [5515, 3145], angle: 0 },
            { name: "Vera Cruz", centroid: [520, 3779], angle: 0 },
            { name: "Vestindiske Øer", centroid: [7090, 4030], angle: 350 },
            { name: "Virgin Islands", centroid: [7220, 3840], angle: 350 },
            { name: "Windward Isles", centroid: [7800, 5244], angle: 0 },
        ] as Area[]

        // Sort by distance, origin is top left corner
        const origin = { x: this.map.coord.max / 2, y: this.map.coord.max / 2 }
        this.#countyPolygon = this.#countyPolygon.sort((a, b) => {
            const pointA = { x: a.centroid[0], y: a.centroid[1] }
            const pointB = { x: b.centroid[0], y: b.centroid[1] }

            return distancePoints(origin, pointA) - distancePoints(origin, pointB)
        })
        this.#colourScaleCounty.domain(this.#countyPolygon.map((county) => county.name))
    }

    _setupRegions(): void {
        /*
        ** Automatic calculation of text position
        // https://stackoverflow.com/questions/40774697/how-to-group-an-array-of-objects-by-key
        const regions = this._portDataDefault.filter(port => port.region !== "").reduce(
            (r, a) =>
                Object.assign(r, {
                    [a.region]: (r[a.region] || []).concat([a.coordinates])
                }),
            {}
        );
        this._regionPolygon = [];
        Object.entries(regions).forEach(([key, value]) => {
            this._regionPolygon.push({
                name: key,
                // polygon: d3.polygonHull(value),
                centroid: d3.polygonCentroid(d3.polygonHull(value))
            });
        });
        */

        this.#regionPolygon = [
            { name: "Atlantic Coast", centroid: [4200, 970], angle: 0 },
            { name: "Atlantic", centroid: [6401, 684], angle: 0 },
            { name: "Bahamas", centroid: [5100, 2400], angle: 0 },
            { name: "Central America", centroid: [3000, 5100], angle: 0 },
            { name: "Central Antilles", centroid: [6900, 4500], angle: 0 },
            { name: "East Cuba", centroid: [4454, 3400], angle: 20 },
            { name: "Gulf", centroid: [1602, 2328], angle: 0 },
            { name: "Hispaniola", centroid: [5477, 4200], angle: 0 },
            { name: "Jamaica", centroid: [3500, 3985], angle: 0 },
            { name: "Lower Antilles", centroid: [7100, 5173], angle: 0 },
            { name: "Puerto Rico", centroid: [6900, 3750], angle: 0 },
            { name: "South America", centroid: [6400, 6100], angle: 0 },
            { name: "Upper Antilles", centroid: [6850, 4250], angle: 0 },
            { name: "West Cuba", centroid: [3700, 3000], angle: 20 },
            { name: "Yucatan", centroid: [1462, 3550], angle: 0 },
        ] as Area[]
    }

    _setupPatrolZones(): void {
        const patrolZones = [
            { name: "Hispaniola", coordinates: [4900, 3635], radius: 150, shallow: false },
            { name: "Nassau", coordinates: [4360, 2350], radius: 108, shallow: true },
            { name: "Tumbado", coordinates: [2400, 3050], radius: 150, shallow: false },
            { name: "Léogane", coordinates: [5130, 3770], radius: 90, shallow: false, shipClass: { min: 7, max: 4 } },
            { name: "Tortuga", coordinates: [5435, 3420], radius: 100, shallow: false, shipClass: { min: 7, max: 5 } },
            { name: "Antilles", coordinates: [7555, 4470], radius: 140, shallow: false },
            { name: "Nassau", coordinates: [4360, 2350], radius: 108, shallow: true },
            { name: "La Mona", coordinates: [6180, 4100], radius: 170, shallow: false, shipClass: { min: 7, max: 4 } },
        ] as PatrolZone[]

        const start = dayjs.utc("2020-07-24").hour(10)
        const index = dayjs.utc().diff(start, "day") % patrolZones.length
        // console.log(start.format("YYYY-MM-DD hh.mm"), index)
        const { radius, name, shallow, shipClass } = patrolZones[index]
        const swordSize = radius * 1.6
        const [x, y] = patrolZones[index].coordinates
        const dyFactor = 1.2
        const dy = Math.round(radius / dyFactor)
        const fontSize = Math.round((this.#fontSize * radius) / 100)

        this.#gPZ.append("circle").attr("cx", x).attr("cy", y).attr("r", radius).attr("opacity", 0.7)
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
            .text(name)
            .attr("x", x)
            .attr("y", y)
            .attr("dy", dy)
            .attr("font-size", Math.round(fontSize * 1.6))
        this.#gPZ
            .append("text")
            .html(
                shallow
                    ? "Shallow water ships"
                    : `${
                          shipClass ? `${getOrdinalSVG(shipClass.min)} to ${getOrdinalSVG(shipClass.max)} rate` : "All"
                      } ships`
            )
            .attr("x", x)
            .attr("y", y)
            .attr("dy", dy - fontSize * 1.6)
            .attr("font-size", fontSize)
    }

    _setupSummary(): void {
        // Main box
        this.#divPortSummary = d3Select<HTMLDivElement, DivDatum>("main #summary-column")
            .append<HTMLDivElement>("div")
            .attr("id", "port-summary")
            .attr("class", "port-summary port-summary-no-wind")

        // Number of selected ports
        this.#portSummaryNumPorts = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextNumPorts = this.#portSummaryNumPorts.append<HTMLDivElement>("div")
        this.#portSummaryNumPorts.append<HTMLDivElement>("div").attr("class", "summary-des").html("selected<br>ports")

        // Total tax income
        this.#portSummaryTaxIncome = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextTaxIncome = this.#portSummaryTaxIncome.append<HTMLDivElement>("div")
        this.#portSummaryTaxIncome.append<HTMLDivElement>("div").attr("class", "summary-des").html("tax<br>income")

        // Total net income
        this.#portSummaryNetIncome = this.#divPortSummary.append<HTMLDivElement>("div").attr("class", "block")
        this.#portSummaryTextNetIncome = this.#portSummaryNetIncome.append<HTMLDivElement>("div")
        this.#portSummaryNetIncome.append<HTMLDivElement>("div").attr("class", "summary-des").html("net<br>income")
    }

    _setupFlags(): void {
        this.#nationIcons = DisplayPorts._importAll(
            (require as __WebpackModuleApi.RequireFunction).context("../../../images/flags", false, /\.svg$/)
        )

        const getPattern = (id: string): SVGPatternElement => {
            const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern")
            pattern.id = id
            pattern.setAttribute("width", "133%")
            pattern.setAttribute("height", "100%")
            pattern.setAttribute("viewBox", `6 6 ${this.#iconSize} ${this.#iconSize * 0.75}`)

            return pattern
        }

        const getImage = (nation: NationShortName): SVGImageElement => {
            const image = document.createElementNS("http://www.w3.org/2000/svg", "image")
            image.setAttribute("width", String(this.#iconSize))
            image.setAttribute("height", String(this.#iconSize))
            image.setAttribute("href", this.#nationIcons[nation].replace('"', "").replace('"', ""))

            return image
        }

        const getCircleCapital = (): SVGCircleElement => {
            const circleCapital = document.createElementNS("http://www.w3.org/2000/svg", "circle")
            circleCapital.setAttribute("cx", String(this.#iconSize / 2))
            circleCapital.setAttribute("cy", String(this.#iconSize / 2))
            circleCapital.setAttribute("r", "16")

            return circleCapital
        }

        const getRectAvail = (): SVGRectElement => {
            const rectAvail = document.createElementNS("http://www.w3.org/2000/svg", "rect")
            rectAvail.setAttribute("height", "480")
            rectAvail.setAttribute("width", "640")
            rectAvail.setAttribute("fill", primary300)
            rectAvail.setAttribute("fill-opacity", "0.7")

            return rectAvail
        }

        const svgDefNode = document.querySelector<SVGDefsElement>("#na-svg defs")!

        nations
            .map((d) => d.short)
            .forEach((nation) => {
                const patternElement = getPattern(nation)
                patternElement.append(getImage(nation))
                // eslint-disable-next-line unicorn/prefer-node-append
                const patternNode = svgDefNode.appendChild(patternElement)

                if (nation !== "FT") {
                    const patternCapital = patternNode.cloneNode(true) as SVGPatternElement
                    patternCapital.id = `${nation}c`
                    patternCapital.append(getCircleCapital())
                    svgDefNode.append(patternCapital)
                }

                if (nation !== "NT" && nation !== "FT") {
                    const patternAvail = patternNode.cloneNode(true) as SVGPatternElement
                    patternAvail.id = `${nation}a`
                    patternAvail.append(getRectAvail())
                    svgDefNode.append(patternAvail)

                    const patternCapitalAvail = patternAvail.cloneNode(true) as SVGPatternElement
                    patternCapitalAvail.id = `${nation}ca`
                    patternCapitalAvail.append(getCircleCapital())
                    svgDefNode.append(patternCapitalAvail)
                }
            })
    }

    _getPortName(id: number): string {
        return id ? this.portDataDefault.find((port) => port.id === id)?.name ?? "" : ""
    }

    // eslint-disable-next-line complexity
    _getText(portProperties: PortWithTrades): PortForDisplay {
        /*
        const getCoord = (portId: number): Coordinate => {
            const port = this.portDataDefault.find((port) => port.id === portId)!
            return { x: port.coordinates[0], y: port.coordinates[1] }
        }

        const getKDistance = (fromPortId: number, toPortId: number): number => {
            const fromPortCoord = getCoord(fromPortId)
            const toPortCoord = getCoord(toPortId)
            return getDistance(fromPortCoord, toPortCoord)
        }
        */

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const formatFromToTime = (from: number, to: number): HtmlString =>
            `${String(from)}\u2009\u2012\u2009${String(to)}`

        const formatTime = (from: number, to: number): HtmlResult => {
            const fromLocal = Number(dayjs.utc().hour(from).local().format("H"))
            const toLocal = Number(dayjs.utc().hour(to).local().format("H"))
            return html`${formatFromToTime(from, to)} (${formatFromToTime(fromLocal, toLocal)})`
        }

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const sortByProfit = (a: TradeGoodProfit, b: TradeGoodProfit): number => b.profit.profit - a.profit.profit
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
            ? html`${displayClanLitHtml(portProperties.attackerClan)} (${portProperties.attackerNation})
              attack${portProperties.portBattle
                  ? html`${endSyllable} ${portBattleST.fromNow()} at ${portBattleST.format("H.mm")}${localTime}`
                  : html`s: ${formatPercent(portProperties.attackHostility ?? 0)} hostility`}`
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
            isNPCAttacker: portProperties.attackerNation === "Neutral",
            pbTimeRange: portProperties.capturable ? portBattleStartTime : "",
            brLimit: formatInt(portProperties.brLimit),
            portPoints: portProperties.capturable ? formatInt(portProperties.portPoints) : "",
            taxIncome: formatSiIntHtml(portProperties.taxIncome),
            portTax: formatPercent(portProperties.portTax),
            netIncome: formatSiIntHtml(portProperties.netIncome),
            tradingCompany: portProperties.tradingCompany,
            laborHoursDiscount: portProperties.laborHoursDiscount,
            dropsTrading:
                portProperties.dropsTrading
                    ?.map((item) => this.tradeItem.get(item)?.name ?? "")
                    .sort(simpleStringSort)
                    .join(", ") ?? "",
            consumesTrading:
                portProperties.consumesTrading
                    ?.map((item) => this.tradeItem.get(item)?.name ?? "")
                    .sort(simpleStringSort)
                    .join(", ") ?? "",
            producesNonTrading:
                portProperties.producesNonTrading
                    ?.map((item) => this.tradeItem.get(item)?.name ?? "")
                    .sort(simpleStringSort)
                    .join(", ") ?? "",
            dropsNonTrading:
                portProperties.dropsNonTrading
                    ?.map((item) => this.tradeItem.get(item)?.name ?? "")
                    .sort(simpleStringSort)
                    .join(", ") ?? "",
            tradePort: this._getPortName(this.tradePortId),
            goodsToSellInTradePort: html`${portProperties.goodsToSellInTradePort
                ?.sort(sortByProfit)
                ?.map(
                    (good, index) =>
                        html`<span style="white-space: nowrap;">${good.name} (${formatSiInt(good.profit.profit)})</span
                            >${index === portProperties.goodsToSellInTradePort.length - 1 ? html`` : html`, `}`
                )}`,
            goodsToBuyInTradePort: html`${portProperties.goodsToBuyInTradePort
                ?.sort(sortByProfit)
                ?.map(
                    (good, index) =>
                        html`<span style="white-space: nowrap;">${good.name} (${formatSiInt(good.profit.profit)})</span
                            >${index === portProperties.goodsToBuyInTradePort.length - 1 ? html`` : html`, `}`
                )}`,
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

    // eslint-disable-next-line complexity
    _tooltipData(port: PortForDisplay): HtmlResult {
        const getPortBonus = (): HtmlResult => {
            return html`${portBonusType.map((bonus) => {
                return html`${port?.portBonus?.[bonus]
                    ? html`<div>
                          <i class="icon icon-light icon-${bonus} mr-1" aria-hidden="true"></i>
                          <span class="sr-only">${bonus} bonus </span>
                          <span class="x-large text-lighter align-top mr-1">${port.portBonus[bonus]}</span>
                      </div>`
                    : html``}`
            })}`
        }

        const iconBorder = port.capital ? "flag-icon-border-middle" : port.countyCapital ? "flag-icon-border-light" : ""

        const h = html`
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="d-flex align-items-center ">
                    <img
                        alt="${port.icon}"
                        class="flag-icon mr-3 align-self-stretch ${iconBorder}"
                        src="${this.#nationIcons[port.icon].replace('"', "").replace('"', "")}"
                    />

                    <div class="text-left mr-1">
                        <div class="large">${port.name}</div>
                        <div class="caps">${port.county}</div>
                        <div class="caps">${port.region}</div>
                    </div>
                </div>

                ${port.portBonus ? html`<div class="d-flex mr-1">${getPortBonus()}</div>` : html``}

                <div class="d-flex flex-column justify-content-end">
                    <div class="ml-auto">
                        ${port.portPoints ? html`<span class="x-large text-lighter">${port.portPoints}</span>` : html``}
                    </div>
                    <div class="ml-auto">
                        ${port.laborHoursDiscount
                            ? html`<i class="icon icon-light icon-labour mr-1" aria-hidden="true"></i
                                  ><span class="sr-only">Labour hour discount level ${port.laborHoursDiscount}</span>`
                            : html``}
                        ${port.tradingCompany
                            ? html`<i class="icon icon-light icon-trading mr-1" aria-hidden="true"></i
                                  ><span class="sr-only">Trading company level ${port.tradingCompany}</span>`
                            : html``}
                        ${port.availableForAll
                            ? html`<i class="icon icon-light icon-open mr-1" aria-hidden="true"></i
                                  ><span class="sr-only">Accessible to all</span>`
                            : html``}
                        ${port.shallow
                            ? html`<i class="icon icon-light icon-shallow" aria-hidden="true"></i
                                  ><span class="sr-only">Shallow</span>`
                            : html`<i class="icon icon-light icon-deep" aria-hidden="true"></i
                                  ><span class="sr-only">Deep</span>`}
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

            <div class="d-flex text-left mb-2">
                ${port.capital || port.icon === "FT"
                    ? html`<div>${port.portTax}<br /><span class="des">Tax rate</span></div>`
                    : html`
                          <div class="mr-3">
                              ${port.pbTimeRange}<br />
                              <span class="des">Battle timer</span>
                          </div>
                          <div class="mr-3">
                              ${port.brLimit}<br />
                              <span class="des">Rating</span>
                          </div>
                          <div class="mr-3">
                              ${port.capturer}<br />
                              <span class="des">Capturer</span>
                          </div>
                          <div class="mr-5">
                              ${port.captureTime}<br />
                              <span class="des">Capture</span>
                          </div>

                          <div class="ml-auto mr-3">
                              ${port.taxIncome} (${port.portTax})<br />
                              <span class="des">Tax income</span>
                          </div>
                          <div>
                              ${port.netIncome}<br />
                              <span class="des">Net income</span>
                          </div>
                      `}
            </div>

            ${port.producesNonTrading.length > 0
                ? html`<p class="mb-2">
                      <span class="caps">Produces—</span><span class="non-trading">${port.producesNonTrading}</span>
                  </p>`
                : html``}
            ${port.dropsTrading.length > 0 || port.dropsNonTrading.length > 0
                ? html`<p class="mb-2">
                      <span class="caps">Drops—</span>
                      ${port.dropsNonTrading ? html`<span class="non-trading">${port.dropsNonTrading}</span>` : html``}
                      ${port.dropsTrading}
                  </p> `
                : html``}
            ${port.consumesTrading.length > 0
                ? html`<p class="mb-2"><span class="caps">Consumes—</span>${port.consumesTrading}</p>`
                : html``}
            ${this.showRadius === "tradePorts"
                ? html`${port.goodsToSellInTradePort?.[0] === undefined
                      ? html``
                      : html`<div class="alert alert-success mt-2 mb-2 text-left" role="alert">
                            <span class="caps">Buy here and sell in ${port.tradePort}</span> (net profit)<br />${port.goodsToSellInTradePort}
                        </div>`}
                  ${port.goodsToBuyInTradePort?.[0] === undefined
                      ? html``
                      : html`<div class="alert alert-danger mt-2 mb-2 text-left" role="alert">
                            <span class="caps">Buy in ${port.tradePort} and sell here</span> (net profit)<br />${port.goodsToBuyInTradePort}
                        </div>`}`
                : html``}
        `
        return h
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

    _showDetails(event: Event, d: PortWithTrades): void {
        const node$ = $(event.currentTarget as JQuery.PlainObject)
            .tooltip("dispose")
            .tooltip({
                html: true,
                placement: "auto",
                trigger: "manual",
                title: "Wait...",
                sanitize: false,
            })
        // Inject tooltip text
        node$.on("inserted.bs.tooltip", () => {
            const tooltipInner = $(document.body).find(".tooltip").find(".tooltip-inner")[0]
            tooltipInner.textContent = ""
            render(this._tooltipData(this._getText(d)), tooltipInner)
            node$.tooltip("update")
        })
        node$.tooltip("show")

        if (this.map.showTrades.show) {
            if (this.map.showTrades.listType !== "inventory") {
                this.map.showTrades.listType = "inventory"
            }

            this.map.showTrades.update(this._getInventory(d))
        }

        /*
        const body = document.querySelector("body")
        const div = document.createElement("div")
        body?.appendChild(div)
        render(this._tooltipData(this._getText(d)), div)
        */
    }

    _updateIcons(): void {
        const circleScale = 2 ** Math.log2(Math.abs(this.#minScale) + this.#scale)
        const circleSize = roundToThousands(this.#circleSize / circleScale)
        const data = this.#portDataFiltered

        this.#gIcon
            .selectAll<SVGCircleElement, PortWithTrades>("circle")
            .data(data, (d) => String(d.id))
            .join((enter) =>
                enter
                    .append("circle")
                    .attr("fill", (d) => {
                        const appendix = `${d.countyCapital && d.capturable ? "c" : ""}${
                            d.availableForAll && d.nation !== "NT" ? "a" : ""
                        }`
                        return `url(#${d.nation}${appendix})`
                    })
                    .attr("cx", (d) => d.coordinates[0])
                    .attr("cy", (d) => d.coordinates[1])
                    .on("click", (event: Event, d: PortWithTrades) => {
                        this._showDetails(event, d)
                    })
                    .on("mouseleave", DisplayPorts._hideDetails)
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
        } else if (port.attackerNation === "Neutral") {
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
        const circleScale = 2 ** Math.log2(Math.abs(this.#minScale) + this.#scale)
        const rMin = roundToThousands((this.#circleSize / circleScale) * this.#minRadiusFactor)
        const rMax = roundToThousands((this.#circleSize / circleScale) * this.#maxRadiusFactor)
        let data = this.#portDataFiltered
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let cssClass: PortCircleStringF = () => ""
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let r: PortCircleNumberF = () => 0
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let fill: PortCircleStringF = () => ""

        // noinspection IfStatementWithTooManyBranchesJS
        if (this.showRadius === "tax") {
            data = this.#portDataFiltered.filter((d) => d.capturable)
            this.#portRadius.domain([this.#minTaxIncome, this.#maxTaxIncome]).range([rMin, rMax])
            cssClass = (): string => "bubble"
            fill = (d): string => this.#colourScaleTax(d.taxIncome) ?? ""
            r = (d): number => this.#portRadius(d.taxIncome) ?? 0
        } else if (this.showRadius === "net") {
            data = this.#portDataFiltered.filter((d) => d.capturable)
            this.#portRadius.domain([this.#minNetIncome, this.#maxNetIncome]).range([rMin, rMax])
            cssClass = (): string => "bubble"
            fill = (d): string => this.#colourScaleNet(d.netIncome) ?? ""
            r = (d): number => this.#portRadius(Math.abs(d.netIncome)) ?? 0
        } else if (this.showRadius === "points") {
            data = this.#portDataFiltered.filter((d) => d.capturable)
            this.#portRadius.domain([this.#minPortPoints, this.#maxPortPoints]).range([rMin, rMax / 2])
            cssClass = (): string => "bubble"
            fill = (d): string => this.#colourScalePoints(d.portPoints) ?? ""
            r = (d): number => this.#portRadius(d.portPoints) ?? 0
        } else if (this.showRadius === "position") {
            cssClass = (): string => "bubble here"
            r = (d): number => d.distance
        } else if (this.showRadius === "attack") {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            data = this.#portDataFiltered.filter((port) => port.attackHostility || port.cooldownTime)
            this.#attackRadius.range([rMin, rMax / 1.5])
            cssClass = (d): string => `bubble ${this._getAttackMarker(d)}`
            fill = (d): string =>
                d.attackerNation === "Neutral" ? "" : this.#colourScaleHostility(d.attackHostility ?? 0) ?? ""
            r = (d): number => this.#attackRadius(d.attackHostility ?? (d.cooldownTime ? 0.2 : 0)) ?? 0
        } else if (this.circleType === "currentGood") {
            cssClass = (d): string => `bubble ${d.isSource ? "pos" : "neg"}`
            r = (): number => rMax / 2
        } else if (this.showRadius === "county") {
            cssClass = (d): string =>
                d.capturable ? (d.countyCapital ? "bubble capital" : "bubble non-capital") : "bubble not-capturable"
            fill = (d): string => (d.capturable ? this.#colourScaleCounty(d.county) : "")
            r = (d): number => (d.capturable ? rMax / 2 : rMax / 3)
        } else if (this.showRadius === "tradePorts") {
            cssClass = (d): string => `bubble ${this._getTradePortMarker(d)}`
            r = (d): number => (d.id === this.tradePortId ? rMax : rMax / 2)
        } else if (this.showRadius === "frontline") {
            cssClass = (d): string => `bubble ${this._getFrontlineMarker(d)}`
            r = (d): number => (d.ownPort ? rMax / 3 : rMax / 2)
            data = data.filter((d) => d.enemyPort ?? d.ownPort)
        } else if (this.showRadius === "currentGood") {
            cssClass = (d): string => `bubble ${d.isSource ? "pos" : "neg"}`
            r = (): number => rMax / 2
        } else if (this.showRadius === "off") {
            data = []
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
            ? d.coordinates[0] + Math.round(circleSize * 1.2 * Math.cos(degreesToRadians(d.angle)))
            : d.coordinates[0]
    }

    _updateTextsY(d: PortWithTrades, circleSize: number, fontSize: number): number {
        const deltaY = circleSize + fontSize * 1.2

        if (this.zoomLevel !== "pbZone") {
            return d.coordinates[1] + deltaY
        }

        const dy = d.angle > 90 && d.angle < 270 ? fontSize : 0
        return this.#showPBZones === "all" || (this.#showPBZones === "single" && d.id === this.currentPort.id)
            ? d.coordinates[1] + Math.round(circleSize * 1.2 * Math.sin(degreesToRadians(d.angle))) + dy
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
            const circleScale = 2 ** Math.log2(Math.abs(this.#minScale) + this.#scale)
            const circleSize = roundToThousands(this.#circleSize / circleScale)
            const fontScale = 2 ** Math.log2((Math.abs(this.#minScale) + this.#scale) * 0.9)
            const fontSize = roundToThousands(this.#fontSize / fontScale)
            const data = this.#portDataFiltered

            this.#gText
                .selectAll<SVGTextElement, PortWithTrades>("text")
                .data(data, (d) => String(d.id))
                .join((enter) => enter.append("text").text((d) => d.name))
                .attr("x", (d) => this._updateTextsX(d, circleSize))
                .attr("y", (d) => this._updateTextsY(d, circleSize, fontSize))
                .attr("text-anchor", (d) => this._updateTextsAnchor(d))

            this.#gText.attr("font-size", `${fontSize}px`).classed("d-none", false)
        }
    }

    _updateSummary(): void {
        const numberPorts = Object.keys(this.portData).length
        let taxTotal = 0
        let netTotal = 0

        if (numberPorts) {
            taxTotal = d3Sum(this.portData, (d) => d.taxIncome)
            netTotal = d3Sum(this.portData, (d) => d.netIncome)
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
            this.#portDataFiltered = this.portData
        } else {
            this.#portDataFiltered = this.portData.filter(
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
     * @param lowerBound - Top left coordinates of current viewport
     * @param upperBound - Bottom right coordinates of current viewport
     */
    setBounds(lowerBound: Bound, upperBound: Bound): void {
        this.#lowerBound = lowerBound
        this.#upperBound = upperBound
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
        this.portData = this.portDataDefault
        this.circleType = ""
        this.setShowRadiusSetting()
        this.update(scale)
    }
}
