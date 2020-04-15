/*!
 * This file is part of na-map.
 *
 * @file      List buildings.
 * @module    game-tools/list-buildings
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { select as d3Select } from "d3-selection";
import "bootstrap-select/js/bootstrap-select";
import { registerEvent } from "../analytics";
import { getCurrencyAmount, insertBaseModal } from "../../common/common-browser";
import { putImportError } from "../../common/common";
import { formatInt } from "../../common/common-format";
import { sortBy } from "../../common/common-node";
export default class ListBuildings {
    constructor() {
        this._baseName = "List buildings";
        this._baseId = "building-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._buildingData = [];
        this._setupListener();
    }
    async _loadAndSetupData() {
        try {
            this._buildingData = (await import("Lib/gen-generic/buildings.json")).default;
        }
        catch (error) {
            putImportError(error);
        }
    }
    _setupListener() {
        let firstClick = true;
        document.querySelector(`#${this._buttonId}`).addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false;
                await this._loadAndSetupData();
            }
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._buildingListSelected();
        });
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName });
        const id = `${this._baseId}-select`;
        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("label").attr("for", id);
        body.append("select").attr("name", id).attr("id", id);
        body.append("div").attr("id", `${this._baseId}`).attr("class", "container-fluid");
    }
    _getOptions() {
        return `${this._buildingData
            .sort(sortBy(["name"]))
            .map((building) => `<option value="${building.name}">${building.name}</option>;`)
            .join("")}`;
    }
    _setupSelect() {
        const select$ = $(`#${this._baseId}-select`);
        const options = this._getOptions();
        select$.append(options);
    }
    _setupSelectListener() {
        const select$ = $(`#${this._baseId}-select`);
        select$
            .addClass("selectpicker")
            .on("change", (event) => this._buildingSelected(event))
            .selectpicker({ noneSelectedText: "Select building" });
        select$.val("default").selectpicker("refresh");
    }
    _initModal() {
        this._injectModal();
        this._setupSelect();
        this._setupSelectListener();
    }
    _buildingListSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
    _getBuildingData(selectedBuildingName) {
        return this._buildingData.filter((building) => building.name === selectedBuildingName)[0];
    }
    _getProductText(currentBuilding) {
        let text = "";
        if (currentBuilding.result) {
            if (currentBuilding.result.length > 1) {
                text += '<table class="table table-sm"><tbody>';
                text += `<tr><td>${currentBuilding.result
                    .map((result) => result.name)
                    .join("</td></tr><tr><td>")}</td></tr>`;
                text += "</tbody></table>";
            }
            else {
                text += `<h5 class="card-title">${currentBuilding.result[0].name}</h5>`;
                if (currentBuilding.result[0].price) {
                    text += '<table class="table table-sm card-table"><tbody>';
                    text += `<tr><td>${getCurrencyAmount(currentBuilding.result[0].price)} per unit</td></tr>`;
                    if (currentBuilding.batch) {
                        text += `<tr><td>${currentBuilding.batch.labour} labour hour${currentBuilding.batch.labour > 1 ? "s" : ""} per unit</td></tr>`;
                    }
                    text += "</tbody></table>";
                }
            }
        }
        return text;
    }
    _getRequirementText(currentBuilding) {
        let text = "";
        text += '<table class="table table-sm card-table"><thead>';
        if (currentBuilding.levels[0].materials.length > 0) {
            text += "<tr><th>Level</th><th>Level build materials</th><th>Build price (reals)</th></tr>";
            text += "</thead><tbody>";
            for (const level of currentBuilding.levels) {
                const i = currentBuilding.levels.indexOf(level);
                text += `<tr><td>${i + 1}</td><td class="text-left">`;
                text += level.materials.map((material) => `${formatInt(material.amount)} ${material.item}`).join("<br>");
                text += "</td>";
                text += `<td>${formatInt(level.price)}</td>`;
                text += "</tr>";
            }
        }
        else {
            text +=
                "<tr><th>Level</th><th>Production</th><th>Labour cost (%)</th><th>Storage</th><th>Build price (reals)</th></tr>";
            text += "</thead><tbody>";
            for (const level of currentBuilding.levels) {
                const i = currentBuilding.levels.indexOf(level);
                text += `<tr><td>${i + 1}</td><td>${formatInt(level.production)}</td><td>${formatInt(level.labourDiscount * -100)}</td><td>${formatInt(level.maxStorage)}</td><td>${formatInt(level.price)}</td></tr>`;
            }
        }
        text += "</tbody></table>";
        return text;
    }
    _getText(selectedBuildingName) {
        const currentBuilding = this._getBuildingData(selectedBuildingName);
        let text = '<div class="row no-gutters card-deck">';
        text += '<div class="card col-5"><div class="card-header">Product</div>';
        text += '<div class="card-body product">';
        text += this._getProductText(currentBuilding);
        text += "</div></div>";
        text += '<div class="card col-7"><div class="card-header">Requirements</div>';
        text += '<div class="card-body px-0 requirements">';
        text += this._getRequirementText(currentBuilding);
        text += "</div></div>";
        text += "</div>";
        return text;
    }
    _buildingSelected(event) {
        const building = String($(event.currentTarget)
            .find(":selected")
            .val());
        d3Select(`#${this._baseId} div`).remove();
        d3Select(`#${this._baseId}`).append("div").classed("buildings mt-4", true);
        d3Select(`#${this._baseId} div`).html(this._getText(building));
    }
}
//# sourceMappingURL=list-buildings.js.map