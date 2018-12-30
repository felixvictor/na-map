/**
 * This file is part of na-map.
 *
 * @file      List recipes.
 * @module    game-tools/list-recipes
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";
import { formatSignPercent } from "../util";
import { registerEvent } from "../analytics";
import { getCurrencyAmount, insertBaseModal } from "../common";

export default class ListRecipes {
    constructor(recipeData, moduleData) {
        this._recipeData = recipeData.map(recipe => {
            // eslint-disable-next-line no-param-reassign
            recipe.name = recipe.name.replace(" Blueprint", "");
            return recipe;
        });
        this._moduleData = moduleData;

        this._baseName = "List recipes";
        this._baseId = "recipe-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._recipeListSelected();
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
        return `${this._recipeData.map(recipe => `<option value="${recipe.name}">${recipe.name}</option>;`).join("")}`;
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
            .on("change", event => this._recipeSelected(event))
            .selectpicker({ noneSelectedText: "Select recipe" })
            .val("default")
            .selectpicker("refresh");
    }

    _initModal() {
        this._injectModal();
        this._setupSelect();
        this._setupSelectListener();
    }

    _recipeListSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    _getRecipeData(selectedRecipeName) {
        return this._recipeData.filter(recipe => recipe.name === selectedRecipeName)[0];
    }

    _getRequirementText(currentRecipe) {
        let text = '<table class="table table-sm"><tbody>';
        if (currentRecipe.laborPrice) {
            text += `<tr><td>${currentRecipe.laborPrice} labour hours</td></tr>`;
        }
        if (currentRecipe.goldPrice) {
            text += `<tr><td>${getCurrencyAmount(currentRecipe.goldPrice)}</td></tr>`;
        }
        if (currentRecipe.itemRequirements.length) {
            text += `<tr><td>${currentRecipe.itemRequirements
                .map(requirement => `${requirement.amount} ${requirement.name}`)
                .join("</td></tr><tr><td>")}</td></tr>`;
        }
        text += "</tbody></table>";

        return text;
    }

    _getModuleText(moduleName) {
        let text = "",
            moduleType = "",
            properties = "";
        this._moduleData.forEach(type => {
            type[1]
                .filter(module => module.name === moduleName)
                .forEach(module => {
                    moduleType = type[0];
                    properties = `<tr><td>${module.properties
                        .map(property => {
                            const amount = property.absolute
                                ? property.amount
                                : formatSignPercent(property.amount / 100);
                            return `${property.modifier} ${amount}`;
                        })
                        .join("</td></tr><tr><td>")}</td></tr>`;
                });
        });
        text = `<h6 class="card-subtitle mb-2 text-muted">${moduleType}</h6>`;
        text += `<table class="table table-sm"><tbody>${properties}</tbody></table>`;

        return text;
    }

    /**
     * Construct recipe tables
     * @param {string} selectedRecipeName Selected recipe.
     * @return {string} html string
     * @private
     */
    _getText(selectedRecipeName) {
        const currentRecipe = this._getRecipeData(selectedRecipeName),
            moduleName = currentRecipe.module ? currentRecipe.module : currentRecipe.name;

        let text = '<div class="row no-gutters card-deck">';

        text += '<div class="card col-4"><div class="card-header">ListRecipes</div>';
        text += '<div class="card-body"><h5 class="card-title">Requirements</h5>';
        text += this._getRequirementText(currentRecipe);
        text += "</div></div>";

        text += '<div class="card col-4"><div class="card-header">Resulting module</div>';
        text += '<div class="card-body"><h5 class="card-title">Properties</h5>';
        text += this._getModuleText(moduleName);
        text += "</div></div>";

        text += "</div></div>";
        return text;
    }

    /**
     * Show recipes for selected recipe type
     * @param {Object} event Event
     * @return {void}
     * @private
     */
    _recipeSelected(event) {
        const recipe = $(event.currentTarget)
            .find(":selected")
            .val();

        // Remove old recipe list
        d3Select(`#${this._baseId} div`).remove();

        // Add new recipe list
        d3Select(`#${this._baseId}`)
            .append("div")
            .classed("recipes mt-4", true);
        d3Select(`#${this._baseId} div`).html(this._getText(recipe));
    }
}
