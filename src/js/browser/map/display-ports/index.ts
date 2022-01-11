/*!
 * This file is part of na-map.
 *
 * @file      Display ports.
 * @module    map/display-ports
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { min as d3Min, max as d3Max } from "d3-array"
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"

import { colourGreenDark, colourLight, colourRedDark, loadJsonFiles } from "common/common-browser"
import { defaultCircleSize, Extent, Point, roundToThousands, ϕ } from "common/common-math"
import { minMapScale } from "common/common-var"

import { PortBattlePerServer, PortBasic, PortPerServer, PortWithTrades } from "common/gen-json"
import { DataSource, PortJsonData, SVGGDatum, ZoomLevel } from "common/interface"
import { colourScaleCounty } from "./map-data"

import Cookie from "util/cookie"
import RadioButton from "util/radio-button"
import { NAMap } from "../na-map"
import ShowF11 from "../show-f11"

import { Counties } from "./counties"
import { Flags } from "./flags"
import { PatrolZones } from "./patrol-zones"
import { CurrentPort, PortNames } from "./port-names"
import { PortIcons } from "./port-icons"
import { Regions } from "./regions"
import { Summary } from "./summary"

type PortCircleStringF = (d: PortWithTrades) => string
type PortCircleNumberF = (d: PortWithTrades) => number

interface ReadData {
    [index: string]: PortBasic[] | PortPerServer[] | PortBattlePerServer[]
    ports: PortBasic[]
    server: PortPerServer[]
    pb: PortBattlePerServer[]
}

export default class DisplayPorts {
    #attackRadius!: ScaleLinear<number, number>
    #circleType = ""
    #colourScaleHostility!: ScaleLinear<string, string>
    #colourScaleNet!: ScaleLinear<string, string>
    #colourScalePoints!: ScaleLinear<string, string>
    #colourScaleTax!: ScaleLinear<string, string>
    #counties!: Counties
    #gPort = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #gPortCircle = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #lowerBound = {} as Point
    #maxNetIncome!: number
    #maxPortPoints!: number
    #maxTaxIncome!: number
    #minNetIncome!: number
    #minPortPoints!: number
    #minTaxIncome!: number
    #patrolZones!: PatrolZones
    #portData = {} as PortWithTrades[]
    #portDataDefault!: PortWithTrades[]
    #portDataFiltered!: PortWithTrades[]
    portIcons!: PortIcons
    #portNames!: PortNames
    #portRadius!: ScaleLinear<number, number>
    #regions!: Regions
    #scale = 0
    #showCurrentGood = false
    #showRadius = ""
    #showTradePortPartners = false
    #summary!: Summary
    #upperBound = {} as Point
    #zoomLevel: ZoomLevel = "initial"
    readonly #baseId = "show-radius"
    readonly #circleSize = defaultCircleSize
    readonly #cookie: Cookie
    readonly #f11: ShowF11
    readonly #maxRadiusFactor = ϕ * 4
    readonly #minRadiusFactor = ϕ
    readonly #radioButtonValues: string[]
    readonly #radios: RadioButton
    readonly #serverName: string

    constructor(readonly map: NAMap) {
        this.#serverName = this.map.serverName
        this.#scale = minMapScale
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

    async _setupData(data: ReadData): Promise<void> {
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
        this.#summary = new Summary()
        this.portIcons = new PortIcons(this.#serverName, this.map)
        await this.portIcons.loadData()
        this.#portNames = new PortNames()
        this.#counties = new Counties()
        this.#regions = new Regions()
        this.#patrolZones = new PatrolZones(this.#serverName)
        void new Flags()
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

        const readData = {} as ReadData
        readData.ports = (
            await import(/* webpackChunkName: "data-ports" */ "../../../../../lib/gen-generic/ports.json")
        ).default as PortBasic[]
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
        this.#gPortCircle = this.#gPort.append<SVGGElement>("g").attr("data-ui-component", "port-circles")
    }

    _getTradePortMarker(port: PortWithTrades): string {
        let marker = ""
        if (port.id === this.portIcons.tradePort.id) {
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
                            fill = (d): string => (d.capturable ? colourScaleCounty(d.county) : "")
                            r = (d): number => (d.capturable ? rMax / 2 : rMax / 3)

                            break

                        case "tradePorts":
                            cssClass = (d): string => `bubble ${this._getTradePortMarker(d)}`
                            r = (d): number => (d.id === this.portIcons.tradePort.id ? rMax : rMax / 2)

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

    portNamesUpdate() {
        this.#portNames.update(this.zoomLevel, this.#scale, this.#portDataFiltered)
    }

    update(scale?: number): void {
        this.#scale = scale ?? this.#scale

        this._filterVisible()
        this.portIcons.update(this.#scale, this.showRadius, this.#portData)
        this._updatePortCircles()
        this.portNamesUpdate()
        this.#counties.update(this.zoomLevel, this.#lowerBound, this.#upperBound, this.showRadius)
        this.#regions.update(this.zoomLevel, this.#lowerBound, this.#upperBound)
        this.#patrolZones.update(this.zoomLevel)
        this.#summary.update(this.#portData)
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
    }

    /**
     * Set bounds of current viewport
     * @param viewport - Current viewport
     */
    setBounds(viewport: Extent): void {
        this.#lowerBound = viewport[0]
        this.#upperBound = viewport[1]
    }

    setShowRadiusSetting(showRadius = this.#radioButtonValues[0]): void {
        this.showRadius = showRadius
        this.#radios.set(this.showRadius)
        this.#cookie.set(this.showRadius)
    }

    clearMap(scale?: number): void {
        this.#summary.show()
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
        return this.#portNames.currentPort
    }

    set currentPort(newCurrentPort: CurrentPort) {
        this.#portNames.currentPort = newCurrentPort
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

    get showTradePortPartners(): boolean {
        return this.#showCurrentGood
    }

    set showTradePortPartners(newShowTradePortPartners: boolean) {
        this.#showTradePortPartners = newShowTradePortPartners
    }

    get zoomLevel(): ZoomLevel {
        return this.#zoomLevel
    }

    set zoomLevel(newZoomLevel: ZoomLevel) {
        this.#zoomLevel = newZoomLevel
    }
}
