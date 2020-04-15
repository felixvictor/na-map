/*!
 * This file is part of na-map.
 *
 * @file      List recipes.
 * @module    game-tools/list-recipes
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap-select/js/bootstrap-select";
import { select as d3Select } from "d3-selection";
import { nest as d3Nest } from "d3-collection";
import { ascending as d3Ascending } from "d3-array";
import { registerEvent } from "../analytics";
import { formatInt, formatSignPercent } from "../../common/common-format";
import { getOrdinal } from "../../common/common-math";
import { putImportError } from "../../common/common";
import { getCurrencyAmount, insertBaseModal } from "../../common/common-browser";
import { sortBy } from "../../common/common-node";
const servers = require("../../common/servers");
const replacer = (match, p1, p2) => `${getOrdinal(p1)}\u202F\u2013\u202f${getOrdinal(p2)}`;
export default class ListRecipes {
    constructor(serverId) {
        this._moduleData = {};
        this._recipeData = {};
        this._serverType = servers.find((server) => server.id === serverId).type;
        this._baseName = "List admiralty items and recipes";
        this._baseId = "recipe-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._setupListener();
    }
    async _loadAndSetupData() {
        try {
            this._moduleData = (await import("Lib/gen-generic/modules.json"))
                .default;
            this._recipeData = (await import("Lib/gen-generic/recipes.json"))
                .default.recipe;
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
            this._recipeListSelected();
        });
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName });
        const id = `${this._baseId}-select`;
        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("select").attr("name", id).attr("id", id);
        body.append("label")
            .attr("for", id)
            .attr("class", "text-muted pl-2")
            .text("Items listed here may not be available in the game (yet).");
        body.append("div").attr("id", `${this._baseId}`).attr("class", "container-fluid");
    }
    _getOptions() {
        const recipeData = d3Nest()
            .key((recipe) => recipe.craftGroup)
            .sortKeys(d3Ascending)
            .sortValues(sortBy(["name"]))
            .entries(this._recipeData.filter((recipe) => recipe.serverType === "Any" || recipe.serverType === this._serverType));
        return recipeData
            .map((key) => `<optgroup label="${key.key}">${key.values
            .map((recipe) => `<option value="${recipe.id}">${recipe.name.replace(/(\d)-(\d)(st|rd|th)/, replacer)}`)
            .join("</option>")}`)
            .join("</optgroup>");
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
            .on("change", (event) => this._recipeSelected(event))
            .selectpicker({
            dropupAuto: false,
            liveSearch: true,
            liveSearchNormalize: true,
            liveSearchPlaceholder: "Search ...",
            title: "Select item",
            virtualScroll: true,
        });
    }
    _initModal() {
        this._injectModal();
        this._setupSelect();
        this._setupSelectListener();
    }
    _recipeListSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
    _getRecipeData(selectedRecipeId) {
        return this._recipeData.find((recipe) => recipe.id === selectedRecipeId);
    }
    _getRequirementText(currentRecipe) {
        let text = '<table class="table table-sm card-table"><tbody>';
        if (currentRecipe.labourPrice) {
            text += `<tr><td>${currentRecipe.labourPrice} labour hours</td></tr>`;
        }
        if (currentRecipe.goldPrice) {
            text += `<tr><td>${getCurrencyAmount(currentRecipe.goldPrice)}</td></tr>`;
        }
        if (currentRecipe.itemRequirements.length > 0) {
            text += `<tr><td>${currentRecipe.itemRequirements
                .map((requirement) => `${requirement.amount} ${requirement.name}`)
                .join("</td></tr><tr><td>")}</td></tr>`;
        }
        text += "</tbody></table>";
        return text;
    }
    _getPropertiesText(currentRecipe) {
        let text = "";
        let moduleType = "";
        let properties = "";
        for (const type of this._moduleData) {
            const modules = type[1].filter((module) => module.id === currentRecipe.result.id);
            for (const module of modules) {
                ;
                [moduleType] = type;
                properties = `<tr><td>${module.properties
                    .map((property) => {
                    const amount = property.isPercentage
                        ? formatSignPercent(property.amount / 100)
                        : property.amount;
                    return `${property.modifier} ${amount}`;
                })
                    .join("</td></tr><tr><td>")}</td></tr>`;
            }
        }
        if (properties) {
            text += `<h6 class="card-subtitle mb-2 text-muted">${moduleType}</h6>`;
            text += `<table class="table table-sm card-table"><tbody>${properties}</tbody></table>`;
        }
        else {
            text += `<p>${formatInt(currentRecipe.result.amount)} ${currentRecipe.result.name}</p>`;
        }
        return text;
    }
    _getText(selectedRecipeId) {
        const currentRecipe = this._getRecipeData(selectedRecipeId);
        let text = '<div class="row no-gutters card-deck">';
        text += '<div class="card col-6"><div class="card-header">Item</div>';
        text += '<div class="card-body">';
        text += this._getRequirementText(currentRecipe);
        text += "</div></div>";
        text += '<div class="card col-6"><div class="card-header">Result</div>';
        text += '<div class="card-body">';
        text += this._getPropertiesText(currentRecipe);
        text += "</div></div>";
        text += "</div></div>";
        return text;
    }
    _recipeSelected(event) {
        const recipeId = Number($(event.currentTarget).find(":selected").val());
        d3Select(`#${this._baseId} div`).remove();
        d3Select(`#${this._baseId}`).append("div").classed("recipes mt-4", true);
        d3Select(`#${this._baseId} div`).html(this._getText(recipeId));
    }
}
//# sourceMappingURL=list-recipes.js.map