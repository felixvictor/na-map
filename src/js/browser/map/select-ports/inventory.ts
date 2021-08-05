/*!
 * This file is part of na-map.
 *
 * @file      Select ports inventory select.
 * @module    map/select-ports/inventory
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"
import { getIdFromBaseName } from "common/common-browser"
import { formatInt, formatSiCurrency } from "common/common-format"
import { NationShortName, sortBy } from "common/common"

import { HtmlString } from "common/interface"
import { InventoryEntity } from "common/gen-json"

import Select from "util/select"
import DisplayPorts from "../display-ports"
import { NAMap } from "../na-map"

type goodMap = Map<string, { name: string; nation: NationShortName; good: InventoryEntity }>

export default class SelectPortsSelectInventory {
    #baseName = "Show good availability"
    #baseId: HtmlString
    #select = {} as Select
    #isInventorySelected = false
    #map: NAMap
    #ports: DisplayPorts

    constructor(ports: DisplayPorts, map: NAMap) {
        this.#ports = ports
        this.#map = map

        this.#baseId = `port-select-${getIdFromBaseName(this.#baseName)}`

        this._setupSelect()
        this._setupListener()
    }

    show(show: boolean): void {
        const selectSel = this.#select.select$.get(0)

        if (show) {
            selectSel.classList.remove("d-none")
            ;(selectSel.parentNode as HTMLSelectElement).classList.remove("d-none")
            this.#select.setOptions(this._getOptions())
            this.#select.reset()
        } else {
            selectSel.classList.add("d-none")
            ;(selectSel.parentNode as HTMLSelectElement).classList.add("d-none")
        }
    }

    _getOptions(): HtmlString {
        const selectGoods = new Map<number, string>()

        for (const port of this.#ports.portDataDefault) {
            if (port.inventory) {
                for (const good of port.inventory) {
                    selectGoods.set(good.id, this.#ports.tradeItem.get(good.id)?.name ?? "")
                }
            }
        }

        return `${[...selectGoods]
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map((good) => `<option value="${good[0]}">${good[1]}</option>`)
            .join("")}`
    }

    _setupSelect(): void {
        const bsSelectOptions = {
            dropupAuto: false,
            liveSearch: true,
            liveSearchNormalize: true,
            liveSearchPlaceholder: "Search ...",
            title: this.#baseName,
            virtualScroll: true,
        }

        this.#select = new Select(this.#baseId, undefined, bsSelectOptions, "")
    }

    _setupListener(): void {
        this.#select.select$.on("change", () => {
            registerEvent("Menu", this.#baseName)

            this._selectSelected()
        })
    }

    _getPortList(goodIdSelected: number, buyGoods: goodMap, sellGoods: goodMap): HtmlString {
        let h: HtmlString = ""

        h += `<h5>${this.#ports.tradeItem.get(goodIdSelected)?.name ?? ""}</h5>`
        if (buyGoods.size > 0) {
            h += "<h6>Buy</h6>"
            for (const [, value] of buyGoods) {
                h += `${value.name} <span class="caps">${value.nation}</span>: ${formatInt(
                    value.good.buyQuantity
                )} @ ${formatSiCurrency(value.good.buyPrice)}<br>`
            }
        }

        if (buyGoods && sellGoods) {
            h += "<p></p>"
        }

        if (sellGoods.size > 0) {
            h += "<h6>Sell</h6>"
            for (const [, value] of sellGoods) {
                h += `${value.name} <span class="caps">${value.nation}</span>: ${formatInt(
                    value.good.sellQuantity
                )} @ ${formatSiCurrency(value.good.sellPrice)}<br>`
            }
        }

        return h
    }

    _selectSelected(): void {
        const goodIdSelected = Number(this.#select.getValues())
        const buyGoods = new Map() as goodMap
        const sellGoods = new Map() as goodMap

        this.#isInventorySelected = true

        const portsFiltered = this.#ports.portDataDefault
            .filter((port) => port.inventory.some((good) => good.id === goodIdSelected))
            .sort(sortBy(["name"]))
            .map((port) => {
                const item = port.inventory.find((good) => good.id === goodIdSelected)
                if (item) {
                    port.sellInTradePort = item.buyQuantity > 0
                    if (port.sellInTradePort) {
                        buyGoods.set(port.name, { name: port.name, nation: port.nation, good: item })
                    }

                    port.buyInTradePort = item.sellQuantity > 0
                    if (port.buyInTradePort) {
                        sellGoods.set(port.name, { name: port.name, nation: port.nation, good: item })
                    }
                }

                return port
            })

        this.#ports.setShowRadiusSetting("off")
        this.#ports.portData = portsFiltered
        this.#ports.showRadius = "tradePorts"
        if (this.#map.showTrades.listType !== "portList") {
            this.#map.showTrades.listType = "portList"
        }

        this.#map.showTrades.update(this._getPortList(goodIdSelected, buyGoods, sellGoods))
        this.#ports.update()
    }

    get isInventorySelected(): boolean {
        return this.#isInventorySelected
    }
}
