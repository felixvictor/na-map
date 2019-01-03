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
        body.append("div").attr("id", `${this._baseId}`);
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

    _addTable(elem, dataBody, dataHead = []) {
        const table = elem.append("table").classed("table table-sm", true);

        const addHead = () => {
            let sortAscending = true;

            // Data join rows
            const tableRowUpdate = table
                .append("tbody")
                .selectAll("tr")
                .data(dataBody, d => d[0]);

            // Remove old rows
            tableRowUpdate
                .exit()
                .attr("class", "exit")
                .transition()
                .delay(2000)
                .duration(5000)
                .style("opacity", 0.0)
                .remove();

            // Add new rows
            const tableRowEnter = tableRowUpdate
                .enter()
                .append("tr")
                .style("opacity", 0.0)
                .attr("class", "enter")
                .transition()
                .delay(9000)
                .duration(5000)
                .style("opacity", 1.0);

            // Merge rows
            const row = tableRowUpdate.merge(tableRowEnter);

            // Data join cells
            const tableCellUpdate = row.selectAll("th").data(d);
            tableCellUpdate.attr("class", "update");
            // Remove old cells
            tableCellUpdate
                .exit()
                .attr("class", "exit")
                .transition()
                .delay(2000)
                .duration(5000)
                .style("opacity", 0.0)
                .remove();

            // Add new cells
            const tableCellEnter = tableCellUpdate
                .enter()
                .append("th")
                .style("opacity", 0.0)
                .attr("class", "enter")
                .transition()
                .delay(9000)
                .duration(5000)
                .style("opacity", 1.0);

            // Merge cells
            const cell = tableCellUpdate
                .merge(tableCellEnter)
                .html(d => d)
                .append("i")
                .classed("fas fa-sort", true)
                .on("click", (d, i, nodes) => {
                    if (sortAscending) {
                        row.sort((a, b) => b[d] < a[d]);
                        sortAscending = false;
                        console.log(nodes[i]);
                        nodes[i].classed("fa-sort-down", false);
                        nodes[i].classed("fa-sort-up", true);
                    } else {
                        row.sort((a, b) => b[d] > a[d]);
                        sortAscending = true;
                        console.log(nodes[i]);
                        nodes[i].classed("fa-sort-up", false);
                        nodes[i].classed("fa-sort-down", true);
                    }
                });
        };

        const addBody = () => {
            // Data join rows
            const tableRowUpdate = table
                .append("tbody")
                .selectAll("tr")
                .data(dataBody, d => d[0]);

            // Remove old rows
            tableRowUpdate
                .exit()
                .attr("class", "exit")
                .transition()
                .delay(200)
                .duration(1000)
                .style("opacity", 0.0)
                .remove();

            // Add new rows
            const tableRowEnter = tableRowUpdate
                .enter()
                .append("tr")
                .style("opacity", 0.0)
                .attr("class", "enter")
                .transition()
                .delay(1200)
                .duration(1000)
                .style("opacity", 1.0);

            // Merge rows
            const row = tableRowUpdate.merge(tableRowEnter);

            // Data join cells
            const tableCellUpdate = row.selectAll("td").data(d => d);
            tableCellUpdate.attr("class", "update");
            // Remove old cells
            tableCellUpdate
                .exit()
                .attr("class", "exit")
                .transition()
                .delay(200)
                .duration(1000)
                .style("opacity", 0.0)
                .remove();

            // Add new cells
            const tableCellEnter = tableCellUpdate
                .enter()
                .append("td")

                .style("opacity", 0.0)
                .attr("class", "enter")
                .transition()
                .delay(1200)
                .duration(1000)
                .style("opacity", 1.0);

            // Merge cells
            tableCellUpdate.merge(tableCellEnter).html(d => d);
        };

        if (dataHead.length) {
            addHead();
        }
        addBody();
    }

    /**
     * Construct ship blueprint tables
     * @param {object} elem - Element to add table to
     * @param {string} selectedBlueprintName - Selected blueprint
     * @return {void}
     * @private
     */
    _addText(elem, selectedBlueprintName) {
        const currentBlueprint = this._getBlueprintData(selectedBlueprintName);

        const cardDeck = elem.append("div").classed("row no-gutters card-deck", true);

        const addCard = (title, data) => {
            const card = cardDeck.append("div").classed("card col-3", true);
            card.append("div")
                .classed("card-header", true)
                .text(title);
            const cardBody = card.append("div").classed("card-body", true);
            this._addTable(cardBody, data);
        };

        const shipData = [
            ["Ship rate", getOrdinal(currentBlueprint.ship.rate)],
            ["Craft level", formatInt(currentBlueprint.craftLevel)],
            ["Shipyard level", formatInt(currentBlueprint.shipyardLevel)],
            ["Labour hours", formatInt(currentBlueprint.labourHours)],
            ["Craft experience gained", formatInt(currentBlueprint.craftXP)]
        ];
        if (currentBlueprint.doubloons) {
            shipData.push(["Doubloons", formatInt(currentBlueprint.doubloons)]);
        }
        shipData.push(["Provisions", formatInt(currentBlueprint.provisions)]);
        if (currentBlueprint.permit) {
            shipData.push(["Permit", formatInt(currentBlueprint.permit)]);
        }
        addCard("Ship", shipData);

        const resourcesData = currentBlueprint.resources.map(resource => [resource.name, formatInt(resource.amount)]);
        addCard("Resources", resourcesData);

        let woodsData = currentBlueprint.frames.map(frame => [frame.name, formatInt(frame.amount)]);
        woodsData = [
            ...woodsData,
            ...currentBlueprint.trims.map(trim => [
                trim.name,
                `+ ${formatInt(trim.amount)} ${trim.name === "Planking" ? "Logs" : "Hemp"}`
            ])
        ];
        addCard("Woods", woodsData);
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
        const div = d3Select(`#${this._baseId}`)
            .append("div")
            .classed("blueprint mt-4", true);
        this._addText(div, blueprint);
    }
}
