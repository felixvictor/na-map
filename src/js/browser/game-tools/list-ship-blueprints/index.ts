/*!
 * This file is part of na-map.
 *
 * @file      List ship blueprints.
 * @module    game-tools/list-ship-blueprints
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { Selection } from "d3-selection"

import { registerEvent } from "../../analytics"
import { sortBy } from "common/common"
import { getIdFromBaseName } from "common/common-browser"
import { formatInt } from "common/common-format"

import { Price, ShipBlueprint } from "common/gen-json"
import { HtmlString } from "common/interface"
import { WoodColumnTypeList, WoodTypeList } from "compare-woods"

import { woodType } from "common/types"

import { WoodData } from "../compare-woods/data"
import Modal from "util/modal"
import Select from "util/select"

interface ItemNeeded {
    // item
    0: string
    // Amount needed (number or formatted number)
    1: number | string
}
interface StandardCost {
    reales: number
    labour: number
}
interface SeasonedCost extends StandardCost {
    doubloon: number
    tool: number
}
const tableType = ["Resources", "Extra", "Materials"]!
type TableType = typeof tableType[number]
type TableTypeList<T> = {
    [K in TableType]: T
}

export default class ListShipBlueprints {
    #blueprint!: string
    #blueprintData = [] as ShipBlueprint[]
    #craftingCosts = {} as Map<string, SeasonedCost>
    #currentBlueprint = {} as ShipBlueprint
    #extractionCosts = {} as Map<string, StandardCost>
    #modal: Modal | undefined = undefined
    #selectShip = {} as Select
    #selectWood = {} as WoodColumnTypeList<Select>
    #tables = {} as TableTypeList<Selection<HTMLTableElement, unknown, HTMLElement, unknown>>
    #woodData = {} as WoodData
    readonly #baseId: HtmlString
    readonly #baseName = "List of ship blueprints"
    readonly #menuId: HtmlString

    constructor() {
        this.#baseId = getIdFromBaseName(this.#baseName)
        this.#menuId = `menu-${this.#baseId}`

        this._setupListener()
    }

    async _setupWoodData(): Promise<void> {
        this.#woodData = new WoodData(this.#baseId)
        await this.#woodData.init()
    }

    async _loadAndSetupData(): Promise<void> {
        this.#blueprintData = (
            await import(
                /* webpackChunkName: "data-ship-blueprints" */ "../../../../../lib/gen-generic/ship-blueprints.json"
            )
        ).default as ShipBlueprint[]

        /**
         * Extraction prices
         * - key: resource name
         * - values: extractionCost
         */
        const costs = (
            await import(/* webpackChunkName: "data-ship-blueprints" */ "../../../../../lib/gen-generic/prices.json")
        ).default as Price
        this.#extractionCosts = new Map<string, StandardCost>(
            costs.standard.map((cost) => [cost.name, { reales: cost.reales, labour: cost?.labour ?? 0 }])
        )
        this.#craftingCosts = new Map<string, SeasonedCost>(
            costs.seasoned.map((cost) => [
                cost.name,
                { reales: cost.reales, labour: cost.labour, doubloon: cost.doubloon, tool: cost.tool },
            ])
        )

        await this._setupWoodData()
    }

    async _menuClicked(): Promise<void> {
        registerEvent("Tools", this.#baseName)

        if (this.#modal) {
            this.#modal.show()
        } else {
            await this._loadAndSetupData()
            this.#modal = new Modal(this.#baseName, "lg")
            this._setupSelects()
            this._setupShipSelectListener()
            this._setupWoodSelectListener()
        }
    }

    _setupListener(): void {
        document.querySelector(`#${this.#menuId}`)?.addEventListener("click", () => {
            void this._menuClicked()
        })
    }

    _getOptions(): HtmlString {
        return `${this.#blueprintData
            .sort(sortBy(["name"]))
            .map((blueprint) => `<option value="${blueprint.name}">${blueprint.name}</option>;`)
            .join("")}`
    }

    _setupShipSelect(): void {
        const bsSelectOptions: Partial<BootstrapSelectOptions> = { noneSelectedText: "Select blueprint" }

        this.#selectShip = new Select(this.#baseId, this.#modal!.baseIdSelects, bsSelectOptions, this._getOptions())
    }

    _setupWoodSelects(): void {
        for (const type of woodType) {
            const bsSelectOptions: Partial<BootstrapSelectOptions> = { noneSelectedText: `Select ${type}` }
            this.#selectWood[type] = new Select(
                `${this.#baseId}-wood-${type}`,
                this.#modal!.baseIdSelects,
                bsSelectOptions,
                this.#woodData.getOptions(type)
            )
            this.#selectWood[type].disable()
        }
    }

    _setupSelects(): void {
        this.#modal!.selectsSel.attr("class", "d-flex justify-content-between")
        this._setupShipSelect()
        this._setupWoodSelects()
    }

    _enableWoodSelects(): void {
        for (const type of woodType) {
            this.#selectWood[type].enable()
        }
    }

    _setDefaultWoods(): void {
        const defaultWood: WoodTypeList<number> = {
            frame: this.#woodData.findWoodId("frame", "Fir"),
            trim: this.#woodData.findWoodId("trim", "Crew Space"),
        }

        for (const type of woodType) {
            this.#selectWood[type].reset(defaultWood[type])
        }
    }

    _setupShipSelectListener(): void {
        this.#selectShip.select$
            .one("change", () => {
                this._enableWoodSelects()
                this._setDefaultWoods()
                this._initOutput()
            })
            .on("change", () => {
                this.#blueprint = String(this.#selectShip.getValues())
                this.#currentBlueprint = this._getBlueprintData(this.#blueprint)
                this._updateText()
            })
    }

    _setupWoodSelectListener(): void {
        for (const type of woodType) {
            this.#selectWood[type].select$.on("change", () => {
                this._updateText()
            })
        }
    }

    _updateTable(elem: Selection<HTMLTableElement, unknown, HTMLElement, unknown>, dataBody: ItemNeeded[]): void {
        const addBody = (): void => {
            // Data join rows
            const rows = elem
                .select("tbody")
                .selectAll("tr")
                .data(dataBody)
                .join((enter) => enter.append("tr"))

            // Data join cells
            // @ts-expect-error
            rows.selectAll("td")
                .data((d) => d)
                .join((enter) => enter.append("td"))
                .classed("text-start", (d, i) => i === 0)
                .html((d) => d)
        }

        addBody()
    }

    _getResourceAmount = (resourceName: string): number =>
        this.#currentBlueprint.wood.find((wood) => wood.name === resourceName)?.amount ?? 0

    /**
     * Construct ship blueprint tables
     */
    _updateText(): void {
        /**
         * Default resources
         */
        let defaultResources = this.#currentBlueprint.resources.map(
            (resource) => [resource.name, resource.amount] as ItemNeeded
        )

        const getIndex = (resourceName: string): number =>
            defaultResources.findIndex((resource) => resource[0] === resourceName) ?? 0

        const trimWood = this.#woodData.getWoodName(Number(this.#selectWood.trim.getValues()))
        const frameWood = this.#woodData.getWoodName(Number(this.#selectWood.frame.getValues()))

        // Add trim
        let frameAdded = false
        let trimAdded = false
        let frameAmount = 0
        let trimAmount = 0
        // Crew space means additional hemp
        if (trimWood === "Crew Space") {
            const hempAmount = this._getResourceAmount("Crew Space")
            const index = getIndex("Hemp")
            defaultResources[index][1] = (defaultResources[index][1] as number) + hempAmount
        } else {
            trimAmount = this._getResourceAmount("Planking")
            // Frame and trim have same wood: add trim to frame
            if (trimWood === frameWood) {
                frameAmount += trimAmount
            } else {
                const index = getIndex(trimWood)
                // Trim wood is already part of default resources (fir and oak log)
                if (index >= 0) {
                    defaultResources[index][1] = (defaultResources[index][1] as number) + trimAmount
                } else {
                    // Trim is an additional resource
                    trimAdded = true
                    defaultResources.push([trimWood, trimAmount])
                }
            }
        }

        // Add frame
        frameAmount += this._getResourceAmount("Frame")
        const index = getIndex(frameWood)
        if (index >= 0) {
            // Frame wood is already part of default resources (fir and oak log)
            defaultResources[index][1] = (defaultResources[index][1] as number) + frameAmount
        } else {
            // Frame is an additional resource
            frameAdded = true
            defaultResources.push([frameWood, frameAmount])
        }

        // Order frame before trim if both are added
        if (frameAdded && trimAdded) {
            const frameIndex = defaultResources.length - 1
            ;[defaultResources[frameIndex], defaultResources[frameIndex - 1]] = [
                defaultResources[frameIndex - 1],
                defaultResources[frameIndex],
            ]
        }

        /**
         * Extra resources
         */
        let extraResources = [] as ItemNeeded[]

        if (this.#currentBlueprint.price) {
            extraResources.push(["Reales", this.#currentBlueprint.price])
        }

        extraResources.push(["Provisions", this.#currentBlueprint.provisions])

        if (this.#currentBlueprint.permit) {
            extraResources.push(["Permit", this.#currentBlueprint.permit])
        }

        extraResources.push(
            ["Craft level", this.#currentBlueprint.craftLevel],
            ["Shipyard level", this.#currentBlueprint.shipyardLevel],
            ["Labour hours", this.#currentBlueprint.labourHours],
            ["Craft experience", this.#currentBlueprint.craftXP]
        )

        // Add extraction price and labour
        /**
         * Extra resources
         */
        const materials = [] as ItemNeeded[]

        /**
         * Total (extraction price
         */
        let extractionPrice = 0

        /**
         * Total extraction labour hours
         */
        let extractionLabour = 0

        /**
         * Total price per item
         * @param item - Needed item
         * @returns Amount times price
         */
        const getTotalExtractionPrice = (item: ItemNeeded): number =>
            (this.#extractionCosts.get(item[0])?.reales ?? 0) * (item[1] as number)

        /**
         * Total labour hours per item
         * @param item - Needed item
         * @returns Amount times labour hours
         */
        const getTotalExtractionLabour = (item: ItemNeeded): number =>
            (this.#extractionCosts.get(item[0])?.labour ?? 0) * (item[1] as number)

        /**
         * Calculate total extraction costs
         * @param data - Needed item
         */
        const addExtractionCosts = (data: ItemNeeded[]): void => {
            for (const cost of data.filter((data) => this.#extractionCosts.has(data[0]))) {
                extractionPrice += getTotalExtractionPrice(cost)
                extractionLabour += getTotalExtractionLabour(cost)
            }
        }

        addExtractionCosts(defaultResources)
        addExtractionCosts(extraResources)

        if (extractionPrice) {
            materials.push(["Reales", formatInt(extractionPrice)], ["Labour hours", formatInt(extractionLabour)])
        }

        /**
         * Total (S) log price
         */
        let sLogPrice = 0

        /**
         * Total (S) log labour hours
         */
        let sLogLabour = 0

        /**
         * Total (S) log doubloons
         */
        let sLogDoubloons = 0

        /**
         * Total (S) log tools
         */
        let sLogTools = 0

        for (const type of woodType) {
            const craftingCosts = this.#craftingCosts.get(String(this.#selectWood[type].getValues()))
            if (craftingCosts) {
                sLogPrice += (craftingCosts.reales ?? 0) * frameAmount
                sLogLabour += (craftingCosts.labour ?? 0) * frameAmount
                sLogDoubloons += (craftingCosts.doubloon ?? 0) * frameAmount
                sLogTools += (craftingCosts.tool ?? 0) * frameAmount
            }
        }

        if (sLogPrice) {
            materials.push(["(S) reales", formatInt(sLogPrice)])
        }

        if (sLogLabour) {
            materials.push(["(S) labour hours", formatInt(sLogLabour)])
        }

        if (sLogDoubloons) {
            materials.push(["(S) doubloons", formatInt(sLogDoubloons)])
        }

        if (sLogTools) {
            materials.push(["(S) tools", formatInt(sLogTools)])
        }

        // Format amounts
        defaultResources = defaultResources.map((data) => [data[0], formatInt(data[1] as number)])
        extraResources = extraResources.map((data) => [data[0], formatInt(data[1] as number)])

        // Display amounts
        this._updateTable(this.#tables.Resources, defaultResources)
        this._updateTable(this.#tables.Extra, extraResources)
        this._updateTable(this.#tables.Materials, materials)
    }

    _getBlueprintData(selectedBlueprint: string): ShipBlueprint {
        return this.#blueprintData.find((blueprint) => blueprint.name === selectedBlueprint) ?? ({} as ShipBlueprint)
    }

    _initOutput(): void {
        const cardDeck = this.#modal!.outputSel.append("div").attr("class", "card-group mt-3")

        const addCard = (title: TableType): void => {
            const card = cardDeck.append("div").attr("class", "card")
            const cardBody = card.append("div").attr("class", "card-body")
            cardBody.append("h5").attr("class", "card-title").text(title)
            this.#tables[title] = cardBody.append("table").attr("class", "table table-sm table-striped table-hover")
            this.#tables[title].append("thead")
            this.#tables[title].append("tbody")
        }

        for (const type of tableType) {
            addCard(type)
        }
    }
}
