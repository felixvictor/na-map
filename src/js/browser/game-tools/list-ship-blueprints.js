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
/// <reference types="bootstrap" />
import "bootstrap/js/dist/modal"
import "bootstrap-select/js/bootstrap-select"
import { select as d3Select } from "d3-selection"

import { registerEvent } from "../analytics"
import { insertBaseModal } from "../../common/interfaces"
import { putImportError, sortBy } from "../util"
import { formatInt } from "../../common/common-format";

export default class ListShipBlueprints {
    constructor() {
        this._baseName = "List ship blueprint"
        this._baseId = "ship-blueprint-list"
        this._buttonId =`button-${this._baseId}`
        this._modalId =`modal-${this._baseId}`

        this._defaultWood = {
            frame: "Fir",
            trim: "Crew Space"
        }
        this._woodsSelected = []
        this._woodOptions = {}
        this._tables = []
        this._init = true

        this._setupListener()
    }

    async _loadAndSetupData() {
        try {
            this._blueprintData = (
                await import(/* webpackChunkName: "data-ship-blueprints" */ "~Lib/gen-generic/ship-blueprints.json")
            ).default
            this._woodData = (await import(/* webpackChunkName: "data-woods" */ "~Lib/gen-generic/woods.json")).default
            /**
             * @typedef {object} extractionCost
             * @property {Number} price Extraction price
             * @property {Number} labour Extraction labour
             */

            /**
             * Extraction prices
             * - key: resource name
             * - values: extractionCost
             * @type {Map<string, extractionCost>}
             * @private
             */
            const costs = (await import(/* webpackChunkName: "data-ship-blueprints" */ "~Lib/gen-generic/prices.json"))
                .default
            this._extractionCosts = new Map(
                costs.standard.map(cost => [cost.name, { real: cost.real, labour: cost.labour }])
            )
            this._craftingCosts = new Map(
                costs.seasoned.map(cost => [
                    cost.name,
                    { real: cost.real, labour: cost.labour, doubloon: cost.doubloon, tool: cost.tool }
                ])
            )
        } catch (error) {
            putImportError(error)
        }
    }

