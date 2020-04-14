/*!
 * This file is part of na-map.
 *
 * @file      List ingredients.
 * @module    game-tools/list-ingredients
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/tooltip";
import { select as d3Select } from "d3-selection";
import { registerEvent } from "../analytics";
import { putImportError } from "../../common/common";
import { insertBaseModal } from "../../common/common-browser";
import { formatSignInt, formatSignPercent } from "../../common/common-format";
import { sortBy } from "../../common/common-node";
import { chunkify } from "../util";
export default class ListIngredients {
    constructor() {
        this._moduleData = {};
        this._ingredientData = {};
        this._baseName = "List recipe ingredients";
        this._baseId = "ingredient-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._setupListener();
    }
    async _loadAndSetupData() {
        try {
            this._moduleData = (await import("Lib/gen-generic/modules.json"))
                .default;
            this._ingredientData = (await import("Lib/gen-generic/recipes.json"))
                .default.ingredient;
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
            this._ingredientListSelected();
        });
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName });
        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("div").attr("id", `${this._baseId}`).attr("class", "container-fluid");
    }
    _initModal() {
        this._injectModal();
        this._injectList();
    }
    _ingredientListSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
    _getProperties(recipeName) {
        let text = "";
        let moduleType = "";
        let properties = "";
        for (const type of this._moduleData) {
            const modules = type[1].sort(sortBy(["name"])).filter((module) => module.name === recipeName);
            for (const module of modules) {
                moduleType = type[0];
                properties = `<tr><td>${module.properties
                    .map((property) => {
                    const amount = property.isPercentage
                        ? formatSignPercent(property.amount / 100)
                        : formatSignInt(property.amount);
                    return `${property.modifier} ${amount}`;
                })
                    .join("</td></tr><tr><td>")}</td></tr>`;
            }
        }
        text = `<h6 class='text-muted text-left'>${moduleType}</h6>`;
        text += `<table class='table table-sm'><tbody>${properties}</tbody></table>`;
        return properties ? text : "";
    }
    _getRows() {
        return this._ingredientData.map((ingredient) => `<tr><td>${ingredient.name}</td><td>${ingredient.recipeNames
            .map((recipeName) => {
            const properties = this._getProperties(recipeName);
            return properties
                ? `<a data-toggle="tooltip" title="${properties}">${recipeName}</a>`
                : recipeName;
        })
            .join("<br>")}</td></tr>`);
    }
    _getText() {
        const columns = 2;
        const rows = this._getRows();
        const splitRows = chunkify(rows, columns);
        let text = "";
        for (const column of [...new Array(splitRows.length).keys()]) {
            text += `<div class="col-md-${Math.floor(12 / splitRows.length)}">`;
            text += '<table class="table table-sm"><thead>';
            text += "<tr><th>Ingredient</th><th>Recipes</th></tr></thead><tbody>";
            text += splitRows[column].join("");
            text += "</tbody></table></div>";
        }
        return text;
    }
    _injectList() {
        d3Select(`#${this._baseId} div`).remove();
        d3Select(`#${this._baseId}`).append("div").classed("row ingredients", true);
        d3Select(`#${this._baseId} div`).html(this._getText());
        $('[data-toggle="tooltip"]').tooltip({
            html: true,
            placement: "auto",
            sanitize: false,
        });
    }
}
//# sourceMappingURL=list-ingredients.js.map