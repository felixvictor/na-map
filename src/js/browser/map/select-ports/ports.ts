/*!
 * This file is part of na-map.
 *
 * @file      Select ports select ports.
 * @module    map/select-ports/ports
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { registerEvent } from "../../analytics"
import { NationShortName, sortBy, TupleKeyMap } from "common/common"
import { Coordinate, Distance, getDistance, Point } from "common/common-math"
import { Port, PortIntersection, PortWithTrades, TradeGoodProfit, TradeProfit } from "common/gen-json"
import { HtmlString } from "common/interface"
import Select from "util/select"
import DisplayPorts from "../display-ports"
import { getIdFromBaseName } from "common/common-browser"

interface SelectPort {
    [index: string]: PortIntersection
    id: number
    coord: Point
    name: string
    nation: NationShortName
}

export default class SelectPortsSelectPorts {
    #baseName = "Show trade relations"
    #baseId: HtmlString
    #distances = new Map<number, number>()
    #select = {} as Select
    #tradePort = {} as PortWithTrades
    readonly #numberPorts: number
    readonly #ports: DisplayPorts
    readonly #sellProfit = new TupleKeyMap<[number, number], TradeProfit>()

    constructor(ports: DisplayPorts) {
        this.#ports = ports
        this.#numberPorts = this.#ports.portData.length

        this.#baseId = `port-select-${getIdFromBaseName(this.#baseName)}`

        this._setupSelect()
        this._setupListener()
    }

    _getOptions(): HtmlString {
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

        return `${selectPorts
            .map(
                (port: SelectPort): HtmlString =>
                    `<option data-icon="flag-icon-${port.nation} flag-icon-small" value="${port.coord.toString()}/${
                        port.id
                    }">${port.name}</option>`
            )
            .join("")}`
    }

    _setupSelect(): void {
        this.#select = new Select(this.#baseId, undefined, {}, "")
    }

    _setupListener(): void {
        this.#select.select$.one("show.bs.select", () => {
            this.#select.setOptions(this._getOptions())
            this.#select.reset()
        })
        this.#select.select$.one("change", async () => {
            await this._loadData()
        })
        this.#select.select$.on("change", () => {
            registerEvent("Menu", this.#baseName)

            Select.resetAllExcept([this.#select.select$])
            this._selectSelected()
        })
    }

    async _loadData(): Promise<void> {
        const distances = (
            await import(/* webpackChunkName: "data-distances" */ "../../../../../lib/gen-generic/distances.json")
        ).default as Distance[]
        this.#distances = new Map(
            distances.map(([fromPortId, toPortId, distance]) => [fromPortId * this.#numberPorts + toPortId, distance])
        )
    }

    _setTradePortPartners(): void {
        this.#tradePort = (this.#ports.portDataDefault.find((port) => port.id === this.#ports.portIcons.tradePort.id) ??
            {}) as PortWithTrades

        if (this.#tradePort.id) {
            this._setTradeRelations()
        }
    }

    _getSailingDistance(fromPortId: number, toPortId: number): number {
        return fromPortId < toPortId
            ? this.#distances.get(fromPortId * this.#numberPorts + toPortId) ?? 0
            : this.#distances.get(toPortId * this.#numberPorts + fromPortId) ?? 0
    }

    _getBuyPrice(itemId: number): number {
        return this.#ports.portIcons.getTradeItem(itemId)?.buyPrice ?? 0
    }

    _getSellPrice(itemId: number): number {
        return this.#ports.portIcons.getTradeItem(itemId)?.sellPrice ?? 0
    }

    _getWeight(itemId: number): number {
        return this.#ports.portIcons.getTradeItem(itemId)?.weight ?? 0
    }

    _getDistanceFactor(itemId: number): number {
        return this.#ports.portIcons.getTradeItem(itemId)?.distanceFactor ?? 0
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
        // const sailingDistance = this._getSailingDistance(buyPort.id, sellPort.id)
        const buyTax = this._getPortTax(buyPort.id)
        const sellTax = this._getPortTax(sellPort.id)
        let buyPrice = this._getBuyPrice(itemId)
        let sellPrice =
            this._getSellPrice(itemId) + (planarDistance * buyPrice * this._getDistanceFactor(itemId)) / 1050
        buyPrice *= 1 + buyTax
        sellPrice /= 1 + sellTax
        const profit = Math.round(sellPrice - buyPrice)
        const profitPerTon = Math.round(profit / this._getWeight(itemId))

        /*
        console.log(
            this.#ports.tradeItem.get(itemId)?.name ?? "",
            this.#ports.portDataDefault.find((port) => port.id === buyPort.id)?.name,
            this.#ports.portDataDefault.find((port) => port.id === sellPort.id)?.name,
            this._getBuyPrice(itemId),
            this._getSellPrice(itemId),
            planarDistance,
            this._getBuyPrice(itemId) * this._getDistanceFactor(itemId),
            planarDistance * this._getBuyPrice(itemId) * this._getDistanceFactor(itemId),
            (planarDistance * this._getBuyPrice(itemId) * this._getDistanceFactor(itemId)) / 1050,
            this._getSellPrice(itemId) +
                (planarDistance * this._getBuyPrice(itemId) * this._getDistanceFactor(itemId)) / 1050,
            profit
        )
        */

        return { profit, profitPerTon }
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
                name: this.#ports.portIcons.getTradeItem(good)?.name ?? "",
                profit: this._getProfit(this.#tradePort, sellPort, good),
            })) ?? []) as TradeGoodProfit[]
    }

    _getGoodsToSellInTradePort(buyPort: PortWithTrades): TradeGoodProfit[] {
        const tradePortConsumedGoods = new Set(this.#tradePort.consumesTrading?.map((good) => good)) ?? []

        return (buyPort.dropsTrading
            ?.filter((good) => tradePortConsumedGoods.has(good))
            .map((good) => ({
                name: this.#ports.portIcons.getTradeItem(good)?.name ?? "",
                profit: this._getProfit(buyPort, this.#tradePort, good),
            })) ?? []) as TradeGoodProfit[]
    }

    _setTradeRelations(): void {
        this.#sellProfit.clear()
        this.#ports.portData = this.#ports.portDataDefault
            .map((port) => {
                port.sailingDistanceToTradePort = this._getSailingDistance(port.id, this.#tradePort.id)
                port.goodsToBuyInTradePort = this._getGoodsToBuyInTradePort(port)
                port.buyInTradePort = port.goodsToBuyInTradePort.length > 0
                port.goodsToSellInTradePort = this._getGoodsToSellInTradePort(port)
                port.sellInTradePort = port.goodsToSellInTradePort.length > 0

                return port
            })
            .filter(
                (port) => port.id === this.#ports.portIcons.tradePort.id || port.sellInTradePort || port.buyInTradePort
            )
    }

    #getPortName(id: number): string {
        return this.#ports.portDataDefault.find((port) => port.id === id)?.name ?? ""
    }

    _selectSelected(): void {
        const portData = String(this.#select.getValues())

        const [c, id] = portData.split("/")
        const [x, y] = c.split(",")

        this.#ports.currentPort = {
            id: Number(id),
            coord: { x: Number(x), y: Number(y) },
        }
        this.#ports.portIcons.tradePort = {
            id: Number(id),
            name: this.#getPortName(Number(id)),
        }

        this._setTradePortPartners()

        this.#ports.showRadius = "tradePorts"
        this.#ports.map.goToPort()
        this.#ports.update()
    }
}
