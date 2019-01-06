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
            frame: "Fir Log",
            trim: "Crew Space"
        };
        this._woodsSelected = [];
        this._woodOptions = {};
        this._tables = [];
        this._init = true;

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._listSelected();
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "md");

        const id = `${this._baseId}-ship-select`;
        const body = d3Select(`#${this._modalId} .modal-body`);
        let row = body.append("div").classed("row no-gutters mb-2", true);
        row.append("label").attr("for", id);
        row.append("select")
            .attr("name", id)
            .attr("id", id);

        row = body.append("div").classed("row no-gutters", true);

        ["frame", "trim"].forEach(type => {
            const selectId = `${this._baseId}-${type}-select`;
            row.append("label").attr("for", selectId);
            row.append("select")
                .attr("name", selectId)
                .attr("id", selectId)
                .classed("pr-2", true);
        });

        this._blueprintList = body
            .append("div")
            .attr("id", `${this._baseId}`)
            .classed("blueprint mt-4", true);
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

    _setupWoodOptions() {
        const frameSelectData = this._woodData.frame.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });
        const trimSelectData = this._woodData.trim
            .filter(trim => trim.name !== "Light")
            .sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });

        this._woodOptions.frame = frameSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`);
        this._woodOptions.trim = trimSelectData.map(wood => `<option value="${wood.name}">${wood.name}</option>`);
    }

    _setupWoodSelect(type, select$) {
        this._setupWoodOptions();
        this._woodsSelected[type] = this._defaultWood[type];
        select$.append(this._woodOptions[type]);
        select$.attr("disabled", "disabled");
    }

    _setupSelects() {
        this._setupShipSelect();
        ["frame", "trim"].forEach(type => {
            const select$ = $(`#${this._baseId}-${type}-select`);
            this._setupWoodSelect(type, select$);
        });
    }

    _setupShipSelectListener() {
        const select$ = $(`#${this._baseId}-ship-select`);

        select$
            .addClass("selectpicker")
            .on("change", event => this._blueprintSelected(event))
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
        ["frame", "trim"].forEach(type => {
            const select$ = $(`#${this._baseId}-${type}-select`);
            this._setupWoodSelectListener(type, select$);
        });
    }

    _initModal() {
        this._injectModal();
        this._setupSelects();
        this._setupSelectListener();
    }

    _setWoodSelect(type) {
        $(`#${this._baseId}-${type}-select`)
            .removeAttr("disabled")
            .val(this._defaultWood[type].replace(" Log", ""))
            .selectpicker("refresh");
    }

    _woodSelected(type, select$) {
        this._woodsSelected[type] = select$.val();
        this._woodsSelected[type] += !(
            this._woodsSelected[type] === "Bermuda Cedar" || this._woodsSelected[type] === "Crew Space"
        )
            ? " Log"
            : "";
        this._updateText();
    }

    _listSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    _updateTable(elem, dataBody, dataHead = []) {
        const addHead = () => {
            let sortAscending = true;

            // Data join rows
            const tableRowUpdate = elem
                .select("thead")
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
            const rows = elem
                .select("tbody")
                .selectAll("tr")
                .data(dataBody);

            // Remove old rows
            rows.exit().remove();

            // Add new rows
            const rowsEnter = rows.enter().append("tr");
            rowsEnter
                .selectAll("td")
                .data(d => d)
                .enter()
                .append("td")
                .html(d => d);

            // Data join cells
            const cells = rows.selectAll("td").data(d => d);

            // Add new cells
            cells.enter().append("td");
            cells.html(d => d);
        };

        if (dataHead.length) {
            addHead();
        }
        addBody();
    }

    /**
     * Construct ship blueprint tables
     * @return {void}
     * @private
     */
    _updateText() {
        const extraData = [];
        if (this._currentBlueprintData.doubloons) {
            extraData.push(["Doubloons", formatInt(this._currentBlueprintData.doubloons)]);
        }
        extraData.push(["Provisions", formatInt(this._currentBlueprintData.provisions)]);
        if (this._currentBlueprintData.permit) {
            extraData.push(["Permit", formatInt(this._currentBlueprintData.permit)]);
        }
        extraData.push(["Craft level", formatInt(this._currentBlueprintData.craftLevel)]);
        extraData.push(["Shipyard level", formatInt(this._currentBlueprintData.shipyardLevel)]);
        extraData.push(["Labour hours", formatInt(this._currentBlueprintData.labourHours)]);
        extraData.push(["Craft experience", formatInt(this._currentBlueprintData.craftXP)]);

        const resourcesData = this._currentBlueprintData.resources.map(resource => [
            resource.name,
            formatInt(resource.amount)
        ]);

        let frameAdded = false;
        let trimAdded = false;
        let frameAmount = 0;
        if (this._woodsSelected.trim === "Crew Space") {
            const hempAmount = this._currentBlueprintData.trims.find(trim => trim.name === "Crew Space").amount;
            const index = resourcesData.findIndex(resource => resource[0] === "Hemp");
            resourcesData[index][1] = formatInt(+resourcesData[index][1] + hempAmount);
        } else {
            const trimAmount = this._currentBlueprintData.trims.find(trim => trim.name === "Planking").amount;
            if (this._woodsSelected.trim === this._woodsSelected.frame) {
                frameAmount += trimAmount;
            } else {
                const index = resourcesData.findIndex(resource => resource[0] === this._woodsSelected.trim);
                if (index >= 0) {
                    resourcesData[index][1] = formatInt(+resourcesData[index][1] + frameAmount);
                } else {
                    trimAdded = true;
                    resourcesData.push([this._woodsSelected.trim, formatInt(trimAmount)]);
                }
            }
        }

        frameAmount += this._currentBlueprintData.frames.find(frame => frame.name === this._woodsSelected.frame).amount;
        const index = resourcesData.findIndex(resource => resource[0] === this._woodsSelected.frame);
        if (index >= 0) {
            resourcesData[index][1] = formatInt(+resourcesData[index][1] + frameAmount);
        } else {
            frameAdded = true;
            resourcesData.push([this._woodsSelected.frame, formatInt(frameAmount)]);
        }

        // Order frame before trim
        if (frameAdded && trimAdded) {
            const frameIndex = resourcesData.length - 1;
            [resourcesData[frameIndex], resourcesData[frameIndex - 1]] = [
                resourcesData[frameIndex - 1],
                resourcesData[frameIndex]
            ];
        }

        this._updateTable(this._tables.Extra, extraData);
        this._updateTable(this._tables.Resources, resourcesData);
    }

    /**
     * Show buildings for selected building type
     * @param {Object} event Event
     * @return {void}
     * @private
     */
    _blueprintSelected(event) {
        if (this._init) {
            this._init = false;

            ["frame", "trim"].forEach(type => {
                this._setWoodSelect(type);
            });

            const cardDeck = this._blueprintList.append("div").classed("card-deck", true);

            const addCard = title => {
                const card = cardDeck.append("div").classed("card", true);
                card.append("div")
                    .classed("card-header", true)
                    .text(title);
                const cardBody = card.append("div").classed("card-body", true);
                this._tables[title] = cardBody.append("table").classed("table table-sm", true);
                this._tables[title].append("thead");
                this._tables[title].append("tbody");
            };

            addCard("Resources");
            addCard("Extra");
        }

        this._blueprint = $(event.currentTarget)
            .find(":selected")
            .val();
        this._currentBlueprintData = this._getBlueprintData(this._blueprint);

        this._updateText();
    }

    _getBlueprintData(selectedBlueprint) {
        return this._blueprintData.find(blueprint => blueprint.name === selectedBlueprint);
    }
}
