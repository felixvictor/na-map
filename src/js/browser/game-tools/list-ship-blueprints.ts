/*!
 * This file is part of na-map.
 *
 * @file      List ship blueprints.
 * @module    game-tools/list-ship-blueprints
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
import "bootstrap/js/dist/modal"

import "bootstrap-select/js/bootstrap-select"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../analytics"
import { formatInt } from "../../common/common-format"

import { HtmlString, insertBaseModal } from "../../common/common-browser"
import { Price, ShipBlueprint, WoodData } from "../../common/gen-json"
import { putImportError, woodType, WoodType, WoodTypeList } from "../../common/common"
import { sortBy } from "../../common/common-node"
import * as d3Selection from "d3-selection"

interface ItemNeeded {
    // item
    0: string
    // Amount needed (number or formatted number)
    1: number | string
}
interface StandardCost {
    real: number
    labour: number
}
interface SeasonedCost extends StandardCost {
    doubloon: number
    tool: number
}
const tableType = ["Resources", "Extra", "Materials"] as const
type TableType = typeof tableType[number]
type TableTypeList<T> = {
    [K in TableType]: T
}

export default class ListShipBlueprints {
    private readonly _baseName: string
    private readonly _baseId: HtmlString
    private readonly _buttonId: HtmlString
    private readonly _modalId: HtmlString
    private _init = true
    private _blueprintData: ShipBlueprint[] = {} as ShipBlueprint[]
    private _woodData: WoodData = {} as WoodData
    private _extractionCosts: Map<string, StandardCost> = {} as Map<string, StandardCost>
    private _craftingCosts: Map<string, SeasonedCost> = {} as Map<string, SeasonedCost>
    private _blueprint!: string
    private _woodOptions: WoodTypeList<HtmlString> = {} as WoodTypeList<HtmlString>
    private readonly _defaultWood: WoodTypeList<string>
    private _woodsSelected: WoodTypeList<string> = {} as WoodTypeList<string>
    private _blueprintList!: d3Selection.Selection<HTMLDivElement, unknown, HTMLElement, unknown>
    private _currentBlueprint: ShipBlueprint = {} as ShipBlueprint
    private _tables: TableTypeList<
        d3Selection.Selection<HTMLTableElement, unknown, HTMLElement, unknown>
    > = {} as TableTypeList<d3Selection.Selection<HTMLTableElement, unknown, HTMLElement, unknown>>

    constructor() {
        this._baseName = "List ship blueprint"
        this._baseId = "ship-blueprint-list"
        this._buttonId = `button-${this._baseId}`
        this._modalId = `modal-${this._baseId}`

        this._defaultWood = {
            frame: "Fir",
            trim: "Crew Space",
        }

        this._setupListener()
    }

    async _loadAndSetupData() {
        try {
            this._blueprintData = (
                await import(/* webpackChunkName: "data-ship-blueprints" */ "Lib/gen-generic/ship-blueprints.json")
            ).default as ShipBlueprint[]
            this._woodData = (await import(/* webpackChunkName: "data-woods" */ "Lib/gen-generic/woods.json"))
                .default as WoodData

            /**
             * Extraction prices
             * - key: resource name
             * - values: extractionCost
             */
            const costs = (await import(/* webpackChunkName: "data-ship-blueprints" */ "Lib/gen-generic/prices.json"))
                .default as Price
            this._extractionCosts = new Map<string, StandardCost>(
                costs.standard.map((cost) => [cost.name, { real: cost.real, labour: cost.labour }])
            )
            this._craftingCosts = new Map<string, SeasonedCost>(
                costs.seasoned.map((cost) => [
                    cost.name,
                    { real: cost.real, labour: cost.labour, doubloon: cost.doubloon, tool: cost.tool },
                ])
            )
        } catch (error) {
            putImportError(error)
        }
    }

    _setupListener(): void {
        let firstClick = true

        document.querySelector(`#${this._buttonId}`)?.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)
            event.stopPropagation()
            this._listSelected()
        })
    }

    _injectModal(): void {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "lg" })

        const id = `${this._baseId}-ship-select`
        const body = d3Select(`#${this._modalId} .modal-body`)
        let row = body.append("div").classed("row no-gutters mb-2", true)
        row.append("label").attr("for", id)
        row.append("select").attr("name", id).attr("id", id)

        row = body.append("div").classed("row no-gutters", true)
        for (const type of woodType) {
            const selectId = `${this._baseId}-${type}-select`
            row.append("label").attr("for", selectId)
            row.append("select").attr("name", selectId).attr("id", selectId).classed("pr-2", true)
        }

        this._blueprintList = body.append("div").attr("id", `${this._baseId}`).classed("blueprint mt-4", true)
    }

    _getShipOptions(): HtmlString {
        return `${this._blueprintData
            .sort(sortBy(["name"]))
            .map((blueprint) => `<option value="${blueprint.name}">${blueprint.name}</option>;`)
            .join("")}`
    }

    _setupShipSelect(): void {
        const select$ = $(`#${this._baseId}-ship-select`)
        const options = this._getShipOptions()
        select$.append(options)
    }

    _setupWoodOptions(): void {
        const frameSelectData = this._woodData.frame.sort(sortBy(["name"]))
        const trimSelectData = this._woodData.trim.filter((trim) => trim.name !== "Light").sort(sortBy(["name"]))

        this._woodOptions = {
            frame: frameSelectData.map((wood) => `<option value="${wood.name}">${wood.name}</option>`).join(""),
            trim: trimSelectData.map((wood) => `<option value="${wood.name}">${wood.name}</option>`).join(""),
        }
    }

    _setupWoodSelect(type: WoodType, select$: JQuery): void {
        this._setupWoodOptions()
        this._woodsSelected[type] = this._defaultWood[type]
        select$.append(this._woodOptions[type])
        select$.attr("disabled", "disabled")
    }

    _setupSelects(): void {
        this._setupShipSelect()
        for (const type of woodType) {
            const select$ = $(`#${this._baseId}-${type}-select`)
            this._setupWoodSelect(type, select$)
        }
    }

    _setupShipSelectListener(): void {
        const select$ = $(`#${this._baseId}-ship-select`)

        select$
            .addClass("selectpicker")
            .on("change", (event) => this._blueprintSelected(event))
            .selectpicker({ noneSelectedText: "Select blueprint", width: "fit" })
            .val("default")
            .selectpicker("refresh")
    }

    _setupWoodSelectListener(type: WoodType, select$: JQuery): void {
        select$
            .addClass("selectpicker")
            .on("change", () => this._woodSelected(type, select$))
            .selectpicker({ noneSelectedText: `Select ${type}`, width: "fit" })
            .val("default")
            .selectpicker("refresh")
    }

    _setupSelectListener(): void {
        this._setupShipSelectListener()
        for (const type of woodType) {
            const select$ = $(`#${this._baseId}-${type}-select`)
            this._setupWoodSelectListener(type, select$)
        }
    }

    _initModal(): void {
        this._injectModal()
        this._setupSelects()
        this._setupSelectListener()
    }

    _setWoodSelect(type: WoodType): void {
        $(`#${this._baseId}-${type}-select`).removeAttr("disabled").val(this._defaultWood[type]).selectpicker("refresh")
    }

    _woodSelected(type: WoodType, select$: JQuery): void {
        this._woodsSelected[type] = select$.val() as string
        this._updateText()
    }

    _listSelected(): void {
        // If the modal has no content yet, insert it
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }

    _updateTable(
        elem: d3Selection.Selection<HTMLTableElement, unknown, HTMLElement, unknown>,
        dataBody: ItemNeeded[]
    ): void {
        const addBody = (): void => {
            // Data join rows
            const rows = elem
                .select("tbody")
                .selectAll("tr")
                .data(dataBody)
                .join((enter) => enter.append("tr"))

            // Data join cells
            // @ts-ignore
            rows.selectAll("td")
                .data((d) => d)
                // @ts-ignore
                .join((enter) => enter.append("td"))
                // @ts-ignore
                .html((d) => d)
        }

        addBody()
    }

    /**
     * Construct ship blueprint tables
     */
    _updateText(): void {
        /**
         * Default resources
         */
        let defaultResources = this._currentBlueprint.resources.map(
            (resource) => [resource.name, resource.amount] as ItemNeeded
        )

        // Add trim
        let frameAdded = false
        let trimAdded = false
        let frameAmount = 0
        let trimAmount = 0
        // Crew space means additional hemp
        if (this._woodsSelected.trim === "Crew Space") {
            const hempAmount = this._currentBlueprint.wood.find((wood) => wood.name === "Crew Space")!.amount
            const index = defaultResources.findIndex((resource) => resource[0] === "Hemp")
            defaultResources[index][1] = (defaultResources[index][1] as number) + hempAmount
        } else {
            trimAmount = this._currentBlueprint.wood.find((wood) => wood.name === "Planking")!.amount
            // Frame and trim have same wood: add trim to frame
            if (this._woodsSelected.trim === this._woodsSelected.frame) {
                frameAmount += trimAmount
            } else {
                const index = defaultResources.findIndex((resource) => resource[0] === this._woodsSelected.trim)
                // Trim wood is already part of default resources (fir and oak log)
                if (index >= 0) {
                    defaultResources[index][1] = (defaultResources[index][1] as number) + trimAmount
                } else {
                    // Trim is an additional resource
                    trimAdded = true
                    defaultResources.push([this._woodsSelected.trim, trimAmount])
                }
            }
        }

        // Add frame
        frameAmount += this._currentBlueprint.wood.find((wood) => wood.name === "Frame")!.amount
        const index = defaultResources.findIndex((resource) => resource[0] === this._woodsSelected.frame)
        if (index >= 0) {
            // Frame wood is already part of default resources (fir and oak log)
            defaultResources[index][1] = (defaultResources[index][1] as number) + frameAmount
        } else {
            // Frame is an additional resource
            frameAdded = true
            defaultResources.push([this._woodsSelected.frame, frameAmount])
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

        if (this._currentBlueprint.doubloons) {
            extraResources.push(["Doubloons", this._currentBlueprint.doubloons])
        }

        extraResources.push(["Provisions", this._currentBlueprint.provisions])

        if (this._currentBlueprint.permit) {
            extraResources.push(["Permit", this._currentBlueprint.permit])
        }

        extraResources.push(
            ["Craft level", this._currentBlueprint.craftLevel],
            ["Shipyard level", this._currentBlueprint.shipyardLevel],
            ["Labour hours", this._currentBlueprint.labourHours],
            ["Craft experience", this._currentBlueprint.craftXP]
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
            this._extractionCosts.get(item[0])!.real * (item[1] as number)

        /**
         * Total labour hours per item
         * @param item - Needed item
         * @returns Amount times labour hours
         */
        const getTotalExtractionLabour = (item: ItemNeeded): number =>
            this._extractionCosts.get(item[0])!.labour * (item[1] as number)

        /**
         * Calculate total extraction costs
         * @param data - Needed item
         */
        const addExtractionCosts = (data: ItemNeeded[]): void => {
            for (const cost of data.filter((data) => this._extractionCosts.has(data[0]))) {
                extractionPrice += getTotalExtractionPrice(cost)
                extractionLabour += getTotalExtractionLabour(cost)
            }
        }

        addExtractionCosts(defaultResources)
        addExtractionCosts(extraResources)

        if (extractionPrice) {
            materials.push(["Reals", formatInt(extractionPrice)], ["Labour hours", formatInt(extractionLabour)])
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

        // noinspection DuplicatedCode
        if (this._craftingCosts.has(this._woodsSelected.trim)) {
            sLogPrice += this._craftingCosts.get(this._woodsSelected.trim)!.real * trimAmount
            sLogLabour += this._craftingCosts.get(this._woodsSelected.trim)!.labour * trimAmount
            sLogDoubloons += this._craftingCosts.get(this._woodsSelected.trim)!.doubloon * trimAmount
            sLogTools += this._craftingCosts.get(this._woodsSelected.trim)!.tool * trimAmount
        }

        // noinspection DuplicatedCode
        if (this._craftingCosts.has(this._woodsSelected.frame)) {
            sLogPrice += this._craftingCosts.get(this._woodsSelected.frame)!.real * frameAmount
            sLogLabour += this._craftingCosts.get(this._woodsSelected.frame)!.labour * frameAmount
            sLogDoubloons += this._craftingCosts.get(this._woodsSelected.frame)!.doubloon * frameAmount
            sLogTools += this._craftingCosts.get(this._woodsSelected.frame)!.tool * frameAmount
        }

        if (sLogPrice) {
            materials.push(
                ["(S) reals", formatInt(sLogPrice)],
                ["(S) labour hours", formatInt(sLogLabour)],
                ["(S) doubloons", formatInt(sLogDoubloons)],
                ["(S) tools", formatInt(sLogTools)]
            )
        }

        // Format amounts
        defaultResources = defaultResources.map((data) => [data[0], formatInt(data[1] as number)])
        extraResources = extraResources.map((data) => [data[0], formatInt(data[1] as number)])

        // Display amounts
        this._updateTable(this._tables.Resources, defaultResources)
        this._updateTable(this._tables.Extra, extraResources)
        this._updateTable(this._tables.Materials, materials)
    }

    /**
     * Show buildings for selected building type
     * @param event - Event
     */
    _blueprintSelected(event: JQuery.ChangeEvent): void {
        if (this._init) {
            this._init = false
            for (const type of woodType) {
                this._setWoodSelect(type)
            }

            const cardDeck = this._blueprintList.append("div").classed("card-deck", true)

            const addCard = (title: TableType): void => {
                const card = cardDeck.append("div").classed("card", true)
                card.append("div").classed("card-header", true).text(title)
                const cardBody = card.append("div").classed("card-body", true)
                this._tables[title] = cardBody.append("table").classed("table table-sm card-table", true)
                this._tables[title].append("thead")
                this._tables[title].append("tbody")
            }

            for (const type of tableType) {
                addCard(type)
            }
        }

        this._blueprint = $(event.currentTarget).find(":selected").val() as string
        this._currentBlueprint = this._getBlueprintData(this._blueprint)

        this._updateText()
    }

    _getBlueprintData(selectedBlueprint: string): ShipBlueprint {
        return this._blueprintData.find((blueprint) => blueprint.name === selectedBlueprint)!
    }
}
