/*!
 * This file is part of na-map.
 *
 * @file      Show trades.
 * @module    map-tools/show-trades
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/collapse"
import "bootstrap/js/dist/tooltip"

import "bootstrap-select/js/bootstrap-select"
import { extent as d3Extent } from "d3-array"
import { scaleLinear as d3ScaleLinear, scalePoint as d3ScalePoint } from "d3-scale"
import { select as d3Select } from "d3-selection"
import * as d3Zoom from "d3-zoom"

import { nations, putImportError } from "../../common/common"
import { Bound, HtmlString } from "../../common/common-browser"
import { formatInt, formatSiCurrency, formatSiInt } from "../../common/common-format"
import { defaultFontSize, roundToThousands } from "../../common/common-math"
import Cookie from "../util/cookie"
import RadioButton from "../util/radio-button"

import SelectPorts from "../map/select-ports"
import { DivDatum, SVGGDatum, SVGSVGDatum } from "../../common/interface"
import * as d3Selection from "d3-selection"
import { NationShortName, PortBasic, PortBattlePerServer, PortWithTrades, Trade } from "../../common/gen-json"

interface Node {
    name: string
    nation: NationShortName
    isShallow: boolean
    x: number
    y: number
}

/**
 * Show trades
 */
export default class ShowTrades {
    show: boolean
    private readonly _serverName: string
    private readonly _portSelect: SelectPorts
    private _isDataLoaded: boolean
    private readonly _minScale: number
    private _scale: number
    private readonly _fontSize: number
    private readonly _numTrades: number
    private readonly _arrowX: number
    private readonly _arrowY: number
    private readonly _baseId: HtmlString
    private readonly _nationSelectId: HtmlString
    private _listType: string
    private readonly _showId: HtmlString
    private readonly _showRadioValues: string[]
    private readonly _showCookie: Cookie
    private readonly _showRadios: RadioButton
    private readonly _profitId: HtmlString
    private readonly _profitRadioValues: string[]
    private readonly _profitCookie: Cookie
    private readonly _profitRadios: RadioButton
    private _profitValue: string
    private _lowerBound!: Bound
    private _upperBound!: Bound
    private _profitText!: string

    private _g!: d3Selection.Selection<SVGGElement, SVGGDatum, HTMLElement, any>
    private _labelG!: d3Selection.Selection<SVGGElement, SVGGDatum, HTMLElement, any>
    private _tradeDetailsDiv!: d3Selection.Selection<HTMLDivElement, DivDatum, HTMLElement, any>
    private _tradeDetailsHead!: d3Selection.Selection<HTMLDivElement, DivDatum, HTMLElement, any>
    private _nationSelector!: HTMLSelectElement
    private _list!: d3Selection.Selection<HTMLDivElement, DivDatum, HTMLElement, any>
    private _linkDataDefault!: Trade[]
    private _linkData!: Trade[]
    private _portData!: PortWithTrades[]
    private _nodeData!: Map<number, Node>
    private _linkDataFiltered!: Trade[]
    private _portDataFiltered!: Set<number>

    constructor(serverName: string, portSelect: SelectPorts, minScale: number, lowerBound: Bound, upperBound: Bound) {
        this._serverName = serverName
        this._portSelect = portSelect

        this._minScale = minScale
        this._scale = this._minScale
        this._fontSize = defaultFontSize

        this._isDataLoaded = false

        this._numTrades = 30

        this._arrowX = 18
        this._arrowY = 18

        this._baseId = "show-trades"
        this._nationSelectId =`${this._baseId}-nation-select`
        this._listType = "tradeList"

        this._showId = "show-trades-show"

        /**
         * Possible values for show trade radio buttons (first is default value)
         */
        this._showRadioValues = ["off", "on"]

        /**
         * Show trade cookie
         */
        this._showCookie = new Cookie({ id: this._showId, values: this._showRadioValues })

        /**
         * Show trade radio buttons
         */
        this._showRadios = new RadioButton(this._showId, this._showRadioValues)

        this._profitId = "show-trades-profit"

        /**
         * Possible values for profit radio buttons (first is default value)
         */
        this._profitRadioValues = ["weight", "distance", "total"]

        this._profitCookie = new Cookie({ id: this._profitId, values: this._profitRadioValues })
        this._profitRadios = new RadioButton(this._profitId, this._profitRadioValues)

        /**
         * Get show value from cookie or use default value
         */
        this.show = this._getShowValue()

        this._setupSvg()
        this._setupSelects()
        this._setupProfitRadios()
        this._setupListener()
        this._setupList()
        this.setBounds(lowerBound, upperBound)

        if (this.show) {
            this._portSelect.setupInventorySelect(this.show)
        }

        /**
         * Get profit value from cookie or use default value
         */
        this._profitValue = this._getProfitValue()
    }

