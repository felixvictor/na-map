import { default as BSTooltip } from "bootstrap/js/dist/tooltip"

import { extent as d3Extent } from "d3-array"
import { scaleLinear as d3ScaleLinear, scalePoint as d3ScalePoint } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"

import { formatInt, formatSiCurrency, formatSiInt } from "common/common-format"
import { minMapScale } from "common/common-var"
import { Coordinate } from "common/common-math"

import {
    addDes,
    addInfo,
    endBlock,
    getId,
    getProfitPerDistance,
    getProfitPerWeight,
    numTrades,
    startBlock,
} from "./common"

import { Trade } from "common/gen-json"
import { HtmlString } from "common/interface"

import TradeData from "./trade-data"

export default class Graphs {
    #arrowX = 18
    #arrowY = 18
    #g = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #scale = minMapScale
    #tooltipElement: Element | undefined
    #tradeData = {} as TradeData

    constructor() {
        this.#setupSvg()
    }

    set tradeData(tradeData: TradeData) {
        this.#tradeData = tradeData
    }

    #setupSvg() {
        this.#g = d3Select<SVGGElement, unknown>("#map").insert("g", "g.pb").attr("class", "trades")

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "trade-arrow")
            .attr("refX", this.#arrowX)
            .attr("refY", this.#arrowY / 2)
            .attr("markerWidth", 20)
            .attr("markerHeight", 20)
            .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", `M0,0L0,${this.#arrowY}L${this.#arrowX},${this.#arrowY / 2}z`)
            .attr("class", "trade-arrow-head")
    }

    #getTradeFullData(trade: Trade): HtmlString {
        const weight = trade.weightPerItem * trade.quantity
        const profitPerItem = trade.target.grossPrice - trade.source.grossPrice
        const profitPerDistance = getProfitPerDistance(trade)
        const profitPerWeight = getProfitPerWeight(trade)

        let h = "" as HtmlString

        h += startBlock("Trade")
        h += addInfo(`${formatInt(trade.quantity)} ${this.#tradeData.getItemName(trade.good)}`) + addDes("good")
        h += addInfo(`${formatSiCurrency(trade.source.grossPrice)}`) + addDes("gross buy price")
        h += addInfo(`${formatSiCurrency(trade.target.grossPrice)}`) + addDes("gross sell price")
        h += addInfo(`${formatSiInt(weight)} ${weight === 1 ? "ton" : "tons"}`) + addDes("weight")
        h += endBlock()

        h += startBlock("Profit")
        h += addInfo(`${formatSiCurrency(trade.profitTotal)}`) + addDes("total")
        h += addInfo(`${formatSiCurrency(profitPerItem)}`) + addDes("profit/item")
        h += addInfo(`${formatSiCurrency(profitPerDistance)}`) + addDes("profit/distance")
        h += addInfo(`${formatSiCurrency(profitPerWeight)}`) + addDes("profit/weight")
        h += endBlock()

        h += startBlock("Route")
        h +=
            addInfo(
                `${this.#tradeData.getPortName(trade.source.id)} <span class="flag-icon-${this.#tradeData.getPortNation(
                    trade.source.id
                )} flag-icon-small me-1" role="img"></span>`
            ) + addDes(`from ${this.#tradeData.getPortDepth(trade.source.id)}`)
        h +=
            addInfo(
                `${this.#tradeData.getPortName(trade.target.id)} <span class="flag-icon-${this.#tradeData.getPortNation(
                    trade.target.id
                )} flag-icon-small me-1" role="img"></span>`
            ) + addDes(`to ${this.#tradeData.getPortDepth(trade.source.id)}`)
        h += addInfo(`${formatSiInt(trade.distance)}`) + addDes("distance")
        h += endBlock()

        return h
    }

    #getSiblingLinks(sourceId: number, targetId: number): number[] {
        return this.#tradeData.data
            .filter(
                (link) =>
                    (link.source.id === sourceId && link.target.id === targetId) ||
                    (link.source.id === targetId && link.target.id === sourceId)
            )
            .map((link) => link.profit ?? 0)
    }

    #showDetails(event: Event, d: Trade): void {
        this.#tooltipElement = event.currentTarget as Element

        new BSTooltip(this.#tooltipElement, {
            html: true,
            placement: "auto",
            template:
                '<div class="tooltip" role="tooltip">' +
                '<div class="tooltip-block tooltip-inner tooltip-inner-small">' +
                "</div></div>",
            trigger: "manual",
            title: this.#getTradeFullData(d),
            sanitize: false,
        }).show()
    }

    #hideDetails(event: Event | undefined): void {
        const element = event ? event.currentTarget : this.#tooltipElement
        const tooltip = BSTooltip.getInstance(element as Element)

        if (tooltip) {
            tooltip.dispose()
        }

        this.#tooltipElement = undefined
    }

    #getCoord(id: number): Coordinate {
        return { x: this.#tradeData.getPortXCoord(id), y: this.#tradeData.getPortYCoord(id) }
    }

    #arcPath(leftHand: boolean, d: Trade): string {
        const source = this.#getCoord(d.source.id)
        const target = this.#getCoord(d.target.id)
        const x1 = leftHand ? source.x : target.x
        const y1 = leftHand ? source.y : target.y
        const x2 = leftHand ? target.x : source.x
        const y2 = leftHand ? target.y : source.y

        let dr = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        const xRotation = 0
        const largeArc = 0
        const sweep = leftHand ? 0 : 1
        const siblings = this.#getSiblingLinks(d.source.id, d.target.id)
        if (siblings.length > 1) {
            const arcScale = d3ScalePoint<number>().domain(siblings).range([1, siblings.length])
            dr /= 1 + (1 / siblings.length) * (arcScale(d.profit ?? 0) ?? 0 - 1)
        }

        dr = Math.round(dr)

        return `M${x1},${y1}A${dr},${dr} ${xRotation},${largeArc},${sweep} ${x2},${y2}`
    }

    #isPortWest(d: Trade) {
        return this.#tradeData.getPortXCoord(d.source.id) < this.#tradeData.getPortXCoord(d.target.id)
    }

    /**
     * {@link https://bl.ocks.org/mattkohl/146d301c0fc20d89d85880df537de7b0}
     */
    #updateJoin(isInventorySelected: boolean): void {
        const data = isInventorySelected ? [] : this.#tradeData.data.slice(0, numTrades)
        const extent = d3Extent(data, (d: Trade): number => d.profit ?? 0) as number[]
        const linkWidthScale = d3ScaleLinear()
            .range([5 / this.#scale, 15 / this.#scale])
            .domain(extent)

        this.#g
            .selectAll<SVGPathElement, Trade>(".trade-link")
            .data(data, (d) => getId(d))
            .join((enter) =>
                enter
                    .append("path")
                    .attr("class", "trade-link")
                    .attr("marker-start", (d) => (this.#isPortWest(d) ? "" : "url(#trade-arrow)"))
                    .attr("marker-end", (d) => (this.#isPortWest(d) ? "url(#trade-arrow)" : ""))
                    .attr("id", (d) => getId(d))
                    .on("click", (event: Event, d: Trade) => {
                        this.#showDetails(event, d)
                    })
                    .on("mouseleave", (event: Event) => {
                        this.#hideDetails(event)
                    })
            )
            .attr("d", (d) => this.#arcPath(this.#isPortWest(d), d))
            .attr("stroke-width", (d) => `${linkWidthScale(d.profit ?? 0) ?? 0}px`)
    }

    update(isInventorySelected: boolean, scale: number) {
        this.#scale = scale

        this.#hideDetails(undefined)
        this.#updateJoin(isInventorySelected)
    }
}
