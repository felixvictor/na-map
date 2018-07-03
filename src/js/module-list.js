/*
    module-list.js
 */

/* global d3 : false
 */

import { formatSignPercent, getOrdinal } from "./util";

export default class Module {
    constructor(moduleData) {
        this._moduleData = moduleData;

        this._setupData();
        this._setupListener();
        this._setupSelect();
    }

    _setupData() {
        this._options = `${this._moduleData.map(type => `<option value="${type[0]}"">${type[0]}</option>;`).join("")}`;
    }

    _setupListener() {
        $("#button-module-list").on("click", event => {
            event.stopPropagation();
            this._moduleListSelected();
        });
    }

    _moduleListSelected() {
        $("#modal-modules").modal("show");
        this._div = "#modules-list";
    }

    _setupSelect() {
        const select = $("#modules-select");
        select.append(this._options);

        select
            .addClass("selectpicker")
            .on("change", event => this._moduleSelected(event))
            .selectpicker({ noneSelectedText: "Select module type" });
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
        /** Split array into n pieces
         * {@link https://stackoverflow.com/questions/8188548/splitting-a-js-array-into-n-arrays}
         * @param {Array} array Array to be split
         * @param {Integer} n Number of splits
         * @param {Boolean} balanced True if splits' lengths differ as less as possible
         * @return {Array} Split arrays
         */
        function chunkify(array, n, balanced = true) {
            if (n < 2) {
                return [array];
            }

            const len = array.length,
                out = [];
            let i = 0,
                size;

            if (len % n === 0) {
                size = Math.floor(len / n);
                while (i < len) {
                    out.push(array.slice(i, (i += size)));
                }
            } else if (balanced) {
                while (i < len) {
                    // eslint-disable-next-line no-param-reassign, no-plusplus
                    size = Math.ceil((len - i) / n--);
                    out.push(array.slice(i, (i += size)));
                }
            } else {
                // eslint-disable-next-line no-param-reassign
                n -= 1;
                size = Math.floor(len / n);
                if (len % size === 0) {
                    size -= 1;
                }
                while (i < size * n) {
                    out.push(array.slice(i, (i += size)));
                }
                out.push(array.slice(size * n));
            }

            return out;
        }

        const columns = 3,
            rows = this._getRows(moduleType),
            splitRows = chunkify(rows, columns);
        let text = "";
        Array.from(Array(splitRows.length).keys()).forEach(column => {
            text += `<div class="col-md-${Math.floor(12 / splitRows.length)}">`;
            text += '<div class="row modules">';
            text += '<div class="col-sm-11">';
            text += '<table class="table table-sm small mt-4"><thead>';
            text += "<tr>";
            text += "<tr><th>Module</th><th>Modifier</th></tr></thead><tbody>";
            text += splitRows[column].join("");
            text += "</tbody></table></div></div></div>";
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

        // Remove old module list
        d3.select(`${this._div} div`).remove();

        // Add new module list
        d3.select(this._div)
            .append("div")
            .classed("row", true);
        $(this._div)
            .find("div")
            .append(this._getText(moduleType));
    }
}
