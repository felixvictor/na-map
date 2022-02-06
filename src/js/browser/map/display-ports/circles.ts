import { max as d3Max, min as d3Min } from "d3-array"
import { interpolateHcl as d3InterpolateHcl } from "d3-interpolate"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"

import { colourGreenDark, colourLight, colourRedDark } from "common/common-browser"
import { defaultCircleSize, roundToThousands, ϕ } from "common/common-math"
import { colourScaleCounty } from "./map-data"

import { PortWithTrades } from "common/gen-json"
import { SVGGDatum } from "common/interface"
import { maxScale, maxTileScale, minScale } from "common/common-var"

type PortCircleStringF = (d: PortWithTrades) => string
type PortCircleNumberF = (d: PortWithTrades) => number

export default class PortCircles {
    #attackRadius = {} as ScaleLinear<number, number>
    #colourScaleHostility = {} as ScaleLinear<string, string>
    #colourScaleNet = {} as ScaleLinear<string, string>
    #colourScalePoints = {} as ScaleLinear<string, string>
    #colourScaleTax = {} as ScaleLinear<string, string>
    #gPortCircle = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #maxNetIncome = 0
    #maxPortPoints = 0
    #maxTaxIncome = 0
    #minNetIncome = 0
    #minPortPoints = 0
    #minTaxIncome = 0
    #portData = [] as PortWithTrades[]
    #portRadius = {} as ScaleLinear<number, number>
    #radiusScale = {} as ScaleLinear<number, number>
    #scale = 1
    #showRadius = ""
    #tradePortId = 0

    readonly #incomeThreshold = 100_000
    readonly #maxRadiusFactor = ϕ * 4
    readonly #minRadiusFactor = ϕ
    readonly #portPointThreshold = 30

    constructor(portData: PortWithTrades[]) {
        this.#setupSVG()
        this.#setupScales(portData)
    }

    #setupSVG() {
        this.#gPortCircle = d3Select<SVGGElement, SVGGDatum>("#ports")
            .append<SVGGElement>("g")
            .attr("data-ui-component", "port-circles")
    }

    #setupScales(portData: PortWithTrades[]): void {
        this.#portRadius = d3ScaleLinear()
        this.#attackRadius = d3ScaleLinear().domain([0, 1])

        this.#colourScaleHostility = d3ScaleLinear<string, string>()
            .domain([0, 1])
            .range([colourLight, colourRedDark])
            .interpolate(d3InterpolateHcl)

        this.#minTaxIncome = d3Min(portData, (d) => d.taxIncome) ?? 0
        this.#maxTaxIncome = d3Max(portData, (d) => d.taxIncome) ?? 0
        this.#colourScaleTax = d3ScaleLinear<string, string>()
            .domain([this.#minTaxIncome, this.#maxTaxIncome])
            .range([colourLight, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.#minNetIncome = d3Min(portData, (d) => d.netIncome) ?? 0
        this.#maxNetIncome = d3Max(portData, (d) => d.netIncome) ?? 0
        this.#colourScaleNet = d3ScaleLinear<string, string>()
            .domain([this.#minNetIncome, 0, this.#maxNetIncome])
            .range([colourRedDark, colourLight, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.#minPortPoints = d3Min(portData, (d) => d.portPoints) ?? 0
        this.#maxPortPoints = d3Max(portData, (d) => d.portPoints) ?? 0
        this.#colourScalePoints = d3ScaleLinear<string, string>()
            .domain([this.#minPortPoints, this.#maxPortPoints])
            .range([colourLight, colourGreenDark])
            .interpolate(d3InterpolateHcl)

        this.#radiusScale = d3ScaleLinear()
            .range([defaultCircleSize, defaultCircleSize >> 2, defaultCircleSize >> 5])
            .domain([Math.log2(minScale), Math.log2(maxTileScale) - 1, Math.log2(maxScale)])
    }

    #getTradePortMarker(port: PortWithTrades): string {
        let marker = ""
        if (port.id === this.#tradePortId) {
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

    static #getAttackMarker(port: PortWithTrades): string {
        let marker = ""
        if (port.cooldownTime) {
            marker = "cooldown"
        } else if (port.attackerNation === "NT") {
            marker = "raider"
        }

        return marker
    }

    static #getFrontlineMarker(port: PortWithTrades): string {
        let marker = ""
        if (port.ownPort) {
            marker = "pos"
        } else if (port.enemyPort) {
            marker = "neg"
        }

        return marker
    }

    #getData() {
        const scaledCircleSize = this.#radiusScale(Math.log2(this.#scale))
        const rMin = roundToThousands(scaledCircleSize * this.#minRadiusFactor)
        const rMax = roundToThousands(scaledCircleSize * this.#maxRadiusFactor)

        let data = this.#portData
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let cssClass: PortCircleStringF = () => ""
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let r: PortCircleNumberF = () => 0
        // eslint-disable-next-line unicorn/consistent-function-scoping
        let fill: PortCircleStringF = () => ""

        // noinspection IfStatementWithTooManyBranchesJS
        switch (this.#showRadius) {
            case "tax":
                data = this.#portData.filter((d) => d.capturable && d.taxIncome > this.#incomeThreshold)
                this.#portRadius.domain([this.#minTaxIncome, this.#maxTaxIncome]).range([rMin, rMax])
                cssClass = (): string => "bubble"
                fill = (d): string => this.#colourScaleTax(d.taxIncome) ?? ""
                r = (d): number => this.#portRadius(d.taxIncome) ?? 0

                break

            case "net":
                data = this.#portData.filter((d) => d.capturable && Math.abs(d.netIncome) > this.#incomeThreshold)
                this.#portRadius.domain([this.#minNetIncome, this.#maxNetIncome]).range([rMin, rMax])
                cssClass = (): string => "bubble"
                fill = (d): string => this.#colourScaleNet(d.netIncome) ?? ""
                r = (d): number => this.#portRadius(Math.abs(d.netIncome)) ?? 0

                break

            case "points":
                data = this.#portData.filter((d) => d.capturable && d.portPoints > this.#portPointThreshold)
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
                data = this.#portData.filter((port) => port.attackHostility || port.cooldownTime)
                this.#attackRadius.range([rMin, rMax / 1.5])
                cssClass = (d): string => `bubble ${PortCircles.#getAttackMarker(d)}`
                fill = (d): string =>
                    d.attackerNation === "NT" ? "" : this.#colourScaleHostility(d.attackHostility ?? 0) ?? ""
                r = (d): number => this.#attackRadius(d.attackHostility ?? (d.cooldownTime ? 0.2 : 0)) ?? 0

                break

            default:
                switch (this.#showRadius) {
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
                        cssClass = (d): string => `bubble ${this.#getTradePortMarker(d)}`
                        r = (d): number => (d.id === this.#tradePortId ? rMax : rMax / 2)

                        break

                    case "frontline":
                        cssClass = (d): string => `bubble ${PortCircles.#getFrontlineMarker(d)}`
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
        return { data, cssClass, r, fill }
    }

    #updateJoin() {
        const { data, cssClass, r, fill } = this.#getData()

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

    update(scale: number, portDataFiltered: PortWithTrades[], showRadius: string, tradePortId: number): void {
        this.#scale = scale
        this.#portData = portDataFiltered
        this.#showRadius = showRadius
        this.#tradePortId = tradePortId

        this.#updateJoin()
    }
}
