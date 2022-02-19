import { default as BSTooltip } from "bootstrap/js/dist/tooltip"

import { select as d3Select, Selection } from "d3-selection"
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3-scale"
import render from "preact-render-to-string"
import htm from "htm"
import { h, VNode } from "preact"

import { formatInt, formatPercentHtml, formatSiCurrency, formatSiIntHtml } from "common/common-format"
import { capitalizeFirstLetter, findNationByNationShortName, NationShortName, simpleStringSort } from "common/common"
import { getPortBattleTimeHtml, loadJsonFile } from "common/common-browser"
import { displayClanLitHtml } from "common/common-game-tools"
import { defaultCircleSize } from "common/common-math"
import { maxScale, maxTileScale, minScale } from "common/common-var"

import { GoodList, PortWithTrades, TradeGoodProfit, TradeItem } from "common/gen-json"
import { HtmlResult, HtmlString, SVGGDatum } from "common/interface"

import ShowTrades from "../show-trades"

import dayjs from "dayjs"
import "dayjs/locale/en-gb"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import relativeTime from "dayjs/plugin/relativeTime.js"
import utc from "dayjs/plugin/utc.js"

dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale("en-gb")

const html = htm.bind(h)

export interface TradePort {
    id: number
    name: string
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
    tradePortName: string
    goodsToSellInTradePort: Profit
    goodsToBuyInTradePort: Profit
}

export default class PortIcons {
    #gIcon = {} as Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    #radiusScale = {} as ScaleLinear<number, number>
    #showRadius = ""
    #showTrades = {} as ShowTrades
    #tooltip: BSTooltip | undefined = undefined
    #tradeItem = {} as Map<number, TradeItem>
    #tradePort = {} as TradePort
    readonly #serverName: string

    constructor(serverName: string) {
        this.#serverName = serverName

        this.#setupSvg()
        this.#setupScales()
    }

    static #getAppendix(d: PortWithTrades): string {
        const capital = d.nation === "FT" || d.nation === "NT" || d.capturable ? "" : "c"
        const countyCapital = d.countyCapital && d.capturable ? "r" : ""
        const availableForAll = d.availableForAll && d.nation !== "NT" ? "a" : ""

