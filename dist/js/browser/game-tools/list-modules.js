/*!
 * This file is part of na-map.
 *
 * @file      List modules.
 * @module    game-tools/list-modules
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap-select/js/bootstrap-select";
import { select as d3Select } from "d3-selection";
import { registerEvent } from "../analytics";
import { putImportError } from "../../common/common";
import { insertBaseModal } from "../../common/common-browser";
import { formatPP, formatSignInt, formatSignPercent } from "../../common/common-format";
import { getOrdinal } from "../../common/common-math";
import { sortBy } from "../../common/common-node";
import { chunkify } from "../util";
export default class ListModules {
    constructor() {
        this._moduleData = {};
        this._baseName = "List modules";
        this._baseId = "module-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._setupListener();
    }
    async _loadAndSetupData() {
        try {
            this._moduleData = (await import("Lib/gen-generic/modules.json"))
                .default;
        }
        catch (error) {
            putImportError(error);
        }
    }
    _setupListener() {
        var _a;
        let firstClick = true;
        (_a = document.querySelector(`#${this._buttonId}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false;
                await this._loadAndSetupData();
            }
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._moduleListSelected();
        });
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName });
        const id = `${this._baseId}-select`;
        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("label").attr("for", id);
        body.append("select").attr("name", id).attr("id", id);
        body.append("div").attr("id", `${this._baseId}`).attr("class", "container-fluid");
    }
    _getOptions() {
        return `${this._moduleData.map((type) => `<option value="${type[0]}"">${type[0]}</option>;`).join("")}`;
    }
    _setupSelect() {
        const select$ = $(`#${this._baseId}-select`);
        const options = this._getOptions();
        select$.append(options);
    }
    _setupSelectListener() {
        const select$ = $(`#${this._baseId}-select`);
        select$
            .addClass("selectpicker")
            .on("change", (event) => this._moduleSelected(event))
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
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
    _getRows(moduleType) {
        const rates = new Map([
            ["L", `${getOrdinal(1)}\u202F\u2013\u202f${getOrdinal(3)}`],
            ["M", `${getOrdinal(4)}\u202F\u2013\u202f${getOrdinal(5)}`],
            ["S", `${getOrdinal(6)}\u202F\u2013\u202f${getOrdinal(7)}`],
        ]);
        const getRate = (moduleLevel) => (moduleLevel === "U" ? "" : `${rates.get(moduleLevel)}`);
        let rate = "";
        const rows = [];
        for (const type of this._moduleData) {
            if (type[0] === moduleType) {
                type[1].sort(sortBy(["name"])).forEach((module, i) => {
                    const hasSameProperties = (index) => index < type[1].length &&
                        module.name === type[1][index].name &&
                        JSON.stringify(module.properties) === JSON.stringify(type[1][index].properties);
                    rate = getRate(module.moduleLevel);
                    if (hasSameProperties(i + 1)) {
                        type[1][i + 1].hasSamePropertiesAsPrevious = true;
                        rate += `<br>${getRate(type[1][i + 1].moduleLevel)}`;
                    }
                    if (hasSameProperties(i + 2)) {
                        type[1][i + 2].hasSamePropertiesAsPrevious = true;
                        rate = "";
                    }
                    if (typeof module.hasSamePropertiesAsPrevious === "undefined" ||
                        !module.hasSamePropertiesAsPrevious) {
                        rows.push(`<tr><td><span class="name">${module.name}<br>${rate}</span></td><td>${module.properties
                            .map((property) => {
                            let amount;
                            if (property.isPercentage) {
                                amount = formatSignPercent(property.amount / 100);
                            }
                            else {
                                amount =
                                    property.amount < 1 && property.amount > 0
                                        ? formatPP(property.amount)
                                        : formatSignInt(property.amount);
                            }
                            return `${property.modifier} ${amount}`;
                        })
                            .join("<br>")}</td></tr>`);
                    }
                });
            }
        }
        return rows;
    }
    _getText(moduleType) {
        const columns = 3;
        const rows = this._getRows(moduleType);
        const splitRows = chunkify(rows, columns);
        let text = "";
        for (const column of [...new Array(splitRows.length).keys()]) {
            text += `<div class="col-md-${Math.floor(12 / splitRows.length)}">`;
            text += '<table class="table table-sm small"><thead>';
            text += "<tr><th>Module</th><th>Modifier</th></tr></thead><tbody>";
            text += splitRows[column].join("");
            text += "</tbody></table></div>";
        }
        return text;
    }
    _moduleSelected(event) {
        const moduleType = $(event.currentTarget).find(":selected").val();
        d3Select(`#${this._baseId} div`).remove();
        d3Select(`#${this._baseId}`).append("div").classed("row modules mt-4", true);
        d3Select(`#${this._baseId} div`).html(this._getText(moduleType));
    }
}
//# sourceMappingURL=list-modules.js.map