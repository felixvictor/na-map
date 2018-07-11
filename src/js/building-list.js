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
            .map(building => `<option value="${building.name}"">${building.name}</option>;`)
            .join("")}`;
    }

    _setupListener() {
        $("#button-building-list").on("click", event => {
            registerEvent("Tools", "List buildings");
            console.log("Tools", "List buildings");
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

    /**
     * Construct building tables
     * @param {string} selectedBuildingName Selected building.
     * @return {string} html string
     * @private
     */
    _getText(selectedBuildingName) {
        const currentBuilding = this._getBuildingData(selectedBuildingName);
        let text = `<p class="mt-4">Produces ${currentBuilding.resource.name} at ${
            currentBuilding.resource.price
        } gold`;
        text += "<br>Byproducts: ";
        currentBuilding.byproduct.forEach(byproduct => {
            text += `${byproduct.item} (${formatPercent(byproduct.chance)} chance) `;
        });
        text += "</p>";

        text += '<table class="table table-sm mt-1"><thead>';
        text += "<tr>";
        text +=
            "<tr><th>Level</th><th>Production</th><th>Labour cost</th><th>Storage</th><th>Build price</th><th>Materials</th></tr></thead><tbody>";
        currentBuilding.levels.forEach((level, i) => {
            text += `<tr><td>${i}</td><td>${formatInt(level.production)}</td><td>${formatPercent(
                level.labourDiscount
            )}</td><td>${formatInt(level.maxStorage)}</td><td>${formatInt(level.price)}</td><td>${
                JSON.stringify( level.materials)
            }</td></tr>`;
        });
        text += "</tbody></table>";

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
            .classed("row", true);
        $(this._div)
            .find("div")
            .append(this._getText(building));
    }
}