    _setupListener() {
        let firstClick = true

        document.getElementById(this._buttonId).addEventListener("click", async event => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)
            event.stopPropagation()
            this._listSelected()
        })
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "lg")

        const id =`${this._baseId}-ship-select`
        const body = d3Select(`#${this._modalId} .modal-body`)
        let row = body.append("div").classed("row no-gutters mb-2", true)
        row.append("label").attr("for", id)
        row.append("select")
            .attr("name", id)
            .attr("id", id)

        row = body.append("div").classed("row no-gutters", true)
        for (const type of ["frame", "trim"]) {
            const selectId =`${this._baseId}-${type}-select`
            row.append("label").attr("for", selectId)
            row.append("select")
                .attr("name", selectId)
                .attr("id", selectId)
                .classed("pr-2", true)
        }

        this._blueprintList = body
            .append("div")
            .attr("id",`${this._baseId}`)
            .classed("blueprint mt-4", true)
    }

    _getShipOptions() {
        return`${this._blueprintData
            .sort(sortBy(["name"]))
            .map(blueprint =>`<option value="${blueprint.name}">${blueprint.name}</option>;`)
            .join("")}`
    }

    _setupShipSelect() {
        const select$ = $(`#${this._baseId}-ship-select`)
        const options = this._getShipOptions()
        select$.append(options)
    }

    _setupWoodOptions() {
        const frameSelectData = this._woodData.frame.sort(sortBy(["name"]))
        const trimSelectData = this._woodData.trim.filter(trim => trim.name !== "Light").sort(sortBy(["name"]))

        this._woodOptions.frame = frameSelectData.map(wood =>`<option value="${wood.name}">${wood.name}</option>`)
        this._woodOptions.trim = trimSelectData.map(wood =>`<option value="${wood.name}">${wood.name}</option>`)
    }

    _setupWoodSelect(type, select$) {
        this._setupWoodOptions()
        this._woodsSelected[type] = this._defaultWood[type]
        select$.append(this._woodOptions[type])
        select$.attr("disabled", "disabled")
    }

    _setupSelects() {
        this._setupShipSelect()
        for (const type of ["frame", "trim"]) {
            const select$ = $(`#${this._baseId}-${type}-select`)
            this._setupWoodSelect(type, select$)
        }
    }

    _setupShipSelectListener() {
        const select$ = $(`#${this._baseId}-ship-select`)

        select$
            .addClass("selectpicker")
            .on("change", event => this._blueprintSelected(event))
            .selectpicker({ noneSelectedText: "Select blueprint", width: "fit" })
            .val("default")
            .selectpicker("refresh")
    }

    _setupWoodSelectListener(type, select$) {
        select$
            .addClass("selectpicker")
            .on("change", () => this._woodSelected(type, select$))
            .selectpicker({ noneSelectedText:`Select ${type}`, width: "fit" })
            .val("default")
            .selectpicker("refresh")
    }

    _setupSelectListener() {
        this._setupShipSelectListener()
        for (const type of ["frame", "trim"]) {
            const select$ = $(`#${this._baseId}-${type}-select`)
            this._setupWoodSelectListener(type, select$)
        }
    }

    _initModal() {
        this._injectModal()
        this._setupSelects()
        this._setupSelectListener()
    }

    _setWoodSelect(type) {
        $(`#${this._baseId}-${type}-select`)
            .removeAttr("disabled")
            .val(this._defaultWood[type])
            .selectpicker("refresh")
    }

    _woodSelected(type, select$) {
        this._woodsSelected[type] = select$.val()
        this._updateText()
    }

    _listSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`).modal("show")
    }

    _updateTable(elem, dataBody, dataHead = []) {
        const addHead = () => {
            // Data join rows
            const tableRowUpdate = elem
                .select("thead")
                .selectAll("tr")
                .data(dataHead, d => d[0])

            // Remove old rows
            tableRowUpdate.exit().remove()

            // Add new rows
            const tableRowEnter = tableRowUpdate.enter().append("tr")

            // Merge rows
            const row = tableRowUpdate.merge(tableRowEnter)

            // Data join cells
            const tableCellUpdate = row.selectAll("th").data(d => d)

            // Remove old cells
            tableCellUpdate.exit().remove()

            // Add new cells
            const tableCellEnter = tableCellUpdate.enter().append("th")

            // Merge cells
            tableCellUpdate.merge(tableCellEnter).html(d => d)
        }

        const addBody = () => {
            // Data join rows
            const rows = elem
                .select("tbody")
                .selectAll("tr")
                .data(dataBody)
                .join(enter => enter.append("tr"))

            // Data join cells
            rows.selectAll("td")
                .data(d => d)
                .join(enter => enter.append("td"))
                .html(d => d)
        }

        if (dataHead.length) {
            addHead()
        }

        addBody()
    }

    /**
     * Construct ship blueprint tables
     * @return {void}
     * @private
     */
    _updateText() {
        /**
         * @typedef {Array} itemsNeeded
         * @property {string} item
         * @property {number|string} Amount needed (number or formatted number)
         */

        /**
         * Default resources
         * @type {itemsNeeded}
         */
        let defaultResources = this._currentBlueprintData.resources.map(resource => [resource.name, resource.amount])

        // Add trim
        let frameAdded = false
        let trimAdded = false
        let frameAmount = 0
        let trimAmount = 0
        // Crew space means additional hemp
        if (this._woodsSelected.trim === "Crew Space") {
            const hempAmount = this._currentBlueprintData.wood.find(wood => wood.name === "Crew Space").amount
            const index = defaultResources.findIndex(resource => resource[0] === "Hemp")
            defaultResources[index][1] += hempAmount
        } else {
            trimAmount = this._currentBlueprintData.wood.find(wood => wood.name === "Planking").amount
            // Frame and trim have same wood: add trim to frame
            if (this._woodsSelected.trim === this._woodsSelected.frame) {
                frameAmount += trimAmount
            } else {
                const index = defaultResources.findIndex(resource => resource[0] === this._woodsSelected.trim)
                // Trim wood is already part of default resources (fir and oak log)
                if (index >= 0) {
                    defaultResources[index][1] += trimAmount
                } else {
                    // Trim is an additional resource
                    trimAdded = true
                    defaultResources.push([this._woodsSelected.trim, trimAmount])
                }
            }
        }

        // Add frame
        frameAmount += this._currentBlueprintData.wood.find(wood => wood.name === "Frame").amount
        const index = defaultResources.findIndex(resource => resource[0] === this._woodsSelected.frame)
        if (index >= 0) {
            // Frame wood is already part of default resources (fir and oak log)
            defaultResources[index][1] += frameAmount
        } else {
            // Frame is an additional resource
            frameAdded = true
            defaultResources.push([this._woodsSelected.frame, frameAmount])
        }

        // Order frame before trim if both are added
        if (frameAdded && trimAdded) {
            const frameIndex = defaultResources.length - 1
            // eslint-disable-next-line semi-style
            ;[defaultResources[frameIndex], defaultResources[frameIndex - 1]] = [
                defaultResources[frameIndex - 1],
                defaultResources[frameIndex]
            ]
        }

        /**
         * Extra resources
         * @type {itemsNeeded}
         */
        let extraResources = []

        if (this._currentBlueprintData.doubloons) {
            extraResources.push(["Doubloons", this._currentBlueprintData.doubloons])
        }

        extraResources.push(["Provisions", this._currentBlueprintData.provisions])

        if (this._currentBlueprintData.permit) {
            extraResources.push(["Permit", this._currentBlueprintData.permit])
        }

        extraResources.push(
            ["Craft level", this._currentBlueprintData.craftLevel],
            ["Shipyard level", this._currentBlueprintData.shipyardLevel],
            ["Labour hours", this._currentBlueprintData.labourHours],
            ["Craft experience", this._currentBlueprintData.craftXP]
        )

        // Add extraction price and labour
        /**
         * Extra resources
         * @type {itemsNeeded}
         */
        const materials = []

        /**
         * Total (extraction price
         * @type {number}
         */
        let extractionPrice = 0

        /**
         * Total extraction labour hours
         * @type {number}
         */
        let extractionLabour = 0

        /**
         * Total price per item
         * @param item {itemsNeeded}
         * @return {number} Amount times price
         */
        const getTotalExtractionPrice = item => this._extractionCosts.get(item[0]).real * item[1]

        /**
         * Total labour hours per item
         * @param item {itemsNeeded}
         * @return {number} Amount times labour hours
         */
        const getTotalExtractionLabour = item => this._extractionCosts.get(item[0]).labour * item[1]

        /**
         * Calculate total extraction costs
         * @param data {itemsNeeded}
         */
        const addExtractionCosts = data => {
            for (const cost of data.filter(data => this._extractionCosts.has(data[0]))) {
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
         * @type {number}
         */
        let sLogPrice = 0

        /**
         * Total (S) log labour hours
         * @type {number}
         */
        let sLogLabour = 0

        /**
         * Total (S) log doubloons
         * @type {number}
         */
        let sLogDoubloons = 0

        /**
         * Total (S) log tools
         * @type {number}
         */
        let sLogTools = 0

        // noinspection DuplicatedCode
        if (this._craftingCosts.has(this._woodsSelected.trim)) {
            sLogPrice += this._craftingCosts.get(this._woodsSelected.trim).real * trimAmount
            sLogLabour += this._craftingCosts.get(this._woodsSelected.trim).labour * trimAmount
            sLogDoubloons += this._craftingCosts.get(this._woodsSelected.trim).doubloon * trimAmount
            sLogTools += this._craftingCosts.get(this._woodsSelected.trim).tool * trimAmount
        }

        // noinspection DuplicatedCode
        if (this._craftingCosts.has(this._woodsSelected.frame)) {
            sLogPrice += this._craftingCosts.get(this._woodsSelected.frame).real * frameAmount
            sLogLabour += this._craftingCosts.get(this._woodsSelected.frame).labour * frameAmount
            sLogDoubloons += this._craftingCosts.get(this._woodsSelected.frame).doubloon * frameAmount
            sLogTools += this._craftingCosts.get(this._woodsSelected.frame).tool * frameAmount
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
        defaultResources = defaultResources.map(data => [data[0], formatInt(data[1])])
        extraResources = extraResources.map(data => [data[0], formatInt(data[1])])

        // Display amounts
        this._updateTable(this._tables.Resources, defaultResources)
        this._updateTable(this._tables.Extra, extraResources)
        this._updateTable(this._tables.Materials, materials)
    }

    /**
     * Show buildings for selected building type
     * @param {Object} event Event
     * @return {void}
     * @private
     */
    _blueprintSelected(event) {
        if (this._init) {
            this._init = false
            for (const type of ["frame", "trim"]) {
                this._setWoodSelect(type)
            }

            const cardDeck = this._blueprintList.append("div").classed("card-deck", true)

            const addCard = title => {
                const card = cardDeck.append("div").classed("card", true)
                card.append("div")
                    .classed("card-header", true)
                    .text(title)
                const cardBody = card.append("div").classed("card-body", true)
                this._tables[title] = cardBody.append("table").classed("table table-sm card-table", true)
                this._tables[title].append("thead")
                this._tables[title].append("tbody")
            }

            addCard("Resources")
            addCard("Extra")
            addCard("Materials")
        }

        this._blueprint = $(event.currentTarget)
            .find(":selected")
            .val()
        this._currentBlueprintData = this._getBlueprintData(this._blueprint)

        this._updateText()
    }

    _getBlueprintData(selectedBlueprint) {
        return this._blueprintData.find(blueprint => blueprint.name === selectedBlueprint)
    }
}
