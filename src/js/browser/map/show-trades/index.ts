/*
 * This file is part of na-map.
 *
 * @file      Show trades.
 * @module    map-tools/show-trades
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/collapse"

import { ZoomTransform } from "d3-zoom"

import { nations } from "common/common"
import { loadJsonFile } from "common/common-browser"
import { Extent, Point } from "common/common-math"
import { getProfitPerDistance, getProfitPerWeight, hideElem, showElem } from "./common"

import Cookie from "util/cookie"
import RadioButton from "util/radio-button"
import DisplayPorts from "../display-ports"
import SelectPortsSelectInventory from "../select-ports/inventory"
import Select, { SelectOptions } from "util/select"

import Graphs from "./graphs"
import List from "./list"

import { PortBasic, PortBattlePerServer, PortWithTrades, Trade, TradeItem } from "common/gen-json"
import { HtmlString } from "common/interface"

/**
 * Show trades
 */
export default class ShowTrades {
    #graphs: Graphs
    #inventorySelect = {} as SelectPortsSelectInventory
    #isDataLoaded = false
    #linkData = [] as Trade[]
    #linkDataDefault = [] as Trade[]
    #linkDataFiltered = [] as Trade[]
    #lowerBound = {} as Point
    #portData = [] as PortWithTrades[]
    #portDataFiltered = new Set<number>()
    #ports: DisplayPorts
    #profitText = ""
    #profitValue: string
    #scale = 1
    #selectNation = {} as Select
    #tradeItem = new Map<number, string>()
    #upperBound = {} as Point
    list: List
    show: boolean
    readonly #baseId = "show-trades"
    readonly #extent: [Point, Point]
    readonly #numTrades = 30
    readonly #profitCookie: Cookie
    readonly #profitId = "show-trades-profit"
    readonly #profitRadioValues = ["weight", "distance", "total"] // Possible values for profit radio buttons (first is default value)
    readonly #profitRadios: RadioButton
    readonly #serverName: string
    readonly #showCookie: Cookie
    readonly #showId = "show-trades"
    readonly #showRadioValues = ["off", "on"] // Possible values for show trade radio buttons (first is default value)

    readonly #showRadios: RadioButton

    constructor(ports: DisplayPorts, serverName: string, extent: [Point, Point]) {
        this.#ports = ports
        this.#serverName = serverName
        this.#extent = extent

        this.#showCookie = new Cookie({ id: this.#showId, values: this.#showRadioValues })
        this.#showRadios = new RadioButton(this.#showId, this.#showRadioValues)
        this.#profitCookie = new Cookie({ id: this.#profitId, values: this.#profitRadioValues })
        this.#profitRadios = new RadioButton(this.#profitId, this.#profitRadioValues)

        this.show = this.#getShowValue()

        this.list = new List()
        this.#graphs = new Graphs()

        this.#setupSelect()
        this.#setupProfitRadios()
        this.#setupListener()
        this.setBounds(this.#extent)

        this.#inventorySelect = new SelectPortsSelectInventory(ports, this.list)

        this.#profitValue = this.#getProfitValue()
    }

    #getOptions(): HtmlString {
        return `${nations.map((nation) => `<option value="${nation.short}" selected>${nation.name}</option>`).join("")}`
    }

    #setupSelect(): void {
        const selectOptions: Partial<SelectOptions> = {
            actionsBox: true,
            selectedTextFormat: "count > 1",
            countSelectedText(amount: number) {
                const text = amount === nations.length ? "All" : String(amount)

                return `${text} nations selected`
            },
            title: "Select nations",
        }
        const cardId = `${this.#baseId}-card`

