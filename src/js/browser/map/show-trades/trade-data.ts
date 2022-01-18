import { select as d3Select } from "d3-selection"

import { loadJsonFile } from "common/common-browser"
import { nations, PortBattleNationShortName } from "common/common"
import { mapSize } from "common/common-var"

import Cookie from "util/cookie"
import RadioButton from "util/radio-button"

import Select, { SelectOptions } from "util/select"
import { PortBasic, PortBattlePerServer, PortWithTrades, Trade, TradeItem } from "common/gen-json"
import { Extent, Point } from "common/common-math"
import { HtmlString } from "common/interface"

import { getProfitPerDistance, getProfitPerWeight, headId, NodeData } from "./common"

export default class TradeData {
    #linkDataDefault = [] as Trade[]
    #linkDataFiltered = [] as Trade[]
    #lowerBound = [0, 0] as Point
    #nodeData = new Map<number, NodeData>()
    #portData = [] as PortWithTrades[]
    #portIdBySelectedNations = new Set<number>()
    #portIdVisiblePorts = new Set<number>()
    #profitText = ""
    #profitValue: string
    #selectNation = {} as Select
    #serverName: string
    #tradeItem = new Map<number, string>()
    #upperBound = [mapSize, mapSize] as Point
    readonly #baseId = "show-trades"
    readonly #profitCookie: Cookie
    readonly #profitId = `${this.#baseId}-profit`
    readonly #profitRadioValues = ["weight", "distance", "total"] // Possible values for profit radio buttons (first is default value)
    readonly #profitRadios: RadioButton

    constructor(serverName: string) {
        this.#serverName = serverName

        this.#profitCookie = new Cookie({ id: this.#profitId, values: this.#profitRadioValues })
        this.#profitRadios = new RadioButton(this.#profitId, this.#profitRadioValues)

        this.#setupProfitRadios()
        this.#setupSelect()

        this.#profitValue = this.#getCookieProfitValue()
    }

    static getOptions(): HtmlString {
        return `${nations.map((nation) => `<option value="${nation.short}" selected>${nation.name}</option>`).join("")}`
    }

    get linkDataFiltered(): Trade[] {
        return this.#linkDataFiltered
    }

    get profitId(): string {
        return this.#profitId
    }

    get profitText(): string {
        return this.#profitText
    }

    get selectNation$(): JQuery<HTMLSelectElement> {
        return this.#selectNation.select$
    }

    getItemName(itemId: number): string {
        return this.#tradeItem.get(itemId) ?? ""
    }

    getPortName(portId: number): string {
        return this.#nodeData.get(portId)?.name ?? ""
    }

    getPortNation(portId: number): string {
        return this.#nodeData.get(portId)?.nation ?? ""
    }

    getPortDepth(portId: number): string {
        return this.#portIsShallow(portId) ? "(shallow)" : "(deep)"
    }

    getPortXCoord(portId: number): number {
        return this.#nodeData.get(portId)?.x ?? 0
    }

    getPortYCoord(portId: number): number {
        return this.#nodeData.get(portId)?.y ?? 0
    }

    #portIsShallow(portId: number): boolean {
        return this.#nodeData.get(portId)?.isShallow ?? true
    }

    #setupProfitRadios(): void {
        const profitRadioGroup = d3Select(`#${headId}`)
            .append("div")
            .attr("id", this.#profitId)
            .attr("class", "align-self-center radio-group")
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

    #setupSelect(): void {
        const selectOptions: Partial<SelectOptions> = {
            actionsBox: true,
            countSelectedText(amount: number) {
                const text = amount === nations.length ? "All" : String(amount)

                return `${text} nations selected`
            },
            selectedTextFormat: "count > 1",
            title: "Select nations",
            width: "fit",
        }

        this.#selectNation = new Select(this.#baseId, headId, selectOptions, TradeData.getOptions(), true)
        this.#selectNation.selectAll()
    }

    profitValueSelected(): void {
        this.#profitValue = this.#profitRadios.get()

        this.#profitCookie.set(this.#profitValue)

        this.#sortLinkData()
    }

    /**
     * Get profit value from cookie or use default value
     */
    #getCookieProfitValue(): string {
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

    #setupData() {
        this.#nodeData = new Map<number, NodeData>(
            this.#portData.map((port) => [
                port.id,
                {
                    name: port.name,
                    nation: port.nation,
                    isShallow: port.shallow,
                    x: port.coordinates[0],
                    y: port.coordinates[1],
                } as NodeData,
            ])
        )

        this.setBounds()
        this.changeFilter()
    }

    async loadAndSetupData(): Promise<void> {
        await this.#loadData()
        this.#setupData()
    }

    #sortLinkData(): void {
        this.#linkDataFiltered = this.#linkDataFiltered
            .map((trade) => {
                switch (this.#profitValue) {
                    case "weight":
                        trade.profit = getProfitPerWeight(trade)
                        break
                    case "distance":
                        trade.profit = getProfitPerDistance(trade)
                        break
                    case "total":
                        trade.profit = trade.profitTotal
                        break
                    default:
                        throw new Error(`Wrong profit value ${this.#profitValue}`)
                }

                return trade
            })
            .sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0))
    }

    #filterTradesBySelectedNations(): void {
        this.#linkDataFiltered = this.#linkDataFiltered.filter(
            (trade) =>
                this.#portIdBySelectedNations.has(trade.source.id) && this.#portIdBySelectedNations.has(trade.target.id)
        )
    }

    #filterPortsBySelectedNations(): void {
        const selectedNations = new Set((this.#selectNation.getValues() as PortBattleNationShortName[]) ?? [])
        this.#portIdBySelectedNations = new Set(
            this.#portData.filter((port) => selectedNations.has(port.nation)).map((port) => port.id)
        )
    }

    filterTradesByVisiblePorts(): void {
        this.#linkDataFiltered = this.#linkDataFiltered.filter(
            (trade) => this.#portIdVisiblePorts.has(trade.source.id) || this.#portIdVisiblePorts.has(trade.target.id)
        )
    }

    changeFilter(): void {
        this.#linkDataFiltered = this.#linkDataDefault
        this.#filterPortsBySelectedNations()
        this.#filterTradesBySelectedNations()
        this.filterTradesByVisiblePorts()
        this.#sortLinkData()
    }

    emptyLinkDataFiltered() {
        this.#linkDataFiltered = []
    }

    resetLinkData() {
        this.#linkDataFiltered = this.#linkDataDefault
    }

    /**
     * Set bounds of current viewport
     */
    setBounds(viewport?: Extent): void {
        if (viewport) {
            this.#lowerBound = viewport[0]
            this.#upperBound = viewport[1]
        }

        this.#portIdVisiblePorts = new Set(
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
    }

    show() {
        this.#filterTradesBySelectedNations()
    }
}
