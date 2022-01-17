import { select as d3Select, Selection } from "d3-selection"

import { formatInt, formatSiCurrency, formatSiInt } from "common/common-format"

import { addDes, addInfo, getId, hideElem, PortData, showElem } from "./common"

import { PortWithTrades, Trade } from "common/gen-json"
import { HtmlString } from "common/interface"

export default class List {
    #tradeDetailsDiv = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #tradeDetailsHead = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #list = {} as Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    #listType = "tradeList"
    #linkData = [] as Trade[]
    #linkDataDefault = [] as Trade[]
    #tradeItem = new Map<number, string>()
    #portData = new Map<number, Partial<PortData>>()

    #linkDataFiltered = [] as Trade[]

    #profitText = ""

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
                this.#linkData = []
                hideElem(this.#tradeDetailsHead)
                this.#list.remove()
                this.#list = this.#tradeDetailsDiv.append("div").attr("class", "small p-2")
                break
            case "portList":
                this.#linkData = []
                hideElem(this.#tradeDetailsHead)
                this.#list.remove()
                this.#list = this.#tradeDetailsDiv.append("div").attr("class", "small p-2")
                break
            default:
                this.#linkData = this.#linkDataDefault
                showElem(this.#tradeDetailsHead)
                this.#list.remove()
                this.#list = this.#tradeDetailsDiv.append("div").attr("class", "trade-list small")
                break
        }
    }

    get tradeDetailsDiv(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#tradeDetailsDiv
    }

    get tradeDetailsHead(): Selection<HTMLDivElement, unknown, HTMLElement, unknown> {
        return this.#tradeDetailsHead
    }

    setupData(portData: PortWithTrades[], linkDataDefault: Trade[], tradeItem: Map<number, string>): void {
        this.#portData = new Map<number, Partial<PortData>>(
            portData.map((port) => [
                port.id,
                {
                    name: port.name,
                    nation: port.nation,
                    isShallow: port.shallow,
                } as Partial<PortData>,
            ])
        )

        this.#linkDataDefault = linkDataDefault
        this.#linkData = linkDataDefault
        this.#tradeItem = tradeItem
    }

    #setupSvg() {
        this.#tradeDetailsDiv = d3Select<HTMLDivElement, unknown>("main #summary-column")
            .append("div")
            .attr("id", "trade-details")
            .attr("class", "trade-details")
        this.#tradeDetailsHead = this.#tradeDetailsDiv.append("div")

        this.#list = this.#tradeDetailsDiv.append("div").attr("class", "trade-list small")
    }

    #updateInventory(inventory?: string): void {
        this.#list.html(inventory ?? "")
    }

    #updatePortList(portList?: string): void {
        this.#list.html(portList ?? "")
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

    #portIsShallow(portId: number): boolean {
        return this.#portData.get(portId)?.isShallow ?? true
    }

    #getPortDepth(portId: number): string {
        return this.#portIsShallow(portId) ? "(shallow)" : "(deep)"
    }

    #getTradeLimitedData(trade: Trade): HtmlString {
        const weight = trade.weightPerItem * trade.quantity

        let h = "" as HtmlString
        h += addInfo(`${formatInt(trade.quantity)} ${this.#getItemName(trade.good)}`) + addDes("trade")
        h += addInfo(`${formatSiCurrency(trade.profit ?? 0)}`) + addDes(this.#profitText)
        h += addInfo(`${formatSiInt(weight)} ${weight === 1 ? "ton" : "tons"}`) + addDes("weight")
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
            ) + addDes(`to ${this.#getPortDepth(trade.target.id)}`)
        h += addInfo(`${formatSiInt(trade.distance)}`) + addDes("sail distance")

        return h
    }

    #updateTradeList(): void {
        let highlightLink: Selection<SVGPathElement, unknown, HTMLElement, unknown>

        const highlightOn = (_event: Event, d: Trade): void => {
            highlightLink = d3Select<SVGPathElement, unknown>(`path#${getId(d)}`).attr("class", "highlight")
            highlightLink.dispatch("click")
        }

        const highlightOff = (): void => {
            highlightLink.classed("highlight", false)
            highlightLink.dispatch("mouseleave")
        }

        this.#list
            .selectAll<HTMLDivElement, Trade>("div.block")
            .data(this.#linkDataFiltered, (d) => getId(d))
            .join((enter) =>
                enter.append("div").attr("class", "block").on("mouseenter", highlightOn).on("mouseleave", highlightOff)
            )
            .html((d) => this.#getTradeLimitedData(d))
    }

    update(linkDataFiltered: Trade[] | undefined, profitText: string | undefined, info?: string): void {
        if (linkDataFiltered) {
            this.#linkDataFiltered = linkDataFiltered
        }
        if (profitText) {
            this.#profitText = profitText
        }

        switch (this.#listType) {
            case "inventory":
                this.#updateInventory(info)
                break
            case "portList":
                this.#updatePortList(info)
                break
            default:
                this.#updateTradeList()
                break
        }
    }
}