        this.#selectNation = new Select(
            this.#baseId,
            this.list.tradeDetailsHead.node()?.id,
            selectOptions,
            this.#getOptions()
        )

        /*************** label??????????????????? */
        this.list.tradeDetailsHead
            .append("button")
            .attr("class", "btn btn-small btn-outline-primary")
            .attr("data-bs-toggle", "collapse")
            .attr("data-bs-target", `#${cardId}`)
            .attr("aria-expanded", "false")
            .text("Info")
        this.list.tradeDetailsHead
            .append("div")
            .attr("id", cardId)
            .attr("class", "collapse")
            .append("div")
            .attr("class", "card card-body small")
            .text(
                "Trade data is static (snapshot taken during maintenance). " +
                    "Therefore, price and/or quantity may not be available anymore. " +
                    "Data is limited as buy and sell prices at a certain port are " +
                    "only known when this port has this good in its inventory or " +
                    "a buy/sell contract. " +
                    "Better sell ports may be found using the in-game trader tool."
            )
    }

    #setupListener(): void {
        document.querySelector(`#${this.#showId}`)?.addEventListener("change", async () => this.#showSelected())
        document.querySelector(`#${this.#profitId}`)?.addEventListener("change", () => {
            this.#profitValueSelected()
        })
        this.#selectNation.select$.on("change", () => {
            this.#nationChanged()
        })
    }

    #setupData(): void {
        this.#linkData = this.#linkDataDefault
        this.list.setupData(this.#portData, this.#linkDataDefault, this.#tradeItem)
        this.#graphs.setupData(this.#portData, this.#linkDataDefault, this.#tradeItem)

        this.#filterPortsBySelectedNations()
    }

    #sortLinkData(): void {
        this.#linkData = this.#linkData
            .map((trade) => {
                let profit = 0
                switch (this.#profitValue) {
                    case "weight":
                        profit = getProfitPerWeight(trade)
                        break
                    case "distance":
                        profit = getProfitPerDistance(trade)
                        break
                    case "total":
                        profit = trade.profitTotal
                        break
                    default:
                        throw new Error(`Wrong profit value ${this.#profitValue}`)
                }

                trade.profit = profit
                return trade
            })
            .sort((a, b) => b.profit ?? 0 - (a.profit ?? 0))
    }

    async showOrHide(): Promise<void> {
        if (this.show) {
            if (this.#isDataLoaded) {
                await this.#loadAndSetupData().then(() => {
                    this.#isDataLoaded = true
                })
            }

            showElem(this.list.tradeDetailsDiv)
            this.#linkData = this.#linkDataDefault
        } else {
            hideElem(this.list.tradeDetailsDiv)
            this.#linkData = []
        }
    }

    async #showSelected(): Promise<void> {
        const show = this.#showRadios.get()
        this.show = show === "on"

        this.#showCookie.set(show)

        await this.showOrHide()
        this.#inventorySelect.show(this.show)
        this.#filterTradesBySelectedNations()
        this.#sortLinkData()
        this.update()
    }

    async #loadData(): Promise<void> {
        const pbData = await loadJsonFile<PortBattlePerServer[]>(`${this.#serverName}-pb.json`)
        const portData = (
            await import(/* webpackChunkName: "data-ports" */ "../../../../../lib/gen-generic/ports.json")
        ).default as PortBasic[]
        // Combine port data with port battle data
        this.#portData = portData.map((port) => {
            const pbPortData = pbData.find((d) => d.id === port.id)
            return { ...port, ...pbPortData } as PortWithTrades
        })

        this.#linkDataDefault = await loadJsonFile<Trade[]>(`${this.#serverName}-trades.json`)

        const tradeItems = await loadJsonFile<TradeItem[]>(`${this.#serverName}-items.json`)
        this.#tradeItem = new Map(tradeItems.map((item) => [item.id, item.name]))
    }

    async #loadAndSetupData(): Promise<void> {
        await this.#loadData()
        this.#setupData()
    }

    #profitValueSelected(): void {
        this.#profitValue = this.#profitRadios.get()

        this.#profitCookie.set(this.#profitValue)

        this.#sortLinkData()
        this.update()
    }

    #nationChanged(): void {
        this.#linkData = this.#linkDataDefault
        this.#filterPortsBySelectedNations()
        this.#filterTradesBySelectedNations()
        this.update()
    }

    #filterTradesByVisiblePorts(): void {
        const portDataFiltered = new Set(
            this.#portData
                .filter(
                    (port) =>
                        port.coordinates[0] >= this.#lowerBound[0] &&
                        port.coordinates[0] <= this.#upperBound[0] &&
                        port.coordinates[1] >= this.#lowerBound[1] &&
                        port.coordinates[1] <= this.#upperBound[1]
                )
                .map((port) => port.id)
        )
        this.#linkDataFiltered = this.#linkData
            .filter((trade) => portDataFiltered.has(trade.source.id) || portDataFiltered.has(trade.target.id))
            .slice(0, this.#numTrades)
    }

    #filterTradesBySelectedNations(): void {
        this.#linkData = this.#linkData
            .filter(
                (trade) => this.#portDataFiltered.has(trade.source.id) && this.#portDataFiltered.has(trade.target.id)
            )
            .slice(0, this.#numTrades)
    }

    #filterPortsBySelectedNations(): void {
        const selectedNations = new Set([this.#selectNation.getValues()]?.map((option) => option) ?? [])
        this.#portDataFiltered = new Set<number>(
            this.#portData.filter((port) => selectedNations.has(port.nation)).map((port) => port.id)
        )

        console.log("selectedNations", selectedNations)
        console.log("portDataFiltered", this.#portDataFiltered)
    }

    /**
     * Get show value from cookie or use default value
     */
    #getShowValue(): boolean {
        const r = this.#showCookie.get()

        this.#showRadios.set(r)

        return r === "on"
    }

    #setupProfitRadios(): void {
        const profitRadioGroup = this.list.tradeDetailsHead
            .append("div")
            .attr("id", this.#profitId)
            .attr("class", "align-self-center radio-group ps-2")
        profitRadioGroup.append("legend").attr("class", "col-form-label").text("Sort net profit by")

        for (const button of this.#profitRadioValues) {
            const id = `${this.#profitId}-${button.replace(/ /g, "")}`

            const div = profitRadioGroup
                .append("div")
                .attr("class", "custom-control custom-radio custom-control-inline")
            div.append("input")
                .attr("id", id)
                .attr("name", this.#profitId)
                .attr("type", "radio")
                .attr("class", "custom-control-input")
                .attr("value", button)

            div.append("label").attr("for", id).attr("class", "custom-control-label").text(button)
        }
    }

    /**
     * Get profit value from cookie or use default value
     */
    #getProfitValue(): string {
        const r = this.#profitCookie.get()

        this.#profitRadios.set(r)

        switch (r) {
            case "weight":
                this.#profitText = "profit/weight"
                break
            case "distance":
                this.#profitText = "profit/distance"
                break
            case "total":
                this.#profitText = "total"
                break
            default:
                throw new Error("Wrong profit value")
        }

        return r
    }

    update(info?: string): void {
        if (this.show) {
            this.#filterTradesByVisiblePorts()
            const data = this.#inventorySelect.isInventorySelected ? [] : this.#linkDataFiltered
            this.list.update(data, this.#profitText, info)
        } else {
            this.#linkDataFiltered = []
        }

        this.#graphs.update(this.#linkDataFiltered, this.#scale)
    }

    /**
     * Set bounds of current viewport
     * @param viewport - Current viewport
     */
    setBounds(viewport: Extent): void {
        this.#lowerBound = viewport[0]
        this.#upperBound = viewport[1]
    }

    transform(transform: ZoomTransform): void {
        this.#scale = transform.k

        this.update()
    }

    clearMap(): void {
        this.list.listType = "tradeList"

        this.#linkData = this.show ? this.#linkDataDefault : []

        this.update()
    }
}