    static _getId(link: Trade): HtmlString {
        return`trade-${link.source.id}-${link.good.replace(/ /g, "")}-${link.target.id}`
    }

    static _addInfo(text: string): HtmlString {
        return`<div><div>${text}</div>`
    }

    static _addDes(text: string): HtmlString {
        return`<div class="des">${text}</div></div>`
    }

    static _getProfitPerWeight(trade: Trade): number {
        return trade.weightPerItem === 0
            ? trade.profitTotal
            : Math.round(trade.profitTotal / (trade.weightPerItem * trade.quantity))
    }

    static _getProfitPerDistance(trade: Trade): number {
        return trade.profitTotal / trade.distance
    }

    static _startBlock(text: string): HtmlString {
        return`<div class="block-block"><span>${text}</span>`
    }

    static _endBlock(): HtmlString {
        return "</div>"
    }

    static _hideDetails(d: Trade, i: number, nodes: SVGPathElement[] | d3Selection.ArrayLike<SVGPathElement>): void {
        $(d3Select(nodes[i]).node() as JQuery.PlainObject).tooltip("dispose")
    }

    static _showElem(elem: d3Selection.Selection<HTMLDivElement, DivDatum, HTMLElement, any>): void {
        elem.classed("d-none", false)
    }

    static _hideElem(elem: d3Selection.Selection<HTMLDivElement, DivDatum, HTMLElement, any>): void {
        elem.classed("d-none", true)
    }

    _setupSvg(): void {
        this._g = d3Select<SVGSVGElement, SVGSVGDatum>("#na-svg").insert("g", "g.pb").attr("class", "trades")
        this._labelG = this._g.append("g")

        d3Select("#na-svg defs")
            .append("marker")
            .attr("id", "trade-arrow")
            .attr("refX", this._arrowX)
            .attr("refY", this._arrowY / 2)
            .attr("markerWidth", 20)
            .attr("markerHeight", 20)
            .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d",`M0,0L0,${this._arrowY}L${this._arrowX},${this._arrowY / 2}z`)
            .attr("class", "trade-arrow-head")

        this._tradeDetailsDiv = d3Select<HTMLDivElement, DivDatum>("main #summary-column")
            .append("div")
            .attr("id", "trade-details")
            .attr("class", "trade-details")
    }

