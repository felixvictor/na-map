/*
 * This file is part of na-map.
 *
 * @file      Show trades.
 * @module    map-tools/show-trades
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { ZoomTransform } from "d3-zoom"

import { Extent } from "common/common-math"
import { hideElem, showElem } from "./common"

import Cookie from "util/cookie"
import Checkbox from "util/checkbox"
import DisplayPorts from "../display-ports"
import SelectPortsSelectInventory from "../select-ports/inventory"

import Graphs from "./graphs"
import List from "./list"
import TradeData from "./trade-data"

/**
 * Show trades
 */
export default class ShowTrades {
    #graphs = {} as Graphs
    #inventorySelect: SelectPortsSelectInventory | undefined = undefined
    #isDataLoaded = false
    #ports: DisplayPorts
    #scale = 1
    #serverName: string
    #tradeData = {} as TradeData
    list = {} as List
    readonly #showCookie: Cookie
    readonly #showCheckboxId = "show-trades"
    readonly #showCheckboxValues = [String(false), String(true)] // Possible values for show trade checkboxes (first is default value)
    readonly #showCheckbox: Checkbox
    show: boolean

    constructor(ports: DisplayPorts, serverName: string) {
        this.#ports = ports
        this.#serverName = serverName

        this.#showCookie = new Cookie({ id: this.#showCheckboxId, values: this.#showCheckboxValues })
        this.#showCheckbox = new Checkbox(this.#showCheckboxId)

        this.#setupShowListener()
        this.show = this.#getShowValue()
    }

    #setupShowListener(): void {
        document.querySelector(`#${this.#showCheckboxId}`)?.addEventListener("click", async () => {
            this.#showSelected()
        })
    }

    /**
     * Get show value from cookie or use default value
     */
    #getShowValue(): boolean {
        const r = this.#showCookie.get() === "true"

        this.#showCheckbox.set(r)

        return r
    }

    #setupListListener(): void {
        document.querySelector(`#${this.#tradeData.profitId}`)?.addEventListener("change", () => {
            this.#profitValueSelected()
        })
        this.#tradeData.selectNation$.on("change", () => {
            this.#tradeData.resetFilter()
            this.update()
        })
    }

    async #setupData(): Promise<void> {
        this.list = new List()
        this.#graphs = new Graphs()
        this.#tradeData = new TradeData(this.#serverName)
        this.#inventorySelect = new SelectPortsSelectInventory(this.#ports, this)

        this.#setupListListener()
        await this.#tradeData.loadAndSetupData()
        this.#inventorySelect.show(this.show)

        this.list.tradeData = this.#tradeData
        this.#graphs.tradeData = this.#tradeData
    }

    async init(): Promise<void> {
        if (this.show && !this.#isDataLoaded) {
            await this.#setupData()
            this.#isDataLoaded = true
        }
    }

    async #showSelected(): Promise<void> {
        this.show = this.#showCheckbox.get()

        this.#showCookie.set(String(this.show))

        await this.init()
        this.#inventorySelect?.show(this.show)

        if (this.show) {
            showElem(this.list.tradeDetailsDiv)
            this.#tradeData.reset()
        } else {
            hideElem(this.list.tradeDetailsDiv)
            this.#tradeData.emptyLinkDataFiltered()
        }

        this.update()
    }

    #profitValueSelected(): void {
        this.#tradeData.profitValueSelected()
        this.update()
    }

    update(info?: string): void {
        if (this.#inventorySelect) {
            this.list.update(this.#inventorySelect.isInventorySelected, info)
            this.#graphs.update(this.#inventorySelect.isInventorySelected, this.#scale)
        }
    }

    transform(transform: ZoomTransform): void {
        this.#scale = transform.k

        if (this.show) {
            this.update()
        }
    }

    clearMap(): void {
        this.list.listType = "tradeList"

        if (this.#inventorySelect) {
            this.#inventorySelect.reset()
        }
        this.#tradeData.reset()
        this.update()
    }

    /**
     * Set bounds of current viewport
     */
    setBounds(viewport: Extent): void {
        if (this.show) {
            this.#tradeData.setBounds(viewport)
        }
    }
}
