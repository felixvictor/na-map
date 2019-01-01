/**
 * This file is part of na-map.
 *
 * @file      List ship blueprints.
 * @module    game-tools/list-ship-blueprints
 * @author    iB aka Felix Victor
 * @copyright 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";
import { formatInt, getOrdinal } from "../util";
import { registerEvent } from "../analytics";
import { getCurrencyAmount, insertBaseModal } from "../common";

export default class ListShipBlueprints {
    constructor(blueprintData) {
        this._blueprintData = blueprintData.shipBlueprints;
        this._ratioData = blueprintData.ratios;

        this._baseName = "List ship blueprint";
        this._baseId = "ship-blueprint-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._blueprintListSelected();
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        const id = `${this._baseId}-select`,
            body = d3Select(`#${this._modalId} .modal-body`);
        body.append("label").attr("for", id);
        body.append("select")
            .attr("name", id)
            .attr("id", id);
        body.append("div")
            .attr("id", `${this._baseId}`)
            .attr("class", "container-fluid");
    }

    _getOptions() {
        return `${this._blueprintData
            .map(blueprint => `<option value="${blueprint.name}">${blueprint.name}</option>;`)
            .join("")}`;
    }

    _setupSelect() {
        const select$ = $(`#${this._baseId}-select`),
            options = this._getOptions();
        select$.append(options);
    }

    _setupSelectListener() {
        const select$ = $(`#${this._baseId}-select`);

        select$
            .addClass("selectpicker")
            .on("change", event => this._blueprintSelected(event))
            .selectpicker({ noneSelectedText: "Select blueprint" })
            .val("default")
            .selectpicker("refresh");
    }

    _initModal() {
        this._injectModal();
        this._setupSelect();
        this._setupSelectListener();
    }

    _blueprintListSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    _getBlueprintData(selectedBlueprint) {
        return this._blueprintData.find(blueprint => blueprint.name === selectedBlueprint);
    }

    _getShipText(currentBlueprint) {
        let text = "";

        text += '<table class="table table-sm"><tbody>';

        text += `<tr><td>Ship rate</td><td>${getOrdinal(currentBlueprint.ship.rate)}</td></tr>`;
        text += `<tr><td>Ship mass</td><td>${formatInt(currentBlueprint.ship.shipMass)}</td></tr>`;
        text += `<tr><td>Maximum crew</td><td>${formatInt(currentBlueprint.ship.maxCrew)}</td></tr>`;

        text += `<tr><td>Shipyard level</td><td>${formatInt(currentBlueprint.shipyardLevel)}</td></tr>`;
        text += `<tr><td>Craft level</td><td>${formatInt(currentBlueprint.craftLevel)}</td></tr>`;
        text += `<tr><td>Labour hours</td><td>${formatInt(currentBlueprint.labourHours)}</td></tr>`;
        text += `<tr><td>Craft experience gained</td><td>${formatInt(currentBlueprint.craftXP)}</td></tr>`;

        text += "</tbody></table>";
        return text;
    }

    _getResourcesText(currentBlueprint) {
        let text = "";

        text += '<table class="table table-sm"><thead>';
        text += "<tr><th>Level</th><th>Level build materials</th></tr>";
        text += "</thead><tbody>";
        text += "</tbody></table>";
        return text;
    }

    _getRequirementText(currentBlueprint) {
        let text = "";

        text += '<table class="table table-sm"><thead>';

        text += "<tr><th>Requirement</th><th>Amount</th></tr>";
        text += "</thead><tbody>";

        currentBlueprint.resources.forEach(resource => {
            text += `<tr><td>${resource.name}</td><td>${formatInt(material.amount)}</td></tr>;
        });
        text += "</tbody></table>";

        return text;
    }

    /**
     * Construct ship blueprint tables
     * @param {string} selectedBlueprintName Selected building.
     * @return {string} html string
     * @private
     */
    _getText(selectedBlueprintName) {
        const currentBlueprint = this._getBlueprintData(selectedBlueprintName);

        let text = '<div class="row no-gutters card-deck">';

        text += '<div class="card col-4"><div class="card-header">Ship</div>';
        text += '<div class="card-body">';
        text += this._getShipText(currentBlueprint);
        text += "</div></div>";

        text += '<div class="card col-4"><div class="card-header">Resources</div>';
        text += '<div class="card-body px-0">';
        text += this._getResourcesText(currentBlueprint);
        text += "</div></div>";

        text += '<div class="card col-4"><div class="card-header">Requirements</div>';
        text += '<div class="card-body px-0">';
        text += this._getRequirementText(currentBlueprint);
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
    _blueprintSelected(event) {
        const blueprint = $(event.currentTarget)
            .find(":selected")
            .val();

        // Remove old blueprint list
        d3Select(`#${this._baseId} div`).remove();

        // Add new blueprint list
        d3Select(`#${this._baseId}`)
            .append("div")
            .classed("blueprint mt-4", true);
        d3Select(`#${this._baseId} div`).html(this._getText(blueprint));
    }
}
