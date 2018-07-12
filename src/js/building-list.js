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

    /**
     * Construct building tables
     * @param {string} selectedBuildingName Selected building.
     * @return {string} html string
     * @private
     */
    _getText(selectedBuildingName) {
        const currentBuilding = this._getBuildingData(selectedBuildingName);
        let text = `<p class="mt-4">Produces <em>${currentBuilding.resource.name}</em>`;

        if (currentBuilding.resource.price) {
            text += ` at ${currentBuilding.resource.price} gold per unit`;
            if (typeof currentBuilding.batch !== "undefined") {
                text += ` (batch of ${currentBuilding.batch.amount} units at ${currentBuilding.batch.price} gold)`;
            }
        }
        if (currentBuilding.byproduct.length) {
            text += "<br>Byproducts: ";
            text += currentBuilding.byproduct
                .map(
                    byproduct =>
                        `${byproduct.item} <span class="badge badge-light">${formatPercent(
                            byproduct.chance
                        )} chance</span>`
                )
                .join(" ");
        }
        text += "</p>";
        text += '<table class="table table-sm mt-1"><thead>';

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
            .classed("buildings", true);
        $(this._div)
            .find("div")
            .append(this._getText(building));
    }
}