    _setupSelects(): void {
        const options =`${nations
            .map((nation) =>`<option value="${nation.short}" selected>${nation.name}</option>`)
            .join("")}`
        const cardId =`${this._baseId}-card`

        this._tradeDetailsHead = this._tradeDetailsDiv.append("div")
        const label = this._tradeDetailsHead.append("label")
        const select = label
            .append("select")
            .attr("name", this._nationSelectId)
            .attr("id", this._nationSelectId)
            .property("multiple", true)
            .attr("class", "selectpicker")

        this._nationSelector = select.node()!
        this._nationSelector.insertAdjacentHTML("beforeend", options)
        $(this._nationSelector).selectpicker({
            actionsBox: true,
            selectedTextFormat: "count > 1",
            countSelectedText(amount) {
                let text = ""
                if (amount === nations.length) {
                    text = "All"
                } else {
                    text = String(amount)
                }

                return`${text} nations selected`
            },
            title: "Select nations",
        })

        label
            .append("button")
            .attr("class", "btn btn-small btn-outline-primary")
            .attr("data-toggle", "collapse")
            .attr("data-target",`#${cardId}`)
            .text("Info")
        this._tradeDetailsHead
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

    _setupProfitRadios(): void {
        const profitRadioGroup = this._tradeDetailsHead
            .append("div")
            .attr("id", this._profitId)
            .attr("class", "align-self-center radio-group pl-2")
        profitRadioGroup.append("legend").attr("class", "col-form-label").text("Sort net profit by")

        for (const button of this._profitRadioValues) {
            const id =`${this._profitId}-${button.replace(/ /g, "")}`

            const div = profitRadioGroup
                .append("div")
                .attr("class", "custom-control custom-radio custom-control-inline")
            div.append("input")
                .attr("id", id)
                .attr("name", this._profitId)
                .attr("type", "radio")
                .attr("class", "custom-control-input")
                .attr("value", button)

            div.append("label").attr("for", id).attr("class", "custom-control-label").text(button)
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this._showId}`)?.addEventListener("change", async () => this._showSelected())
        document.querySelector(`#${this._profitId}`)?.addEventListener("change", () => this._profitValueSelected())
        this._nationSelector.addEventListener("change", (event) => {
            this._nationChanged()
            event.preventDefault()
        })
    }

    _setupList(): void {
        this._list = this._tradeDetailsDiv.append("div").attr("class", "trade-list small")
    }

    _setupData(): void {
        this._linkData = this._linkDataDefault
        this._nodeData = new Map<number, Node>(
            this._portData.map((port) => [
                port.id,
                {
                    name: port.name,
                    nation: port.nation,
                    isShallow: port.shallow,
                    x: port.coordinates[0],
                    y: port.coordinates[1],
                } as Node,
            ])
        )
        this._filterPortsBySelectedNations()
        this._sortLinkData()
    }

    _sortLinkData(): void {
        this._linkData = this._linkData
            .map((trade) => {
                let profit = 0
                switch (this._profitValue) {
                    case "weight":
                        profit = ShowTrades._getProfitPerWeight(trade)
                        break
                    case "distance":
                        profit = ShowTrades._getProfitPerDistance(trade)
                        break
                    case "total":
                        profit = trade.profitTotal
                        break
                    default:
                        throw new Error(`Wrong profit value ${this._profitValue}`)
                }

                trade.profit = profit
                return trade
            })
            .sort((a, b) => b.profit ?? 0 - (a.profit ?? 0))
    }

    async _showSelected(): Promise<void> {
        const show = this._showRadios.get()
        this.show = show === "on"

        this._showCookie.set(show)

        await this.showOrHide()
        this._portSelect.setupInventorySelect(this.show)
        this._filterTradesBySelectedNations()
        this._sortLinkData()
        this.update()
    }

    async _loadData(): Promise<void> {
        /**
         * Data directory
         */
        const dataDirectory = "data"

        try {
            const portData = (await import(/* webpackChunkName: "data-ports" */ "Lib/gen-generic/ports.json"))
                .default as PortBasic[]
            const pbData = (await (
                await fetch(`${dataDirectory}/${this._serverName}-pb.json`)
            ).json()) as PortBattlePerServer[]
            this._linkDataDefault = (await (
                await fetch(`${dataDirectory}/${this._serverName}-trades.json`)
            ).json()) as Trade[]
            // Combine port data with port battle data
            this._portData = portData.map((port) => {
                const pbPortData = pbData.find((d) => d.id === port.id)
                return { ...port, ...pbPortData } as PortWithTrades
            })
        } catch (error) {
            putImportError(error)
        }
    }

    async _loadAndSetupData(): Promise<void> {
        try {
            await this._loadData()
            this._setupData()
        } catch (error) {
            putImportError(error)
        }
    }

    async showOrHide(): Promise<void> {
        if (this.show) {
            if (!this._isDataLoaded) {
                await this._loadAndSetupData().then(() => {
                    this._isDataLoaded = true
                })
            }

            ShowTrades._showElem(this._tradeDetailsDiv)
            this._linkData = this._linkDataDefault
        } else {
            ShowTrades._hideElem(this._tradeDetailsDiv)
            this._linkData = []
        }
    }

    _profitValueSelected(): void {
        this._profitValue = this._profitRadios.get()

        this._profitCookie.set(this._profitValue)

        this._sortLinkData()
        this.update()
    }

    _nationChanged(): void {
        this._linkData = this._linkDataDefault
        this._filterPortsBySelectedNations()
        this._filterTradesBySelectedNations()
        this.update()
    }

    _portIsShallow(portId: number): boolean {
        return this._nodeData.get(portId)?.isShallow ?? true
    }

    _getDepth(portId: number): string {
        return this._portIsShallow(portId) ? "(shallow)" : "(deep)"
    }

    _getTradeLimitedData(trade: Trade): HtmlString {
        const weight = trade.weightPerItem * trade.quantity

        let h = "" as HtmlString
        h += ShowTrades._addInfo(`${formatInt(trade.quantity)} ${trade.good}`) + ShowTrades._addDes("trade")
        h += ShowTrades._addInfo(`${formatSiCurrency(trade.profit ?? 0)}`) + ShowTrades._addDes(this._profitText)
        h +=
            ShowTrades._addInfo(`${formatSiInt(weight)} ${weight === 1 ? "ton" : "tons"}`) +
            ShowTrades._addDes("weight")
        h +=
            ShowTrades._addInfo(
               `${this._nodeData.get(trade.source.id)?.name} <span class="caps">${
                    this._nodeData.get(trade.source.id)?.nation
                }</span>`
            ) + ShowTrades._addDes(`from ${this._getDepth(trade.source.id)}`)
        h +=
            ShowTrades._addInfo(
               `${this._nodeData.get(trade.target.id)?.name} <span class="caps">${
                    this._nodeData.get(trade.target.id)?.nation
                }</span>`
            ) + ShowTrades._addDes(`to ${this._getDepth(trade.target.id)}`)
        h += ShowTrades._addInfo(`${formatSiInt(trade.distance)}\u2009k`) + ShowTrades._addDes("distance")

        return h
    }

    _getTradeFullData(trade: Trade): HtmlString {
        const weight = trade.weightPerItem * trade.quantity
        const profitPerItem = trade.target.grossPrice - trade.source.grossPrice
        const profitPerDistance = ShowTrades._getProfitPerDistance(trade)
        const profitPerWeight = ShowTrades._getProfitPerWeight(trade)

        let h = "" as HtmlString

        h += ShowTrades._startBlock("Trade")
        h += ShowTrades._addInfo(`${formatInt(trade.quantity)} ${trade.good}`) + ShowTrades._addDes("good")
        h += ShowTrades._addInfo(`${formatSiCurrency(trade.source.grossPrice)}`) + ShowTrades._addDes("gross buy price")
        h +=
            ShowTrades._addInfo(`${formatSiCurrency(trade.target.grossPrice)}`) + ShowTrades._addDes("gross sell price")
        h +=
            ShowTrades._addInfo(`${formatSiInt(weight)} ${weight === 1 ? "ton" : "tons"}`) +
            ShowTrades._addDes("weight")
        h += ShowTrades._endBlock()

        h += ShowTrades._startBlock("Profit")
        h += ShowTrades._addInfo(`${formatSiCurrency(trade.profitTotal)}`) + ShowTrades._addDes("total")
        h += ShowTrades._addInfo(`${formatSiCurrency(profitPerItem)}`) + ShowTrades._addDes("profit/item")
        h += ShowTrades._addInfo(`${formatSiCurrency(profitPerDistance)}`) + ShowTrades._addDes("profit/distance")
        h += ShowTrades._addInfo(`${formatSiCurrency(profitPerWeight)}`) + ShowTrades._addDes("profit/weight")
        h += ShowTrades._endBlock()

        h += ShowTrades._startBlock("Route")
        h +=
            ShowTrades._addInfo(
               `${this._nodeData.get(trade.source.id)?.name} <span class="caps">${
                    this._nodeData.get(trade.source.id)?.nation
                }</span>`
            ) + ShowTrades._addDes(`from ${this._getDepth(trade.source.id)}`)
        h +=
            ShowTrades._addInfo(
               `${this._nodeData.get(trade.target.id)?.name} <span class="caps">${
                    this._nodeData.get(trade.target.id)?.nation
                }</span>`
            ) + ShowTrades._addDes(`to ${this._getDepth(trade.source.id)}`)
        h += ShowTrades._addInfo(`${formatSiInt(trade.distance)}\u2009k`) + ShowTrades._addDes("distance")
        h += ShowTrades._endBlock()

        return h
    }

    _showDetails(d: Trade, i: number, nodes: SVGPathElement[] | d3Selection.ArrayLike<SVGPathElement>): void {
        const trade = d3Select(nodes[i])
        const title = this._getTradeFullData(d)

        $(trade.node() as JQuery.PlainObject)
            .tooltip({
                html: true,
                placement: "auto",
                template:
                    '<div class="tooltip" role="tooltip">' +
                    '<div class="tooltip-block tooltip-inner tooltip-small">' +
                    "</div></div>",
                title,
                trigger: "manual",
                sanitize: false,
            })
            .tooltip("show")
    }

    _getSiblingLinks(sourceId: number, targetId: number): number[] {
        return this._linkDataFiltered
            .filter(
                (link) =>
                    (link.source.id === sourceId && link.target.id === targetId) ||
                    (link.source.id === targetId && link.target.id === sourceId)
            )
            .map((link) => link.profit ?? 0)
    }

    _getXCoord(portId: number): number {
        return this._nodeData.get(portId)?.x ?? 0
    }

    _getYCoord(portId: number): number {
        return this._nodeData.get(portId)?.y ?? 0
    }

    /**
     * {@link https://bl.ocks.org/mattkohl/146d301c0fc20d89d85880df537de7b0}
     */
    _updateGraph(): void {
        const arcPath = (leftHand: boolean, d: Trade): string => {
            const source = { x: this._getXCoord(d.source.id), y: this._getYCoord(d.source.id) }
            const target = { x: this._getXCoord(d.target.id), y: this._getYCoord(d.target.id) }
            const x1 = leftHand ? source.x : target.x
            const y1 = leftHand ? source.y : target.y
            const x2 = leftHand ? target.x : source.x
            const y2 = leftHand ? target.y : source.y

            let dr = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            const xRotation = 0
            const largeArc = 0
            const sweep = leftHand ? 0 : 1
            const siblings = this._getSiblingLinks(d.source.id, d.target.id)
            if (siblings.length > 1) {
                const arcScale = d3ScalePoint<number>().domain(siblings).range([1, siblings.length])
                dr /= 1 + (1 / siblings.length) * (arcScale(d.profit ?? 0) ?? 0 - 1)
            }

            dr = Math.round(dr)

            return`M${x1},${y1}A${dr},${dr} ${xRotation},${largeArc},${sweep} ${x2},${y2}`
        }

        const data = this._portSelect.isInventorySelected ? [] : this._linkDataFiltered
        const extent = d3Extent(this._linkDataFiltered, (d: Trade): number => d.profit ?? 0) as number[]
        const linkWidthScale = d3ScaleLinear()
            .range([5 / this._scale, 15 / this._scale])
            .domain(extent)
        const fontScale = 2 ** Math.log2(Math.abs(this._minScale) + this._scale)
        const fontSize = roundToThousands(this._fontSize / fontScale)

        this._g
            .selectAll<SVGPathElement, Trade>(".trade-link")
            .data(data, (d) => ShowTrades._getId(d))
            .join((enter) =>
                enter
                    .append("path")
                    .attr("class", "trade-link")
                    .attr("marker-start", (d) =>
                        this._getXCoord(d.source.id) < this._getXCoord(d.target.id) ? "" : "url(#trade-arrow)"
                    )
                    .attr("marker-end", (d) =>
                        this._getXCoord(d.source.id) < this._getXCoord(d.target.id) ? "url(#trade-arrow)" : ""
                    )
                    .attr("id", (d) => ShowTrades._getId(d))
                    .on("click", (d, i, nodes) => this._showDetails(d, i, nodes))
                    .on("mouseleave", ShowTrades._hideDetails)
            )
            .attr("d", (d) => arcPath(this._getXCoord(d.source.id) < this._getXCoord(d.target.id), d))
            .attr("stroke-width", (d) =>`${linkWidthScale(d.profit ?? 0)}px`)

        this._labelG.attr("font-size",`${fontSize}px`)

        this._labelG
            .selectAll<SVGTextElement, Trade>(".trade-label")
            .data(this._linkDataFiltered, (d) => ShowTrades._getId(d))
            .join((enter) =>
                enter
                    .append("text")
                    .attr("class", "trade-label")
                    .append("textPath")
                    .attr("startOffset", "15%")
                    .attr("xlink:href", (d) =>`#${ShowTrades._getId(d)}`)
                    .text((d) =>`${formatInt(d.quantity)} ${d.good}`)
            )
            .attr("dy", (d) =>`-${linkWidthScale(d.profit ?? 0) / 1.5}px`)
    }

    get listType(): string {
        return this._listType
    }

    set listType(type) {
        this._listType = type
        switch (this._listType) {
            case "inventory":
                this._linkData = []
                ShowTrades._hideElem(this._tradeDetailsHead)
                this._list.remove()
                this._list = this._tradeDetailsDiv.append("div").attr("class", "small p-2")
                break
            case "portList":
                this._linkData = []
                ShowTrades._hideElem(this._tradeDetailsHead)
                this._list.remove()
                this._list = this._tradeDetailsDiv.append("div").attr("class", "small p-2")
                break
            default:
                this._linkData = this._linkDataDefault
                ShowTrades._showElem(this._tradeDetailsHead)
                this._list.remove()
                this._list = this._tradeDetailsDiv.append("div").attr("class", "trade-list small")
                break
        }
    }

    _updateList(data?: string): void {
        switch (this._listType) {
            case "inventory":
                this._updateInventory(data)
                break
            case "portList":
                this._updatePortList(data)
                break
            default:
                this._updateTradeList()
                break
        }
    }

    _updateInventory(inventory?: string): void {
        this._list.html(inventory ?? "")
    }

    _updatePortList(portList?: string): void {
        this._list.html(portList ?? "")
    }

    _updateTradeList(): void {
        let highlightLink: d3Selection.Selection<SVGPathElement, SVGSVGDatum, HTMLElement, any>

        const highlightOn = (d: Trade): void => {
            highlightLink = d3Select<SVGPathElement, SVGSVGDatum>(`path#${ShowTrades._getId(d)}`).classed(
                "highlight",
                true
            )
            highlightLink.dispatch("click")
        }

        const highlightOff = (): void => {
            highlightLink.classed("highlight", false)
            highlightLink.dispatch("mouseleave")
        }

        this._list
            .selectAll<HTMLDivElement, Trade>("div.block")
            .data(this._linkDataFiltered, (d) => ShowTrades._getId(d))
            .join((enter) =>
                enter.append("div").attr("class", "block").on("mouseenter", highlightOn).on("mouseleave", highlightOff)
            )
            .html((d) => this._getTradeLimitedData(d))
    }

    _filterTradesByVisiblePorts(): void {
        const portDataFiltered = new Set(
            this._portData
                .filter(
                    (port) =>
                        port.coordinates[0] >= this._lowerBound[0] &&
                        port.coordinates[0] <= this._upperBound[0] &&
                        port.coordinates[1] >= this._lowerBound[1] &&
                        port.coordinates[1] <= this._upperBound[1]
                )
                .map((port) => port.id)
        )
        this._linkDataFiltered = this._linkData
            .filter((trade) => portDataFiltered.has(trade.source.id) || portDataFiltered.has(trade.target.id))
            .slice(0, this._numTrades)
    }

    _filterTradesBySelectedNations(): void {
        this._linkData = this._linkData
            .filter(
                (trade) => this._portDataFiltered.has(trade.source.id) && this._portDataFiltered.has(trade.target.id)
            )
            .slice(0, this._numTrades)
    }

    _filterPortsBySelectedNations(): void {
        const selectedNations = new Set([...this._nationSelector.selectedOptions].map((option) => option.value))
        this._portDataFiltered = new Set<number>(
            this._portData.filter((port) => selectedNations.has(port.nation)).map((port) => port.id)
        )
    }

    /**
     * Get show value from cookie or use default value
     * @returns Show value
     */
    _getShowValue(): boolean {
        const r = this._showCookie.get()

        this._showRadios.set(r)

        return r === "on"
    }

    /**
     * Get profit value from cookie or use default value
     * @returns Profit value
     */
    _getProfitValue(): string {
        const r = this._profitCookie.get()

        this._profitRadios.set(r)

        switch (r) {
            case "weight":
                this._profitText = "profit/weight"
                break
            case "distance":
                this._profitText = "profit/distance"
                break
            case "total":
                this._profitText = "total"
                break
            default:
                throw new Error("Wrong profit value")
        }

        return r
    }

    update(data?: string): void {
        if (this.show) {
            this._filterTradesByVisiblePorts()
            this._updateList(data)
        } else {
            this._linkDataFiltered = []
        }

        this._updateGraph()
    }

    /**
     * Set bounds of current viewport
     * @param lowerBound - Top left coordinates of current viewport
     * @param upperBound - Bottom right coordinates of current viewport
     */
    setBounds(lowerBound: Bound, upperBound: Bound): void {
        this._lowerBound = lowerBound
        this._upperBound = upperBound
    }

    transform(transform: d3Zoom.ZoomTransform): void {
        this._g.attr("transform", transform.toString())
        this._scale = transform.k
        this.update()
    }

    clearMap(): void {
        this.listType = "tradeList"

        if (this.show) {
            this._linkData = this._linkDataDefault
        } else {
            this._linkData = []
        }

        this.update()
    }
}
