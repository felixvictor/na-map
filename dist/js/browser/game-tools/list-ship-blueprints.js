/*!
 * This file is part of na-map.
 *
 * @file      List ship blueprints.
 * @module    game-tools/list-ship-blueprints
 * @author    iB aka Felix Victor
 * @copyright 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap-select/js/bootstrap-select";
import { select as d3Select } from "d3-selection";
import { registerEvent } from "../analytics";
import { formatInt } from "../../common/common-format";
import { insertBaseModal } from "../../common/common-browser";
import { putImportError, woodType } from "../../common/common";
import { sortBy } from "../../common/common-node";
const tableType = ["Resources", "Extra", "Materials"];
export default class ListShipBlueprints {
    constructor() {
        this._init = true;
        this._blueprintData = {};
        this._woodData = {};
        this._extractionCosts = {};
        this._craftingCosts = {};
        this._woodOptions = {};
        this._woodsSelected = {};
        this._currentBlueprint = {};
        this._tables = {};
        this._baseName = "List ship blueprint";
        this._baseId = "ship-blueprint-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._defaultWood = {
            frame: "Fir",
            trim: "Crew Space",
        };
        this._setupListener();
    }
    async _loadAndSetupData() {
        try {
            this._blueprintData = (await import("Lib/gen-generic/ship-blueprints.json")).default;
            this._woodData = (await import("Lib/gen-generic/woods.json"))
                .default;
            const costs = (await import("Lib/gen-generic/prices.json"))
                .default;
            this._extractionCosts = new Map(costs.standard.map((cost) => [cost.name, { real: cost.real, labour: cost.labour }]));
            this._craftingCosts = new Map(costs.seasoned.map((cost) => [
                cost.name,
                { real: cost.real, labour: cost.labour, doubloon: cost.doubloon, tool: cost.tool },
            ]));
        }
        catch (error) {
            putImportError(error);
        }
    }
    _setupListener() {
        var _a;
        let firstClick = true;
        (_a = document.querySelector(`#${this._buttonId}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false;
                await this._loadAndSetupData();
            }
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._listSelected();
        });
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "lg" });
        const id = `${this._baseId}-ship-select`;
        const body = d3Select(`#${this._modalId} .modal-body`);
        let row = body.append("div").classed("row no-gutters mb-2", true);
        row.append("label").attr("for", id);
        row.append("select").attr("name", id).attr("id", id);
        row = body.append("div").classed("row no-gutters", true);
        for (const type of ["frame", "trim"]) {
            const selectId = `${this._baseId}-${type}-select`;
            row.append("label").attr("for", selectId);
            row.append("select").attr("name", selectId).attr("id", selectId).classed("pr-2", true);
        }
        this._blueprintList = body.append("div").attr("id", `${this._baseId}`).classed("blueprint mt-4", true);
    }
    _getShipOptions() {
        return `${this._blueprintData
            .sort(sortBy(["name"]))
            .map((blueprint) => `<option value="${blueprint.name}">${blueprint.name}</option>;`)
            .join("")}`;
    }
    _setupShipSelect() {
        const select$ = $(`#${this._baseId}-ship-select`);
        const options = this._getShipOptions();
        select$.append(options);
    }
    _setupWoodOptions() {
        const frameSelectData = this._woodData.frame.sort(sortBy(["name"]));
        const trimSelectData = this._woodData.trim.filter((trim) => trim.name !== "Light").sort(sortBy(["name"]));
        this._woodOptions = {
            frame: frameSelectData.map((wood) => `<option value="${wood.name}">${wood.name}</option>`).join(""),
            trim: trimSelectData.map((wood) => `<option value="${wood.name}">${wood.name}</option>`).join(""),
        };
    }
    _setupWoodSelect(type, select$) {
        this._setupWoodOptions();
        this._woodsSelected[type] = this._defaultWood[type];
        select$.append(this._woodOptions[type]);
        select$.attr("disabled", "disabled");
    }
    _setupSelects() {
        this._setupShipSelect();
        for (const type of woodType) {
            const select$ = $(`#${this._baseId}-${type}-select`);
            this._setupWoodSelect(type, select$);
        }
    }
    _setupShipSelectListener() {
        const select$ = $(`#${this._baseId}-ship-select`);
        select$
            .addClass("selectpicker")
            .on("change", (event) => this._blueprintSelected(event))
            .selectpicker({ noneSelectedText: "Select blueprint", width: "fit" })
            .val("default")
            .selectpicker("refresh");
    }
    _setupWoodSelectListener(type, select$) {
        select$
            .addClass("selectpicker")
            .on("change", () => this._woodSelected(type, select$))
            .selectpicker({ noneSelectedText: `Select ${type}`, width: "fit" })
            .val("default")
            .selectpicker("refresh");
    }
    _setupSelectListener() {
        this._setupShipSelectListener();
        for (const type of woodType) {
            const select$ = $(`#${this._baseId}-${type}-select`);
            this._setupWoodSelectListener(type, select$);
        }
    }
    _initModal() {
        this._injectModal();
        this._setupSelects();
        this._setupSelectListener();
    }
    _setWoodSelect(type) {
        $(`#${this._baseId}-${type}-select`).removeAttr("disabled").val(this._defaultWood[type]).selectpicker("refresh");
    }
    _woodSelected(type, select$) {
        this._woodsSelected[type] = select$.val();
        this._updateText();
    }
    _listSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
    _updateTable(elem, dataBody) {
        const addBody = () => {
            const rows = elem
                .select("tbody")
                .selectAll("tr")
                .data(dataBody)
                .join((enter) => enter.append("tr"));
            rows.selectAll("td")
                .data((d) => d)
                .join((enter) => enter.append("td"))
                .html((d) => d);
        };
        addBody();
    }
    _updateText() {
        let defaultResources = this._currentBlueprint.resources.map((resource) => [resource.name, resource.amount]);
        let frameAdded = false;
        let trimAdded = false;
        let frameAmount = 0;
        let trimAmount = 0;
        if (this._woodsSelected.trim === "Crew Space") {
            const hempAmount = this._currentBlueprint.wood.find((wood) => wood.name === "Crew Space").amount;
            const index = defaultResources.findIndex((resource) => resource[0] === "Hemp");
            defaultResources[index][1] = defaultResources[index][1] + hempAmount;
        }
        else {
            trimAmount = this._currentBlueprint.wood.find((wood) => wood.name === "Planking").amount;
            if (this._woodsSelected.trim === this._woodsSelected.frame) {
                frameAmount += trimAmount;
            }
            else {
                const index = defaultResources.findIndex((resource) => resource[0] === this._woodsSelected.trim);
                if (index >= 0) {
                    defaultResources[index][1] = defaultResources[index][1] + trimAmount;
                }
                else {
                    trimAdded = true;
                    defaultResources.push([this._woodsSelected.trim, trimAmount]);
                }
            }
        }
        frameAmount += this._currentBlueprint.wood.find((wood) => wood.name === "Frame").amount;
        const index = defaultResources.findIndex((resource) => resource[0] === this._woodsSelected.frame);
        if (index >= 0) {
            defaultResources[index][1] = defaultResources[index][1] + frameAmount;
        }
        else {
            frameAdded = true;
            defaultResources.push([this._woodsSelected.frame, frameAmount]);
        }
        if (frameAdded && trimAdded) {
            const frameIndex = defaultResources.length - 1;
            [defaultResources[frameIndex], defaultResources[frameIndex - 1]] = [
                defaultResources[frameIndex - 1],
                defaultResources[frameIndex],
            ];
        }
        let extraResources = [];
        if (this._currentBlueprint.doubloons) {
            extraResources.push(["Doubloons", this._currentBlueprint.doubloons]);
        }
        extraResources.push(["Provisions", this._currentBlueprint.provisions]);
        if (this._currentBlueprint.permit) {
            extraResources.push(["Permit", this._currentBlueprint.permit]);
        }
        extraResources.push(["Craft level", this._currentBlueprint.craftLevel], ["Shipyard level", this._currentBlueprint.shipyardLevel], ["Labour hours", this._currentBlueprint.labourHours], ["Craft experience", this._currentBlueprint.craftXP]);
        const materials = [];
        let extractionPrice = 0;
        let extractionLabour = 0;
        const getTotalExtractionPrice = (item) => this._extractionCosts.get(item[0]).real * item[1];
        const getTotalExtractionLabour = (item) => this._extractionCosts.get(item[0]).labour * item[1];
        const addExtractionCosts = (data) => {
            for (const cost of data.filter((data) => this._extractionCosts.has(data[0]))) {
                extractionPrice += getTotalExtractionPrice(cost);
                extractionLabour += getTotalExtractionLabour(cost);
            }
        };
        addExtractionCosts(defaultResources);
        addExtractionCosts(extraResources);
        if (extractionPrice) {
            materials.push(["Reals", formatInt(extractionPrice)], ["Labour hours", formatInt(extractionLabour)]);
        }
        let sLogPrice = 0;
        let sLogLabour = 0;
        let sLogDoubloons = 0;
        let sLogTools = 0;
        if (this._craftingCosts.has(this._woodsSelected.trim)) {
            sLogPrice += this._craftingCosts.get(this._woodsSelected.trim).real * trimAmount;
            sLogLabour += this._craftingCosts.get(this._woodsSelected.trim).labour * trimAmount;
            sLogDoubloons += this._craftingCosts.get(this._woodsSelected.trim).doubloon * trimAmount;
            sLogTools += this._craftingCosts.get(this._woodsSelected.trim).tool * trimAmount;
        }
        if (this._craftingCosts.has(this._woodsSelected.frame)) {
            sLogPrice += this._craftingCosts.get(this._woodsSelected.frame).real * frameAmount;
            sLogLabour += this._craftingCosts.get(this._woodsSelected.frame).labour * frameAmount;
            sLogDoubloons += this._craftingCosts.get(this._woodsSelected.frame).doubloon * frameAmount;
            sLogTools += this._craftingCosts.get(this._woodsSelected.frame).tool * frameAmount;
        }
        if (sLogPrice) {
            materials.push(["(S) reals", formatInt(sLogPrice)], ["(S) labour hours", formatInt(sLogLabour)], ["(S) doubloons", formatInt(sLogDoubloons)], ["(S) tools", formatInt(sLogTools)]);
        }
        defaultResources = defaultResources.map((data) => [data[0], formatInt(data[1])]);
        extraResources = extraResources.map((data) => [data[0], formatInt(data[1])]);
        this._updateTable(this._tables.Resources, defaultResources);
        this._updateTable(this._tables.Extra, extraResources);
        this._updateTable(this._tables.Materials, materials);
    }
    _blueprintSelected(event) {
        if (this._init) {
            this._init = false;
            for (const type of woodType) {
                this._setWoodSelect(type);
            }
            const cardDeck = this._blueprintList.append("div").classed("card-deck", true);
            const addCard = (title) => {
                const card = cardDeck.append("div").classed("card", true);
                card.append("div").classed("card-header", true).text(title);
                const cardBody = card.append("div").classed("card-body", true);
                this._tables[title] = cardBody.append("table").classed("table table-sm card-table", true);
                this._tables[title].append("thead");
                this._tables[title].append("tbody");
            };
            for (const type of tableType) {
                addCard(type);
            }
        }
        this._blueprint = $(event.currentTarget).find(":selected").val();
        this._currentBlueprint = this._getBlueprintData(this._blueprint);
        this._updateText();
    }
    _getBlueprintData(selectedBlueprint) {
        return this._blueprintData.find((blueprint) => blueprint.name === selectedBlueprint);
    }
}
//# sourceMappingURL=list-ship-blueprints.js.map