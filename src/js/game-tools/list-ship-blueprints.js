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
import { insertBaseModal } from "../common";

export default class ListShipBlueprints {
    constructor(blueprintData) {
        this._blueprintData = blueprintData;

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

    // noinspection JSMethodCanBeStatic
    _getShipText(currentBlueprint) {
        let text = "";

        text += '<table class="table table-sm"><tbody>';

        text += `<tr><td>Ship rate</td><td>${getOrdinal(currentBlueprint.ship.rate)}</td></tr>`;

        text += `<tr><td>Craft level</td><td>${formatInt(currentBlueprint.craftLevel)}</td></tr>`;
        text += `<tr><td>Shipyard level</td><td>${formatInt(currentBlueprint.shipyardLevel)}</td></tr>`;
        text += `<tr><td>Labour hours</td><td>${formatInt(currentBlueprint.labourHours)}</td></tr>`;
        text += `<tr><td>Craft experience gained</td><td>${formatInt(currentBlueprint.craftXP)}</td></tr>`;
        if (currentBlueprint.doubloons) {
            text += `<tr><td>Doubloons</td><td>${formatInt(currentBlueprint.doubloons)}</td></tr>`;
        }
        text += `<tr><td>Provisions</td><td>${formatInt(currentBlueprint.provisions)}</td></tr>`;
        if (currentBlueprint.permit) {
            text += `<tr><td>Permit</td><td>${formatInt(currentBlueprint.permit)}</td></tr>`;
        }

        text += "</tbody></table>";
        return text;
    }

    _getResourcesText(currentBlueprint) {
        let text = "";

        text += '<table class="table table-sm"><tbody>';
        currentBlueprint.resources.forEach(resource => {
            text += `<tr><td>${resource.name}</td><td>${formatInt(resource.amount)}</td></tr>`;
        });
        text += "</tbody></table>";
        return text;
    }

    _getPlankingText(currentBlueprint) {
        let text = "";

        text += '<table class="table table-sm"><tbody>';
        currentBlueprint.frames.forEach(frame => {
            text += `<tr><td>${frame.name}</td><td>${formatInt(frame.amount)}</td></tr>`;
        });
        currentBlueprint.trims.forEach(trim => {
            text += `<tr><td>${trim.name}</td><td>+ ${formatInt(trim.amount)} ${
                trim.name === "Planking" ? "logs" : "Hemp"
            }</td></tr>`;
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
        text += '<div class="card-body">';
        text += this._getResourcesText(currentBlueprint);
        text += "</div></div>";

        text += '<div class="card col-4"><div class="card-header">Woods</div>';
        text += '<div class="card-body">';
        text += this._getPlankingText(currentBlueprint);
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
