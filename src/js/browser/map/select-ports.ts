/*!
 * This file is part of na-map.
 *
 * @file      Select ports.
 * @module    map/select-ports
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util"
import "bootstrap/js/dist/dropdown"

import "bootstrap-select"

import dayjs, { Dayjs } from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import isBetween from "dayjs/plugin/isBetween"
import utc from "dayjs/plugin/utc"

dayjs.extend(customParseFormat)
dayjs.extend(isBetween)
dayjs.extend(utc)
dayjs.locale("en-gb")

import { registerEvent } from "../analytics"
import { Nation, nations, NationShortName, validNationShortName } from "common/common"
import { initMultiDropdownNavbar, loadJsonFile, TupleKeyMap } from "common/common-browser"
import { formatInt, formatSiCurrency } from "common/common-format"
import { Coordinate, Distance, getDistance, Point } from "common/common-math"
import { simpleStringSort, sortBy } from "common/common-node"
import { serverMaintenanceHour } from "common/common-var"
import {
    FrontlinesPerServer,
    GoodList,
    InventoryEntity,
    Port,
    PortIntersection,
    PortPerServer,
    PortWithTrades,
    TradeGoodProfit,
    TradeProfit,
} from "common/gen-json"
import { HtmlString } from "common/interface"

import { NAMap } from "./na-map"
import DisplayPorts from "./display-ports"
import DisplayPbZones from "./display-pb-zones"

type goodMap = Map<string, { name: string; nation: NationShortName; good: InventoryEntity }>
type PortDepth = "deep" | "shallow"

interface SelectPort {
    [index: string]: PortIntersection
    id: number
    coord: Point
    name: string
    nation: NationShortName
}

export default class SelectPorts {
    isInventorySelected: boolean
    private _dataLoaded = false
    private _distances: Map<number, number> = new Map()
    private _frontlinesData!: FrontlinesPerServer
    private _nation!: NationShortName
    private _ports: DisplayPorts
    private readonly _buyGoodsId: string
    private readonly _buyGoodsSelector: HTMLSelectElement | null
    private readonly _frontlineAttackingNationId: string
    private readonly _frontlineAttackingNationSelector: HTMLSelectElement | null
    private readonly _frontlineDefendingNationId: string
    private readonly _frontlineDefendingNationSelector: HTMLSelectElement | null
    private readonly _inventoryId: string
    private readonly _inventorySelector: HTMLSelectElement | null
    private readonly _map: NAMap
    private readonly _numberPorts: number
    private readonly _pbZone: DisplayPbZones
    private readonly _portNamesId: string
    private readonly _portNamesSelector: HTMLSelectElement | null
    private readonly _propClanId: string
    private readonly _propClanSelector: HTMLSelectElement | null
    private readonly _propNationId: string
    private readonly _propNationSelector: HTMLSelectElement | null
    private readonly _sellProfit = new TupleKeyMap<[number, number], TradeProfit>()

    constructor(ports: DisplayPorts, pbZone: DisplayPbZones, map: NAMap) {
        this._ports = ports
        this._pbZone = pbZone
        this._map = map

        this._numberPorts = this._ports.portData.length

        this._frontlineAttackingNationId = "frontlines-attacking-nation-select"
        this._frontlineAttackingNationSelector = document.querySelector<HTMLSelectElement>(
            `#${this._frontlineAttackingNationId}`
        )

        this._frontlineDefendingNationId = "frontlines-defending-nation-select"
        this._frontlineDefendingNationSelector = document.querySelector<HTMLSelectElement>(
            `#${this._frontlineDefendingNationId}`
        )

        this._portNamesId = "port-names-select"
        this._portNamesSelector = document.querySelector<HTMLSelectElement>(`#${this._portNamesId}`)

        this._buyGoodsId = "buy-goods-select"
        this._buyGoodsSelector = document.querySelector<HTMLSelectElement>(`#${this._buyGoodsId}`)

        this._inventoryId = "inventory-select"
        this._inventorySelector = document.querySelector<HTMLSelectElement>(`#${this._inventoryId}`)

        this._propNationId = "prop-nation-select"
        this._propNationSelector = document.querySelector<HTMLSelectElement>(`#${this._propNationId}`)

        this._propClanId = "prop-clan-select"
        this._propClanSelector = document.querySelector<HTMLSelectElement>(`#${this._propClanId}`)

        this.isInventorySelected = false

        this._setupSelects()
        this._setupListener()
    }

    _setupSelects(): void {
        this._setupFrontlinesNationSelect()
        this._setupNationSelect()
        this._setupClanSelect()
    }

    _resetOtherSelects(activeSelectSelector: HTMLSelectElement | null): void {
        for (const selectSelector of [
            this._portNamesSelector,
            this._buyGoodsSelector,
            this._inventorySelector,
            this._frontlineAttackingNationSelector,
            this._frontlineDefendingNationSelector,
            this._propNationSelector,
            this._propClanSelector,
        ]) {
            if (
                selectSelector &&
                selectSelector !== activeSelectSelector &&
                !(selectSelector === this._propClanSelector && activeSelectSelector === this._propNationSelector) &&
                !(selectSelector === this._propNationSelector && activeSelectSelector === this._propClanSelector)
            ) {
                $(selectSelector).val("default").selectpicker("refresh")
            }
        }
    }

    async _loadData(): Promise<void> {
        if (!this._dataLoaded) {
            this._frontlinesData = await loadJsonFile<FrontlinesPerServer>(`${this._map.serverName}-frontlines.json`)

            const distances = (
                await import(/* webpackChunkName: "data-distances" */ "../../../lib/gen-generic/distances.json")
            ).default as Distance[]
            this._distances = new Map(
                distances.map(([fromPortId, toPortId, distance]) => [
                    fromPortId * this._numberPorts + toPortId,
                    distance,
                ])
            )

            this._dataLoaded = true
        }
    }

    _setupListener(): void {
        $(this._portNamesSelector!).one("show.bs.select", () => {
            this._injectPortSelect()
        })
        this._portNamesSelector?.addEventListener("change", async (event) => {
            registerEvent("Menu", "Trade relations")
            await this._loadData()
            this._resetOtherSelects(this._portNamesSelector)
            this._portSelected()
            event.preventDefault()
        })

        $(this._buyGoodsSelector!).one("show.bs.select", async () => {
            await this._loadData()
            this._injectGoodsSelect()
        })
        this._buyGoodsSelector?.addEventListener("change", (event) => {
            registerEvent("Menu", "Goods’ relations")
            this._resetOtherSelects(this._buyGoodsSelector)
            this._goodSelected()
            event.preventDefault()
        })

        this._inventorySelector?.addEventListener("change", (event) => {
            registerEvent("Menu", "Inventory")
            this._resetOtherSelects(this._inventorySelector)
            this.inventorySelected()
            event.preventDefault()
        })

        this._frontlineAttackingNationSelector?.addEventListener("change", async (event) => {
            registerEvent("Menu", "Frontlines Attack")
            await this._loadData()
            this._resetOtherSelects(this._frontlineAttackingNationSelector)
            this._frontlineAttackingNationSelected()
            event.preventDefault()
        })

        this._frontlineDefendingNationSelector?.addEventListener("change", async (event) => {
            registerEvent("Menu", "Frontlines Defence")
            await this._loadData()
            this._resetOtherSelects(this._frontlineDefendingNationSelector)
            this._frontlineDefendingNationSelected()
            event.preventDefault()
        })

        this._propNationSelector?.addEventListener("change", (event) => {
            this._resetOtherSelects(this._propNationSelector)
            this._nationSelected()
            event.preventDefault()
        })

        this._propClanSelector?.addEventListener("change", (event) => {
            this._resetOtherSelects(this._propClanSelector)
            this._clanSelected()
            event.preventDefault()
        })

        document.querySelector("#menu-prop-deep")?.addEventListener("click", () => {
            this._depthSelected("deep")
        })
        document.querySelector("#menu-prop-shallow")?.addEventListener("click", () => {
            this._depthSelected("shallow")
        })
        document.querySelector("#menu-prop-all")?.addEventListener("click", () => {
            this._allSelected()
        })
        document.querySelector("#menu-prop-non-capturable")?.addEventListener("click", () => {
            this._nonCapSelected()
        })

        document.querySelector("#menu-prop-today")?.addEventListener("click", () => {
            this._capturedToday()
        })
        document.querySelector("#menu-prop-yesterday")?.addEventListener("click", () => {
            this._capturedYesterday()
        })
        document.querySelector("#menu-prop-this-week")?.addEventListener("click", () => {
            this._capturedThisWeek()
        })
        document.querySelector("#menu-prop-last-week")?.addEventListener("click", () => {
            this._capturedLastWeek()
        })

        initMultiDropdownNavbar("selectPortNavbar")
    }

    _injectPortSelect(): void {
        const selectPorts: SelectPort[] = this._ports.portDataDefault
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

        this._portNamesSelector?.insertAdjacentHTML("beforeend", options)
        $(this._portNamesSelector!).selectpicker("refresh")
    }

    _injectGoodsSelect(): void {
        const selectGoods = new Map<number, string>()
        const types = ["consumesTrading", "dropsTrading", "dropsNonTrading", "producesNonTrading"] as Array<
            keyof PortPerServer
        >
        for (const port of this._ports.portDataDefault) {
            for (const type of types) {
                const goodList = port[type] as GoodList
                if (goodList) {
                    for (const good of goodList) {
                        selectGoods.set(good, this._ports.tradeItem.get(good)?.name ?? "")
                    }
                }
            }
        }

        const sortedGoods = [...selectGoods].sort((a, b) => a[1].localeCompare(b[1]))
        const options = `${sortedGoods.map((good) => `<option value="${good[0]}">${good[1]}</option>`).join("")}`
        this._buyGoodsSelector?.insertAdjacentHTML("beforeend", options)
        $(this._buyGoodsSelector!).selectpicker("refresh")
    }

    setupInventorySelect(show: boolean): void {
        if (!this._inventorySelector?.classList.contains("selectpicker")) {
            const selectGoods = new Map<number, string>()

            for (const port of this._ports.portDataDefault) {
                if (port.inventory) {
                    for (const good of port.inventory) {
                        selectGoods.set(good.id, this._ports.tradeItem.get(good.id)?.name ?? "")
                    }
                }
            }

            const options = `${[...selectGoods]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map((good) => `<option value="${good[0]}">${good[1]}</option>`)
                .join("")}`

            this._inventorySelector?.insertAdjacentHTML("beforeend", options)
            this._inventorySelector?.classList.add("selectpicker")
            $(this._inventorySelector!).selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Show good availability",
                virtualScroll: true,
            })
        }

        if (show) {
            this._inventorySelector?.classList.remove("d-none")
            ;(this._inventorySelector?.parentNode as HTMLSelectElement).classList.remove("d-none")
        } else {
            this._inventorySelector?.classList.add("d-none")
            ;(this._inventorySelector?.parentNode as HTMLSelectElement).classList.add("d-none")
        }
    }

    _getNationOptions(neutralPortsIncluded = true): string {
        return `${nations
            // Exclude neutral nation and free towns when neutralPortsIncluded is set
            .filter((nation) => !(!neutralPortsIncluded && (nation.short === "FT" || nation.short === "NT")))
            .sort(sortBy(["name"]))
            .map((nation: Nation): string => `<option value="${nation.short}">${nation.name}</option>`)
            .join("")}`
    }

    _setupFrontlinesNationSelect(): void {
        const options = this._getNationOptions(false)

        this._frontlineAttackingNationSelector?.insertAdjacentHTML("beforeend", options)
        this._frontlineAttackingNationSelector?.classList.add("selectpicker")
        $(this._frontlineAttackingNationSelector!).selectpicker({
            dropupAuto: false,
            liveSearch: false,
            virtualScroll: true,
        })

        this._frontlineDefendingNationSelector?.insertAdjacentHTML("beforeend", options)
        this._frontlineDefendingNationSelector?.classList.add("selectpicker")
        $(this._frontlineDefendingNationSelector!).selectpicker({
            dropupAuto: false,
            liveSearch: false,
            virtualScroll: true,
        })
    }

    _setupNationSelect(): void {
        const options = this._getNationOptions(true)

        this._propNationSelector?.insertAdjacentHTML("beforeend", options)
        this._propNationSelector?.classList.add("selectpicker")
        $(this._propNationSelector!).selectpicker({
            dropupAuto: false,
            liveSearch: false,
            virtualScroll: true,
        })
    }

    _setupClanSelect(): void {
        const clanList = new Set<string>()
        for (const d of this._ports.portData.filter((d) => d?.capturer !== "")) {
            clanList.add(d.capturer!)
        }

        if (this._propClanSelector) {
            // noinspection InnerHTMLJS
            this._propClanSelector.innerHTML = ""
            let options = ""

            if (clanList.size === 0) {
                this._propClanSelector.disabled = true
            } else {
                this._propClanSelector.disabled = false
                options = `${[...clanList]
                    .sort(simpleStringSort)
                    .map((clan) => `<option value="${clan}" class="caps">${clan}</option>`)
                    .join("")}`
            }

            this._propClanSelector.insertAdjacentHTML("beforeend", options)
            this._propClanSelector.classList.add("selectpicker")
            $(this._propClanSelector).selectpicker({
                dropupAuto: false,
                liveSearch: false,
                virtualScroll: true,
            })
        }
    }

    _getSailingDistance(fromPortId: number, toPortId: number): number {
        return fromPortId < toPortId
            ? this._distances.get(fromPortId * this._numberPorts + toPortId) ?? 0
            : this._distances.get(toPortId * this._numberPorts + fromPortId) ?? 0
    }

    _setTradePortPartners(): void {
        const tradePort = (this._ports.portDataDefault.find((port) => port.id === this._ports.tradePortId) ??
            []) as PortWithTrades

        if (tradePort) {
            this._setTradeRelations(tradePort)
        }
    }

    _setTradeRelations(tradePort: PortWithTrades): void {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getBuyPrice = (itemId: number): number => this._ports.tradeItem.get(itemId)?.price ?? 0

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getDistanceFactor = (itemId: number): number => this._ports.tradeItem.get(itemId)?.distanceFactor ?? 0

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getPortTax = (portId: number): number =>
            this._ports.portDataDefault.find((port) => port.id === portId)?.portTax ?? 0

        // eslint-disable-next-line unicorn/consistent-function-scoping
        const getCoordinates = (portId: number): Coordinate => {
            const port = this._ports.portDataDefault.find((port) => port.id === portId)
            return { x: port?.coordinates[0] ?? 0, y: port?.coordinates[1] ?? 0 }
        }

        const getPlanarDistance = (fromPortId: number, toPortId: number): number => {
            const fromPortCoord = getCoordinates(fromPortId)
            const toPortCoord = getCoordinates(toPortId)

            return getDistance(fromPortCoord, toPortCoord)
        }

        const findClosestSourcePort = (sellPort: PortWithTrades, itemId: number): number => {
            let minDistance = Number.POSITIVE_INFINITY
            const sourcePortIds = new Set(
                this._ports.portDataDefault
                    .filter((port) => port.dropsTrading?.includes(itemId) ?? port.dropsNonTrading?.includes(itemId))
                    .map((port) => port.id)
            )

            for (const sourcePortId of sourcePortIds) {
                minDistance = Math.min(minDistance, getPlanarDistance(sourcePortId, sellPort.id))
            }

            return minDistance
        }

        const calculateSellProfit = (
            buyPort: PortWithTrades,
            sellPort: PortWithTrades,
            itemId: number
        ): TradeProfit => {
            const planarDistance = findClosestSourcePort(sellPort, itemId)
            const sailingDistance = this._getSailingDistance(buyPort.id, sellPort.id)
            const buyTax = getPortTax(buyPort.id)
            const sellTax = getPortTax(sellPort.id)
            let buyPrice = getBuyPrice(itemId)
            let sellPrice = buyPrice * 3 + (planarDistance * buyPrice * getDistanceFactor(itemId)) / 6 / 100
            buyPrice *= 1 + buyTax
            sellPrice /= 1 + sellTax
            const profit = Math.round(sellPrice - buyPrice)

            return { profit, profitPerDistance: profit / sailingDistance }
        }

        const getProfit = (buyPort: PortWithTrades, sellPort: PortWithTrades, itemId: number): TradeProfit => {
            const key = [sellPort.id, itemId] as [number, number]
            if (!this._sellProfit.has(key)) {
                this._sellProfit.set(key, calculateSellProfit(buyPort, sellPort, itemId))
            }

            return this._sellProfit.get(key)!
        }

        const getGoodsToBuyInTradePort = (sellPort: PortWithTrades): TradeGoodProfit[] => {
            const tradePortProducedGoods = new Set(tradePort.dropsTrading?.map((good) => good)) ?? []

            return (sellPort.consumesTrading
                ?.filter((good) => tradePortProducedGoods.has(good))
                .map((good) => ({
                    name: this._ports.tradeItem.get(good)?.name ?? "",
                    profit: getProfit(tradePort, sellPort, good),
                })) ?? []) as TradeGoodProfit[]
        }

        const getGoodsToSellInTradePort = (buyPort: PortWithTrades): TradeGoodProfit[] => {
            const tradePortConsumedGoods = new Set(tradePort.consumesTrading?.map((good) => good)) ?? []

            return (buyPort.dropsTrading
                ?.filter((good) => tradePortConsumedGoods.has(good))
                .map((good) => ({
                    name: this._ports.tradeItem.get(good)?.name ?? "",
                    profit: getProfit(buyPort, tradePort, good),
                })) ?? []) as TradeGoodProfit[]
        }

        this._ports.portData = this._ports.portDataDefault
            .map((port) => {
                port.sailingDistanceToTradePort = this._getSailingDistance(port.id, tradePort.id)
                port.goodsToBuyInTradePort = getGoodsToBuyInTradePort(port)
                port.buyInTradePort = port.goodsToBuyInTradePort.length > 0
                port.goodsToSellInTradePort = getGoodsToSellInTradePort(port)
                port.sellInTradePort = port.goodsToSellInTradePort.length > 0

                return port
            })
            .filter((port) => port.id === this._ports.tradePortId || port.sellInTradePort || port.buyInTradePort)
    }

    _portSelected(): void {
        const port = this._portNamesSelector?.options[this._portNamesSelector.selectedIndex]
        const c = port?.value.split(",")
        const id = Number(port?.getAttribute("data-id"))

        this._ports.currentPort = {
            id,
            coord: { x: Number(c?.[0]), y: Number(c?.[1]) },
        }
        this._ports.tradePortId = id

        this._setTradePortPartners()

        if (this._pbZone.showPB) {
            this._pbZone.refresh()
        }

        this._ports.showRadius = "tradePorts"
        this._ports.update()
        this._map.initialZoomAndPan()
    }

    _goodSelected(): void {
        const goodSelectedId = Number(this._buyGoodsSelector?.options[this._buyGoodsSelector.selectedIndex].value)

        const sourcePorts = (JSON.parse(
            JSON.stringify(
                this._ports.portDataDefault.filter(
                    (port) =>
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                        port.dropsTrading?.some((good: number) => good === goodSelectedId) ||
                        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                        port.dropsNonTrading?.some((good: number) => good === goodSelectedId) ||
                        port.producesNonTrading?.some((good: number) => good === goodSelectedId)
                )
            )
        ) as PortWithTrades[]).map((port) => {
            port.isSource = true
            return port
        })
        const consumingPorts = (JSON.parse(
            JSON.stringify(
                this._ports.portDataDefault.filter((port) =>
                    port.consumesTrading?.some((good) => good === goodSelectedId)
                )
            )
        ) as PortWithTrades[]).map((port) => {
            port.isSource = false
            return port
        })

        this._ports.setShowRadiusSetting("off")
        this._ports.portData = sourcePorts.concat(consumingPorts)
        this._ports.showRadius = "currentGood"
        this._ports.update()
    }

    inventorySelected(): void {
        this.isInventorySelected = true

        const goodIdSelected = Number(this._inventorySelector?.options[this._inventorySelector.selectedIndex].value)
        const buyGoods = new Map() as goodMap
        const sellGoods = new Map() as goodMap
        console.log(goodIdSelected)
        const portsFiltered = this._ports.portDataDefault
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

        const getPortList = (): HtmlString => {
            let h: HtmlString = ""

            h += `<h5>${this._ports.tradeItem.get(goodIdSelected)?.name ?? ""}</h5>`
            if (buyGoods.size) {
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

            if (sellGoods.size) {
                h += "<h6>Sell</h6>"
                for (const [, value] of sellGoods) {
                    h += `${value.name} <span class="caps">${value.nation}</span>: ${formatInt(
                        value.good.sellQuantity
                    )} @ ${formatSiCurrency(value.good.sellPrice)}<br>`
                }
            }

            return h
        }

        this._ports.setShowRadiusSetting("off")
        this._ports.portData = portsFiltered
        this._ports.showRadius = "tradePorts"
        if (this._map.showTrades.listType !== "portList") {
            this._map.showTrades.listType = "portList"
        }

        this._map.showTrades.update(getPortList())
        this._ports.update()
    }

    _setFrontlinePorts(type: keyof FrontlinesPerServer, nation: NationShortName): void {
        const ports = this._frontlinesData[type][nation]
        const enemyPorts = new Set<number>(ports.map((frontlinePort) => Number(frontlinePort.key)))
        const ownPorts = new Set<number>(ports.flatMap((frontlinePort) => frontlinePort.value.map((d) => d)))

        this._ports.portData = this._ports.portDataDefault.map((port) => {
            port.enemyPort = enemyPorts.has(port.id)
            port.ownPort = ownPorts.has(port.id)
            return port
        })
    }

    _frontlineAttackingNationSelected(): void {
        const nation =
            this._frontlineAttackingNationSelector?.options[this._frontlineAttackingNationSelector.selectedIndex]
                .value ?? ""

        if (validNationShortName(nation)) {
            this._setFrontlinePorts("attacking", nation)

            this._ports.showRadius = "frontline"
            this._ports.update()
        }
    }

    _frontlineDefendingNationSelected(): void {
        const nation =
            this._frontlineDefendingNationSelector?.options[this._frontlineDefendingNationSelector.selectedIndex]
                .value ?? ""

        if (validNationShortName(nation)) {
            this._setFrontlinePorts("defending", nation)

            this._ports.showRadius = "frontline"
            this._ports.update()
        }
    }

    _nationSelected(): void {
        this._nation = this._propNationSelector?.options[this._propNationSelector.selectedIndex].value ?? ""

        if (validNationShortName(this._nation)) {
            this._ports.portData = this._ports.portDataDefault.filter((port) => port.nation === this._nation)
            this._ports.showRadius = ""
            this._ports.update()
            this._setupClanSelect()
            $(this._propClanSelector!).selectpicker("refresh")
        } else {
            this._nation = "NT"
        }
    }

    _clanSelected(): void {
        const clan = this._propClanSelector?.options[this._propClanSelector.selectedIndex].value

        if (clan) {
            this._ports.portData = this._ports.portDataDefault.filter((port) => port.capturer === clan)
        } else if (this._nation) {
            this._ports.portData = this._ports.portDataDefault.filter((port) => port.nation === this._nation)
        }

        this._ports.showRadius = ""
        this._ports.update()
    }

    _depthSelected(depth: PortDepth): void {
        const portData = this._ports.portDataDefault.filter((d) => (depth === "shallow" ? d.shallow : !d.shallow))

        this._ports.portData = portData
        this._ports.showRadius = ""
        this._ports.update()
    }

    _allSelected(): void {
        const portData = this._ports.portDataDefault.filter((d) => d.availableForAll)

        this._ports.portData = portData
        this._ports.showRadius = ""
        this._ports.update()
    }

    _nonCapSelected(): void {
        const portData = this._ports.portDataDefault.filter((d) => !d.capturable)

        this._ports.portData = portData
        this._ports.showRadius = ""
        this._ports.update()
    }

    _filterCaptured(begin: Dayjs, end: Dayjs): void {
        // console.log("Between %s and %s", begin.format("dddd D MMMM YYYY H:mm"), end.format("dddd D MMMM YYYY H:mm"));
        const portData = this._ports.portDataDefault.filter((port) =>
            dayjs(port.captured, "YYYY-MM-DD HH:mm").isBetween(begin, end, "hour", "(]")
        )

        this._ports.portData = portData
        this._ports.showRadius = ""
        this._ports.update()
    }

    _capturedToday(): void {
        const now = dayjs.utc()
        let begin = dayjs().utc().hour(serverMaintenanceHour).minute(0)
        if (now.hour() < begin.hour()) {
            begin = begin.subtract(1, "day")
        }

        this._filterCaptured(begin, dayjs.utc(begin).add(1, "day"))
    }

    _capturedYesterday(): void {
        const now = dayjs.utc()
        let begin = dayjs().utc().hour(serverMaintenanceHour).minute(0).subtract(1, "day")
        if (now.hour() < begin.hour()) {
            begin = begin.subtract(1, "day")
        }

        this._filterCaptured(begin, dayjs.utc(begin).add(1, "day"))
    }

    _capturedThisWeek(): void {
        const currentMondayOfWeek = dayjs().utc().startOf("week")
        // This Monday
        const begin = currentMondayOfWeek.utc().hour(serverMaintenanceHour)
        // Next Monday
        const end = dayjs(currentMondayOfWeek).utc().add(7, "day").hour(serverMaintenanceHour)

        this._filterCaptured(begin, end)
    }

    _capturedLastWeek(): void {
        const currentMondayOfWeek = dayjs().utc().startOf("week")
        // Monday last week
        const begin = dayjs(currentMondayOfWeek).utc().subtract(7, "day").hour(serverMaintenanceHour)
        // This Monday
        const end = currentMondayOfWeek.utc().hour(serverMaintenanceHour)

        this._filterCaptured(begin, end)
    }

    clearMap(): void {
        this.isInventorySelected = false
        this._setupClanSelect()
        $(this._propClanSelector!).selectpicker("refresh")
    }
}