        return capital + countyCapital + availableForAll
    }

    set showTrades(showTrades: ShowTrades) {
        this.#showTrades = showTrades
    }

    getTradeItem(itemId: number): TradeItem | undefined {
        return this.#tradeItem.get(itemId)
    }

    get tradePort(): TradePort {
        return this.#tradePort
    }

    set tradePort(newTradePort: TradePort) {
        this.#tradePort = newTradePort
    }

    async loadData() {
        const tradeItems = await loadJsonFile<TradeItem[]>(`${this.#serverName}-items.json`)
        this.#tradeItem = new Map(tradeItems.map((item) => [item.id, item]))
    }

    #setupSvg() {
        this.#gIcon = d3Select<SVGGElement, SVGGDatum>("#ports")
            .append<SVGGElement>("g")
            .attr("data-ui-component", "port-icons")
            .attr("class", "click-circle")
    }

    #setupScales() {
        this.#radiusScale = d3ScaleLinear()
            .range([defaultCircleSize, defaultCircleSize >> 2, defaultCircleSize >> 5])
            .domain([Math.log2(minScale), Math.log2(maxTileScale) - 1, Math.log2(maxScale)])
    }

    #formatItems(items: GoodList | undefined): string {
        return (
            items
                ?.map((item) => this.#tradeItem.get(item)?.name ?? "")
                .sort(simpleStringSort)
                .join(", ") ?? ""
        )
    }

    static #sortByProfit(a: TradeGoodProfit, b: TradeGoodProfit): number {
        return b.profit.profit - a.profit.profit
    }

    static #sortByProfitPerTon(a: TradeGoodProfit, b: TradeGoodProfit): number {
        return b.profit.profitPerTon - a.profit.profitPerTon
    }

    #formatProfits(profits: TradeGoodProfit[]): HtmlResult {
        return html`${profits
            ?.sort(PortIcons.#sortByProfit)
            ?.map(
                (good, index) =>
                    html`<span style="white-space: nowrap;">${good.name} (${formatSiIntHtml(good.profit.profit)})</span
                        >${index === profits.length - 1 ? html`` : html`, `}`
            )}`
    }

    #formatProfitsPerTon(profits: TradeGoodProfit[]): HtmlResult {
        return html`${profits
            ?.sort(PortIcons.#sortByProfitPerTon)
            ?.map(
                (good, index) =>
                    html`<span style="white-space: nowrap;"
                            >${good.name} (${formatSiIntHtml(good.profit.profitPerTon)})</span
                        >${index === profits.length - 1 ? html`` : html`, `}`
            )}`
    }

    // eslint-disable-next-line complexity
    #getText(portProperties: PortWithTrades): PortForDisplay {
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

        const portBattleST = dayjs.utc(portProperties.portBattle)
        const portBattleLT = dayjs.utc(portProperties.portBattle).local()
        const localTime = portBattleST === portBattleLT ? "" : ` (${portBattleLT.format("H.mm")} local)`

        const cooldownTimeST = dayjs.utc(portProperties.cooldownTime)
        const cooldownTimeLT = dayjs.utc(portProperties.cooldownTime).local()
        const cooldownTimeLocal = cooldownTimeST === cooldownTimeLT ? "" : ` (${cooldownTimeLT.format("H.mm")} local)`
        const portBattleStartTime = getPortBattleTimeHtml(portProperties.portBattleStartTime)
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
            dropsTrading: this.#formatItems(portProperties.dropsTrading),
            consumesTrading: this.#formatItems(portProperties.consumesTrading),
            producesNonTrading: this.#formatItems(portProperties.producesNonTrading),
            dropsNonTrading: this.#formatItems(portProperties.dropsNonTrading),
            tradePortName: this.tradePort.name,
            goodsToSellInTradePort: {
                profit: this.#formatProfits(portProperties.goodsToSellInTradePort),
                profitPerTon: this.#formatProfitsPerTon(portProperties.goodsToSellInTradePort),
            },
            goodsToBuyInTradePort: {
                profit: this.#formatProfits(portProperties.goodsToBuyInTradePort),
                profitPerTon: this.#formatProfitsPerTon(portProperties.goodsToBuyInTradePort),
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

        return port
    }

    #showProfits = (goods: Profit, tradePort: string, tradeDirection: string): HtmlResult => {
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
    #tooltipData(port: PortForDisplay): VNode {
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
                              ? html`<div class="me-3">
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

            ${this.#showRadius === "tradePorts"
                ? html`${this.#showProfits(port.goodsToSellInTradePort, port.tradePortName, "buy")}${this.#showProfits(
                      port.goodsToBuyInTradePort,
                      port.tradePortName,
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

    #getItemName(id: number): string {
        return this.#tradeItem.get(id)?.name ?? ""
    }

    #getInventory(port: PortWithTrades): HtmlString {
        let h: HtmlString = ""
        const buy = port.inventory
            .filter((good) => good.buyQuantity > 0 && good.buyPrice > 0)
            .sort((a, b) => this.#getItemName(a.id).localeCompare(this.#getItemName(b.id)))
            .map((good) => {
                return `${formatInt(good.buyQuantity)} ${this.#getItemName(good.id)} @ ${formatSiCurrency(
                    good.buyPrice
                )}`
            })
            .join("<br>")
        const sell = port.inventory
            .filter((good) => good.sellQuantity > 0 && good.sellPrice > 0)
            .sort((a, b) => this.#getItemName(a.id).localeCompare(this.#getItemName(b.id)))
            .map((good) => {
                return `${formatInt(good.sellQuantity)} ${this.#getItemName(good.id)} @ ${formatSiCurrency(
                    good.sellPrice
                )}`
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

    #hideDetails(): void {
        if (this.#tooltip !== undefined) {
            this.#tooltip.dispose()
            this.#tooltip = undefined
        }
    }

    #showDetails(event: Event, d: PortWithTrades): void {
        const element = event.currentTarget as Element

        this.#hideDetails()
        this.#tooltip = new BSTooltip(element, {
            html: true,
            placement: "auto",
            trigger: "manual",
            title: render(this.#tooltipData(this.#getText(d))),
            sanitize: false,
        })
        this.#tooltip.show()

        if (this.#showTrades.show) {
            if (this.#showTrades.list.listType !== "inventory") {
                this.#showTrades.list.listType = "inventory"
            }

            this.#showTrades.update(this.#getInventory(d))
        }
    }

    update(scale: number, showRadius: string, data: PortWithTrades[]) {
        this.#showRadius = showRadius
        const circleSize = this.#radiusScale(Math.log2(scale))

        this.#gIcon
            .selectAll<SVGCircleElement, PortWithTrades>("circle")
            .data(data, (d) => String(d.id))
            .join((enter) =>
                enter
                    .append("circle")
                    .attr("fill", (d) => `url(#${d.nation}${PortIcons.#getAppendix(d)})`)
                    .attr("cx", (d) => d.coordinates[0])
                    .attr("cy", (d) => d.coordinates[1])
                    .on("click", (event: Event, d: PortWithTrades) => {
                        this.#showDetails(event, d)
                    })
                    .on("mouseleave", () => {
                        this.#hideDetails()
                    })
            )
            .attr("r", circleSize)
    }
}
