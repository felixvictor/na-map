import { default as BSTooltip } from "bootstrap/js/dist/tooltip"

import { extent as d3Extent } from "d3-array"
import { scaleLinear as d3ScaleLinear, scalePoint as d3ScalePoint } from "d3-scale"
import { select as d3Select, Selection } from "d3-selection"

import { formatInt, formatSiCurrency, formatSiInt } from "common/common-format"
import { defaultFontSize, roundToThousands } from "common/common-math"
import { minMapScale } from "common/common-var"

import {
    addDes,
    addInfo,
    endBlock,
    getId,
    getProfitPerDistance,
    getProfitPerWeight,
    PortData,
    startBlock,
} from "./common"

import { PortWithTrades, Trade } from "common/gen-json"
import { HtmlString } from "common/interface"

export default class Graphs {
    #labelG = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    #g = {} as Selection<SVGGElement, unknown, HTMLElement, unknown>
    readonly #minScale = minMapScale
    #scale = minMapScale
    readonly #fontSize = defaultFontSize
    #arrowX = 18
    #arrowY = 18

    #tooltipElement: Element | undefined
    #tradeItem = new Map<number, string>()
    #portData = new Map<number, Partial<PortData>>()

    #linkDataFiltered = [] as Trade[]

    constructor() {
        this.#setupSvg()
    }

    #setupSvg() {
        this.#g = d3Select<SVGGElement, unknown>("#map").insert("g", "g.pb").attr("class", "trades")
        this.#labelG = this.#g.append("g")

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

    setupData(portData: PortWithTrades[], linkDataDefault: Trade[], tradeItem: Map<number, string>): void {
        this.#portData = new Map<number, Partial<PortData>>(
            portData.map((port) => [
                port.id,
                {
                    name: port.name,
                    isShallow: port.shallow,
                    x: port.coordinates[0],
                    y: port.coordinates[1],
                } as Partial<PortData>,
            ])
        )
        this.#tradeItem = tradeItem
    }

    #portIsShallow(portId: number): boolean {
        return this.#portData.get(portId)?.isShallow ?? true
    }

    #getPortDepth(portId: number): string {
        return this.#portIsShallow(portId) ? "(shallow)" : "(deep)"
    }

    #getItemName(itemId: number): string {
        return this.#tradeItem.get(itemId) ?? ""
    }

    #getPortName(portId: number): string {
        return this.#portData.get(portId)?.name ?? ""
    }

    #getPortNation(portId: number): string {
        return this.#portData.get(portId)?.nation ?? ""
    }

    #getPortXCoord(portId: number): number {
        return this.#portData.get(portId)?.x ?? 0
    }

    #getPortYCoord(portId: number): number {
        return this.#portData.get(portId)?.y ?? 0
    }

    #getTradeFullData(trade: Trade): HtmlString {
        const weight = trade.weightPerItem * trade.quantity
        const profitPerItem = trade.target.grossPrice - trade.source.grossPrice
        const profitPerDistance = getProfitPerDistance(trade)
        const profitPerWeight = getProfitPerWeight(trade)

        let h = "" as HtmlString

        h += startBlock("Trade")
        h += addInfo(`${formatInt(trade.quantity)} ${this.#getItemName(trade.good)}`) + addDes("good")
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
                `${this.#getPortName(trade.source.id)} <span class="caps">${this.#getPortNation(
                    trade.source.id
                )}</span>`
            ) + addDes(`from ${this.#getPortDepth(trade.source.id)}`)
        h +=
            addInfo(
                `${this.#getPortName(trade.target.id)} <span class="caps">${this.#getPortNation(
                    trade.target.id
                )}</span>`
            ) + addDes(`to ${this.#getPortDepth(trade.source.id)}`)
        h += addInfo(`${formatSiInt(trade.distance)}`) + addDes("sail distance")
        h += endBlock()

        return h
    }

    #getSiblingLinks(sourceId: number, targetId: number): number[] {
        return this.#linkDataFiltered
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

    #arcPath(leftHand: boolean, d: Trade): string {
        const source = { x: this.#getPortXCoord(d.source.id), y: this.#getPortYCoord(d.source.id) }
        const target = { x: this.#getPortXCoord(d.target.id), y: this.#getPortYCoord(d.target.id) }
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

    /**
     * {@link https://bl.ocks.org/mattkohl/146d301c0fc20d89d85880df537de7b0}
     */
    #updateJoin(data: Trade[]): void {
        const extent = d3Extent(data, (d: Trade): number => d.profit ?? 0) as number[]
        const linkWidthScale = d3ScaleLinear()
            .range([5 / this.#scale, 15 / this.#scale])
            .domain(extent)
        const fontScale = 2 ** Math.log2(Math.abs(this.#minScale) + this.#scale)
        const fontSize = roundToThousands(this.#fontSize / fontScale)

        this.#g
            .selectAll<SVGPathElement, Trade>(".trade-link")
            .data(data, (d) => getId(d))
            .join((enter) =>
                enter
                    .append("path")
                    .attr("class", "trade-link")
                    .attr("marker-start", (d) =>
                        this.#getPortXCoord(d.source.id) < this.#getPortXCoord(d.target.id) ? "" : "url(#trade-arrow)"
                    )
                    .attr("marker-end", (d) =>
                        this.#getPortXCoord(d.source.id) < this.#getPortXCoord(d.target.id) ? "url(#trade-arrow)" : ""
                    )
                    .attr("id", (d) => getId(d))
                    .on("click", (event: Event, d: Trade) => {
                        this.#showDetails(event, d)
                    })
                    .on("mouseleave", (event: Event) => {
                        this.#hideDetails(event)
                    })
            )
            .attr("d", (d) => this.#arcPath(this.#getPortXCoord(d.source.id) < this.#getPortXCoord(d.target.id), d))
            .attr("stroke-width", (d) => `${linkWidthScale(d.profit ?? 0) ?? 0}px`)

        this.#labelG.attr("font-size", `${fontSize}px`)

        this.#labelG
            .selectAll<SVGTextElement, Trade>(".trade-label")
            .data(data, (d) => getId(d))
            .join((enter) =>
                enter
                    .append("text")
                    .attr("class", "trade-label")
                    .append("textPath")
                    .attr("startOffset", "15%")
                    .attr("xlink:href", (d) => `#${getId(d)}`)
                    .text((d) => `${formatInt(d.quantity)} ${this.#getItemName(d.good)}`)
            )
            .attr("dy", (d) => `-${linkWidthScale(d.profit ?? 0) / 1.8}px`)
    }

    update(linkDataFiltered: Trade[], scale: number) {
        this.#linkDataFiltered = linkDataFiltered
        this.#scale = scale

        this.#hideDetails(undefined)
        this.#updateJoin(linkDataFiltered)
    }
}
