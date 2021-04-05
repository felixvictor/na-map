/*!
 * This file is part of na-map.
 *
 * @file      Select ports select ports.
 * @module    map/select-ports/ports
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import SelectPortsSelect from "./select"

import { registerEvent } from "../../analytics"
import { Coordinate, Distance, getDistance, Point } from "common/common-math"
import DisplayPorts from "../display-ports"

import { Port, PortIntersection, PortWithTrades, TradeGoodProfit, TradeProfit } from "common/gen-json"
import { HtmlString } from "common/interface"
import { NationShortName, sortBy, TupleKeyMap } from "common/common"

interface SelectPort {
    [index: string]: PortIntersection
    id: number
    coord: Point
    name: string
    nation: NationShortName
}

export default class SelectPortsSelectPorts extends SelectPortsSelect {
    #dataLoaded = false
    #distances = new Map<number, number>()
    readonly #numberPorts: number
    readonly #ports: DisplayPorts
    readonly #sellProfit = new TupleKeyMap<[number, number], TradeProfit>()
    #tradePort = {} as PortWithTrades

    constructor(ports: DisplayPorts) {
        super("Show trade relations")

        this.#ports = ports
        this.#numberPorts = this.#ports.portData.length

        this._setupListener()
        this.select$.selectpicker()
    }

    _setupListener(): void {
        this.select$.one("show.bs.select", () => {
            this._injectSelect()
        })
        this.selectSel.addEventListener("change", async () => {
            registerEvent("Menu", this.baseName)

            await this._loadData()
            this._resetOtherSelects()
            this._selectSelected()
        })
    }

    _injectSelect(): void {
        const selectPorts: SelectPort[] = this.#ports.portDataDefault
            .map(
                (d: Port) =>
                    ({
                        id: d.id,
                        coord: [d.coordinates[0], d.coordinates[1]],
                        name: d.name,
                        nation: d.nation,
                    } as SelectPort)
            )
            .sort(sortBy(["name"]))
        const options = `${selectPorts
            .map(
                (port: SelectPort): HtmlString =>
                    `<option data-subtext="${port.nation}" value="${port.coord.toString()}" data-id="${port.id}">${
                        port.name
                    }</option>`
            )
            .join("")}`

        this.selectSel.insertAdjacentHTML("beforeend", options)
        this.select$.selectpicker("refresh")
    }

    async _loadData(): Promise<void> {
        if (!this.#dataLoaded) {
            const distances = (
                await import(/* webpackChunkName: "data-distances" */ "../../../../../lib/gen-generic/distances.json")
            ).default as Distance[]
            this.#distances = new Map(
                distances.map(([fromPortId, toPortId, distance]) => [
                    fromPortId * this.#numberPorts + toPortId,
                    distance,
                ])
            )

            this.#dataLoaded = true
        }
    }

    _setTradePortPartners(): void {
        this.#tradePort = (this.#ports.portDataDefault.find((port) => port.id === this.#ports.tradePortId) ??
            []) as PortWithTrades

        if (this.#tradePort) {
            this._setTradeRelations()
        }
    }

    _getSailingDistance(fromPortId: number, toPortId: number): number {
        return fromPortId < toPortId
            ? this.#distances.get(fromPortId * this.#numberPorts + toPortId) ?? 0
            : this.#distances.get(toPortId * this.#numberPorts + fromPortId) ?? 0
    }

    _getBuyPrice(itemId: number): number {
        return this.#ports.tradeItem.get(itemId)?.price ?? 0
    }

    _getDistanceFactor(itemId: number): number {
        return this.#ports.tradeItem.get(itemId)?.distanceFactor ?? 0
    }

    _getPortTax(portId: number): number {
        return this.#ports.portDataDefault.find((port) => port.id === portId)?.portTax ?? 0
    }

    _getCoordinates(portId: number): Coordinate {
        const port = this.#ports.portDataDefault.find((port) => port.id === portId)
        return { x: port?.coordinates[0] ?? 0, y: port?.coordinates[1] ?? 0 }
    }

    _getPlanarDistance(fromPortId: number, toPortId: number): number {
        const fromPortCoord = this._getCoordinates(fromPortId)
        const toPortCoord = this._getCoordinates(toPortId)

        return getDistance(fromPortCoord, toPortCoord)
    }

    _findClosestSourcePort(sellPort: PortWithTrades, itemId: number): number {
        let minDistance = Number.POSITIVE_INFINITY
        const sourcePortIds = new Set(
            this.#ports.portDataDefault
                .filter((port) => port.dropsTrading?.includes(itemId) ?? port.dropsNonTrading?.includes(itemId))
                .map((port) => port.id)
        )

        for (const sourcePortId of sourcePortIds) {
            minDistance = Math.min(minDistance, this._getPlanarDistance(sourcePortId, sellPort.id))
        }

        return minDistance
    }

    _calculateSellProfit(buyPort: PortWithTrades, sellPort: PortWithTrades, itemId: number): TradeProfit {
        const planarDistance = this._findClosestSourcePort(sellPort, itemId)
        const sailingDistance = this._getSailingDistance(buyPort.id, sellPort.id)
        const buyTax = this._getPortTax(buyPort.id)
        const sellTax = this._getPortTax(sellPort.id)
        let buyPrice = this._getBuyPrice(itemId)
        let sellPrice = buyPrice * 3 + (planarDistance * buyPrice * this._getDistanceFactor(itemId)) / 6 / 100
        buyPrice *= 1 + buyTax
        sellPrice /= 1 + sellTax
        const profit = Math.round(sellPrice - buyPrice)

        return { profit, profitPerDistance: profit / sailingDistance }
    }

    _getProfit(buyPort: PortWithTrades, sellPort: PortWithTrades, itemId: number): TradeProfit {
        const key = [sellPort.id, itemId] as [number, number]
        if (!this.#sellProfit.has(key)) {
            this.#sellProfit.set(key, this._calculateSellProfit(buyPort, sellPort, itemId))
        }

        return this.#sellProfit.get(key)!
    }

    _getGoodsToBuyInTradePort(sellPort: PortWithTrades): TradeGoodProfit[] {
        const tradePortProducedGoods = new Set(this.#tradePort.dropsTrading?.map((good) => good)) ?? []

        return (sellPort.consumesTrading
            ?.filter((good) => tradePortProducedGoods.has(good))
            .map((good) => ({
                name: this.#ports.tradeItem.get(good)?.name ?? "",
                profit: this._getProfit(this.#tradePort, sellPort, good),
            })) ?? []) as TradeGoodProfit[]
    }

    _getGoodsToSellInTradePort(buyPort: PortWithTrades): TradeGoodProfit[] {
        const tradePortConsumedGoods = new Set(this.#tradePort.consumesTrading?.map((good) => good)) ?? []

        return (buyPort.dropsTrading
            ?.filter((good) => tradePortConsumedGoods.has(good))
            .map((good) => ({
                name: this.#ports.tradeItem.get(good)?.name ?? "",
                profit: this._getProfit(buyPort, this.#tradePort, good),
            })) ?? []) as TradeGoodProfit[]
    }

    _setTradeRelations(): void {
        this.#ports.portData = this.#ports.portDataDefault
            .map((port) => {
                port.sailingDistanceToTradePort = this._getSailingDistance(port.id, this.#tradePort.id)
                port.goodsToBuyInTradePort = this._getGoodsToBuyInTradePort(port)
                port.buyInTradePort = port.goodsToBuyInTradePort.length > 0
                port.goodsToSellInTradePort = this._getGoodsToSellInTradePort(port)
                port.sellInTradePort = port.goodsToSellInTradePort.length > 0

                return port
            })
            .filter((port) => port.id === this.#ports.tradePortId || port.sellInTradePort || port.buyInTradePort)
    }

    _selectSelected(): void {
        const port = this.selectSel.options[this.selectSel.selectedIndex]
        const c = port?.value.split(",")
        const id = Number(port?.getAttribute("data-id"))

        this.#ports.currentPort = {
            id,
            coord: { x: Number(c?.[0]), y: Number(c?.[1]) },
        }
        this.#ports.tradePortId = id

        this._setTradePortPartners()

        this.#ports.showRadius = "tradePorts"
        this.#ports.update()
    }
}
