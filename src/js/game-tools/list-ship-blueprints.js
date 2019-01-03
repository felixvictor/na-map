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
    constructor(blueprintData, woodData) {
        this._blueprintData = blueprintData;
        this._woodData = woodData;

        this._baseName = "List ship blueprint";
        this._baseId = "ship-blueprint-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._defaultWood = {
            frame: "Fir",
            trim: "Crew Space"
        };
        this._woodsSelected = [];
        this._options = {};

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._blueprintListSelected();
        });
    }

    _setupData() {
        this._frameSelectData = this._woodData.frame.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        this._trimSelectData = this._woodData.trim.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        this._setOption(
            this._frameSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`),
            this._trimSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`)
        );
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        const id = `${this._baseId}-ship-select`;
        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("label").attr("for", id);
        body.append("select")
            .attr("name", id)
            .attr("id", id);

        ["frame", "trim"].forEach(type => {
            const selectId = `${this._baseId}-${type}-select`;
            body.append("label").attr("for", selectId);
            body.append("select")
                .attr("name", selectId)
                .attr("id", selectId);
        });

        body.append("div").attr("id", `${this._baseId}`);
    }

    _getShipOptions() {
        return `${this._blueprintData
            .map(blueprint => `<option value="${blueprint.name}">${blueprint.name}</option>;`)
            .join("")}`;
    }

    _setupShipSelect() {
        const select$ = $(`#${this._baseId}-ship-select`),
            options = this._getShipOptions();
        select$.append(options);
    }

    _setupShipSelectListener() {
        const select$ = $(`#${this._baseId}-ship-select`);

        select$
            .addClass("selectpicker")
            .on("change", event => this._blueprintSelected(event))
            .selectpicker({ noneSelectedText: "Select blueprint" })
            .val("default")
            .selectpicker("refresh");
    }

    _initModal() {
        this._setupData();
        this._injectModal();
        this._setupShipSelect();
        this._setupShipSelectListener();
        ["frame", "trim"].forEach(type => {
            const select$ = $(`#${this._baseId}-${type}-select`);
            this._setupWoodSelect(type, select$);
            this._setupWoodSelectListener(type, select$);
        });
    }

    _setWoodsSelected(type, woodName) {
        this._woodsSelected[type] = woodName;
    }

    _setupWoodSelect(type, select$) {
        this._setWoodsSelected(type, this._defaultWood[type]);
        select$.append(this._options[type]);
        select$.attr("disabled", "disabled");
    }

    _setOtherSelect(type) {
        const otherType = type === "frame" ? "trim" : "frame";
        if (this._woodsSelected[otherType] === this._defaultWood[otherType]) {
            $(`#${this._baseId}-${otherType}-select`)
                .val(this._defaultWood[otherType])
                .selectpicker("refresh");
        }
    }

    _enableSelects() {
        ["frame", "trim"].forEach(type => {
            $(`#${this._baseId}-${type}-select`)
                .removeAttr("disabled")
                .selectpicker("refresh");
        });
    }

    _woodSelected(type, select$) {
        const woodName = select$.val();

        this._setWoodsSelected(type, woodName);
        this._setOtherSelect(type);
    }

    _setupWoodSelectListener(type, select$) {
        select$
            .addClass("selectpicker")
            .on("change", () => this._woodSelected(type, select$))
            .selectpicker({ noneSelectedText: `Select ${type}` })
            .val("default")
            .selectpicker("refresh");
    }

    _getWoodTypeData(type, name) {
        return this._woodData[type].find(wood => wood.name === name);
    }

    _getWoodData(id) {
        return {
            frame: this._getWoodTypeData("frame", this._getWoodSelected(id).frame),
            trim: this._getWoodTypeData("trim", this._getWoodSelected(id).trim)
        };
    }

    _setOption(frame, trim) {
        this._options.frame = frame;
        this._options.trim = trim;
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
                .append("thead")
                .selectAll("tr")
                .data(dataHead, d => d[0]);

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
            const tableCellUpdate = row.selectAll("th").data(d => d);
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
            tableCellUpdate
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

        const addCard = (title, dataBody, dataHead = []) => {
            const card = cardDeck.append("div").classed("card col-3", true);
            card.append("div")
                .classed("card-header", true)
                .text(title);
            const cardBody = card.append("div").classed("card-body", true);
            this._addTable(cardBody, dataBody, dataHead);
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
        addCard("Ship", shipData, ["item", "data"]);

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

        this._enableSelects();

        // Remove old blueprint list
        d3Select(`#${this._baseId} div`).remove();

        // Add new blueprint list
        const div = d3Select(`#${this._baseId}`)
            .append("div")
            .classed("blueprint mt-4", true);
        this._addText(div, blueprint);
    }
}
