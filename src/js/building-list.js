/*    building-list.js
 */

/* global d3 : false
 */

import { formatPercent, formatInt } from "./util";
import { registerEvent } from "./analytics";

export default class Building {
    constructor(buildingData) {
        this._buildingData = buildingData;

        this._setupData();
        this._setupListener();
        this._setupSelect();
    }

    _setupData() {
        this._options = `${this._buildingData
            .map(building => `<option value="${building.name}">${building.name}</option>;`)
            .join("")}`;
    }

    _setupListener() {
        $("#button-building-list").on("click", event => {
            registerEvent("Tools", "List buildings");
            event.stopPropagation();
            this._buildingListSelected();
        });
    }

    _buildingListSelected() {
        $("#modal-buildings").modal("show");
        this._div = "#buildings-list";
    }

    _setupSelect() {
        const select = $("#buildings-select");
        select.append(this._options);

        select
            .addClass("selectpicker")
            .on("change", event => this._buildingSelected(event))
            .selectpicker({ noneSelectedText: "Select building" });
    }

    _getBuildingData(selectedBuildingName) {
        return this._buildingData.filter(building => building.name === selectedBuildingName)[0];
    }

    _getProductText(currentBuilding) {
        let text = "";
        text += `<h5 class="card-title">${currentBuilding.resource.name}</h5>`;

        if (currentBuilding.resource.price) {
            text += '<table class="table table-sm"><tbody>';
            text += `<tr><td>${currentBuilding.resource.price} gold per unit</td></tr>`;
            if (typeof currentBuilding.batch !== "undefined") {
                text += `<tr><td>Batch of ${currentBuilding.batch.amount} units at ${
                    currentBuilding.batch.price
                } gold</td></tr>`;
            }
            text += "</tbody></table>";
        }

        return text;
    }

    _getByproductText(currentBuilding) {
        let text = '<table class="table table-sm"><tbody>';
        if (currentBuilding.byproduct.length) {
            text += `<tr><td>${currentBuilding.byproduct
                .map(
                    byproduct =>
                        `${byproduct.item} <span class="badge badge-primary ml-1">${formatPercent(
                            byproduct.chance
                        )} chance</span>`
                )
                .join("</td></tr><tr><td>")}</td></tr>`;
        }
        text += "</tbody></table>";

        return text;
    }

    _getRequirementText(currentBuilding) {
        let text = "";

        text += '<table class="table table-sm"><thead>';

        if (currentBuilding.levels[0].materials.length) {
            text += "<tr><th>Level</th><th>Level build materials</th></tr>";
            text += "</thead><tbody>";
            currentBuilding.levels.forEach((level, i) => {
                text += `<tr><td>${i}</td><td class="text-left">`;
                text += level.materials.map(material => `${formatInt(material.amount)} ${material.item}`).join("<br>");
                text += "</td></tr>";
            });
        } else {
            text +=
                "<tr><th>Level</th><th>Production (units)</th><th>Labour cost (%)</th><th>Storage (units)</th><th>Level build price (gold)</th></tr>";
            text += "</thead><tbody>";
            currentBuilding.levels.forEach((level, i) => {
                text += `<tr><td>${i}</td><td>${formatInt(level.production)}</td><td>${formatInt(
                    level.labourDiscount * -100
                )}</td><td>${formatInt(level.maxStorage)}</td><td>${formatInt(level.price)}</td></tr>`;
            });
        }
        text += "</tbody></table>";
        return text;
    }

    /**
     * Construct building tables
     * @param {string} selectedBuildingName Selected building.
     * @return {string} html string
     * @private
     */
    _getText(selectedBuildingName) {
        const currentBuilding = this._getBuildingData(selectedBuildingName);

        let text = '<div class="row no-gutters card-deck">';

        text += '<div class="card col-3"><div class="card-header">Product</div>';
        text += '<div class="card-body product">';
        text += this._getProductText(currentBuilding);
        text += "</div></div>";

        text += '<div class="card col-3"><div class="card-header">Byproducts</div>';
        text += '<div class="card-body product">';
        text += this._getByproductText(currentBuilding);
        text += "</div></div>";

        text += '<div class="card col-6"><div class="card-header">Requirements</div>';
        text += '<div class="card-body px-0 requirements">';
        text += this._getRequirementText(currentBuilding);
        text += "</div></div>";

        text += "</div>";
        return text;
    }

    /**
     * Show buildings for selected building type
     * @param {Object} event Event
     * @return {void}
     * @private
     */
    _buildingSelected(event) {
        const building = $(event.currentTarget)
            .find(":selected")
            .val();

        // Remove old building list
        d3.select(`${this._div} div`).remove();

        // Add new building list
        d3.select(this._div)
            .append("div")
            .classed("buildings mt-4", true);
        $(this._div)
            .find("div")
            .append(this._getText(building));
    }
}
