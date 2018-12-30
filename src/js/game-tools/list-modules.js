/**
 * This file is part of na-map.
 *
 * @file      List modules.
 * @module    game-tools/list-modules
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";
import { chunkify, formatSignPercent, getOrdinal } from "../util";
import { registerEvent } from "../analytics";
import { insertBaseModal } from "../common";

export default class ListModules {
    constructor(moduleData) {
        this._moduleData = moduleData;

        this._baseName = "List modules";
        this._baseId = "module-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._moduleListSelected();
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        /*
<section id="modal-modules" class="modal" data-keyboard="false" data-backdrop="static" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <header class="modal-header">
                <h3>Modules</h3>
            </header>
            <div class="modal-body">
                <label for="modules-select"></label><select name="modules-select" id="modules-select"></select>
                <div id="modules-list" class="container-fluid"></div>
            </div>
            <footer class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </footer>
        </div>
    </div>
</section>
         */
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
        return `${this._moduleData.map(type => `<option value="${type[0]}"">${type[0]}</option>;`).join("")}`;
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
            .on("change", event => this._moduleSelected(event))
            .selectpicker({ noneSelectedText: "Select module category" })
            .val("default")
            .selectpicker("refresh");
    }

    _initModal() {
        this._injectModal();
        this._setupSelect();
        this._setupSelectListener();
    }

    _moduleListSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    /**
     * Get rows with modules for module moduleType
     * @param {String} moduleType Module Type
     * @return {Array} html table rows
     * @private
     */
    _getRows(moduleType) {
        /**
         * Rate code mapped into human readable string
         * @type {Map<String, String>}
         */
        const rates = new Map([
            ["L", `${getOrdinal(1)}\u202f\u2013\u202f${getOrdinal(3)}`],
            ["M", `${getOrdinal(4)}\u202f\u2013\u202f${getOrdinal(5)}`],
            ["S", `${getOrdinal(6)}\u202f\u2013\u202f${getOrdinal(7)}`]
        ]);

        /**
         * Get ship rate from module level
         * @param {Object} moduleLevel Module level
         * @return {string} Ship rate
         */
        function getRate(moduleLevel) {
            return moduleLevel !== "U" ? ` ${rates.get(moduleLevel)}` : "";
        }

        let rate = "";
        const rows = [];
        this._moduleData.forEach(type => {
            if (type[0] === moduleType) {
                type[1].forEach((module, i) => {
                    /**
                     * Test if current module and module at index position has same properties
                     * @param {integer} index Position
                     * @return {boolean} True if same
                     */
                    function hasSameProperties(index) {
                        return (
                            index < type[1].length &&
                            module.name === type[1][index].name &&
                            JSON.stringify(module.properties) === JSON.stringify(type[1][index].properties)
                        );
                    }

                    rate = getRate(module.moduleLevel);
                    if (hasSameProperties(i + 1)) {
                        // eslint-disable-next-line no-param-reassign
                        type[1][i + 1].hasSamePropertiesAsPrevious = true;
                        rate += `<br>${getRate(type[1][i + 1].moduleLevel)}`;
                    }
                    if (hasSameProperties(i + 2)) {
                        // eslint-disable-next-line no-param-reassign
                        type[1][i + 2].hasSamePropertiesAsPrevious = true;
                        rate = "";
                    }
                    if (
                        typeof module.hasSamePropertiesAsPrevious === "undefined" ||
                        !module.hasSamePropertiesAsPrevious
                    ) {
                        rows.push(
                            `<tr><td><span class="name">${module.name}</span><br>${rate}</td><td>${module.properties
                                .map(property => {
                                    const amount = property.absolute
                                        ? property.amount
                                        : formatSignPercent(property.amount / 100);
                                    return `${property.modifier} ${amount}`;
                                })
                                .join("<br>")}</td></tr>`
                        );
                    }
                });
            }
        });
        return rows;
    }

    /**
     * Construct module list tables
     * @param {string} moduleType Module type.
     * @return {string} html string
     * @private
     */
    _getText(moduleType) {
        const columns = 3,
            rows = this._getRows(moduleType),
            splitRows = chunkify(rows, columns);
        let text = "";
        Array.from(Array(splitRows.length).keys()).forEach(column => {
            text += `<div class="col-md-${Math.floor(12 / splitRows.length)}">`;
            text += '<table class="table table-sm small"><thead>';
            text += "<tr><th>Module</th><th>Modifier</th></tr></thead><tbody>";
            text += splitRows[column].join("");
            text += "</tbody></table></div>";
        });

        return text;
    }

    /**
     * Show modules for selected module type
     * @param {Object} event Event
     * @return {void}
     * @private
     */
    _moduleSelected(event) {
        const moduleType = $(event.currentTarget)
            .find(":selected")
            .val();

        // Remove old recipe list
        d3Select(`#${this._baseId} div`).remove();

        // Add new recipe list
        d3Select(`#${this._baseId}`)
            .append("div")
            .classed("row modules mt-4", true);
        d3Select(`#${this._baseId} div`).html(this._getText(moduleType));
    }
}
