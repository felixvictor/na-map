import "bootstrap/js/dist/collapse"

import { select as d3Select, Selection } from "d3-selection"

import { formatInt, formatSiCurrency, formatSiInt } from "common/common-format"

import { addDes, addInfo, baseId, getId, headId, hideElem, numTrades, showElem } from "./common"

import { Trade } from "common/gen-json"
import { HtmlString } from "common/interface"

import TradeData from "./trade-data"

export default class List {
    #cardId = `${baseId}-card`
    #listDiv = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #listType = "tradeList"
    #tradeDetailsDiv = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #tradeDetailsHead = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #tradeData = {} as TradeData

    constructor() {
        this.#setupSvg()
    }

    get listType(): string {
        return this.#listType
    }

    set listType(type: string) {
        this.#listType = type

        switch (this.#listType) {
            case "inventory":
                this.#tradeData.emptyLinkDataFiltered()
                hideElem(this.#tradeDetailsHead)
                this.#listDiv.remove()
                this.#listDiv = this.#tradeDetailsDiv.append("div").attr("class", "small p-2")
                break
            case "portList":
                this.#tradeData.emptyLinkDataFiltered()
                hideElem(this.#tradeDetailsHead)
                this.#listDiv.remove()
                this.#listDiv = this.#tradeDetailsDiv.append("div").attr("class", "small p-2")
                break
            default:
                this.#tradeData.resetData()
                showElem(this.#tradeDetailsHead)
                this.#listDiv.remove()
                this.#listDiv = this.#tradeDetailsDiv.append("div").attr("class", "trade-list small")
                break
        }
    }

    get tradeDetailsDiv(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#tradeDetailsDiv
    }

    set tradeData(tradeData: TradeData) {
        this.#tradeData = tradeData
    }

    #setupSvg() {
        this.#tradeDetailsDiv = d3Select<HTMLDivElement, unknown>("main #summary-column")
            .append("div")
            .attr("id", baseId)
            .attr("class", "trade-details")
        this.#tradeDetailsHead = this.#tradeDetailsDiv.append("div").attr("id", headId).attr("class", "px-2")

        this.#tradeDetailsHead
            .append("button")
            .attr("type", "button")
            .attr("class", "btn btn-small btn-outline-light my-2")
            .attr("data-bs-toggle", "collapse")
            .attr("data-bs-target", `#${this.#cardId}`)
            .attr("aria-expanded", "false")
            .text("Info")
        this.#tradeDetailsHead
            .append("div")
            .attr("id", this.#cardId)
            .attr("class", "collapse")
            .append("div")
            .attr("class", "card card-body small mx-n2 px-2")
            .text(
                "Trade data is static (snapshot taken during maintenance). " +
                    "Therefore, price and/or quantity may not be available anymore. " +
                    "Data is limited as buy and sell prices at a certain port are " +
                    "only known when this port has this good in its inventory or " +
                    "a buy/sell contract. " +
                    "Better sell ports may be found using the in-game trader tool."
            )

        this.#listDiv = this.#tradeDetailsDiv.append("div").attr("class", "trade-list small")
    }

    #updateInventory(inventory?: string): void {
        this.#listDiv.html(inventory ?? "")
    }

    #updatePortList(portList?: string): void {
        this.#listDiv.html(portList ?? "")
    }

    #getTradeLimitedData(trade: Trade): HtmlString {
        const weight = trade.weightPerItem * trade.quantity

        let h = "" as HtmlString
        h += addInfo(`${formatInt(trade.quantity)} ${this.#tradeData.getItemName(trade.good)}`) + addDes("trade")
        h += addInfo(`${formatSiCurrency(trade.profit ?? 0)}`) + addDes(this.#tradeData.profitText)
        h += addInfo(`${formatSiInt(weight)} ${weight === 1 ? "ton" : "tons"}`) + addDes("weight")
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
            ) + addDes(`to ${this.#tradeData.getPortDepth(trade.target.id)}`)
        h += addInfo(`${formatSiInt(trade.distance)}`) + addDes("sail distance")

        return h
    }

    #updateTradeList(isInventorySelected: boolean): void {
        const data = isInventorySelected ? [] : this.#tradeData.data.slice(0, numTrades)
        let highlightLink: Selection<SVGPathElement, unknown, HTMLElement, unknown>

        const highlightOn = (element: HTMLDivElement, _event: Event, d: Trade): void => {
            d3Select(element).classed("opacity-75", true)
            highlightLink = d3Select<SVGPathElement, unknown>(`path#${getId(d)}`).attr("class", "highlight")
            highlightLink.dispatch("click")
        }

        const highlightOff = (element: HTMLDivElement): void => {
            d3Select(element).classed("opacity-75", false)
            highlightLink.classed("highlight", false)
            highlightLink.dispatch("mouseleave")
        }

        this.#listDiv
            .selectAll<HTMLDivElement, Trade>("div.block")
            .data(data, (d) => getId(d))
            .join((enter) =>
                enter
                    .append("div")
                    .attr("class", "block px-2")
                    .on("mouseenter", function (this: HTMLDivElement, event: Event, d: Trade) {
                        highlightOn(this, event, d)
                    })
                    .on("mouseleave", function (this: HTMLDivElement) {
                        highlightOff(this)
                    })
            )
            .html((d) => this.#getTradeLimitedData(d))
    }

    update(isInventorySelected: boolean, info?: string): void {
        switch (this.#listType) {
            case "inventory":
                this.#updateInventory(info)
                break
            case "portList":
                this.#updatePortList(info)
                break
            default:
                this.#updateTradeList(isInventorySelected)
                break
        }
    }
}
