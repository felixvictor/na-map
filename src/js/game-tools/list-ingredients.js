/**
 * This file is part of na-map.
 *
 * @file      List ingredients.
 * @module    game-tools/list-ingredients
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/tooltip";
import { select as d3Select } from "d3-selection";

import { registerEvent } from "../analytics";
import { insertBaseModal } from "../common";
import { chunkify, formatSignInt, formatSignPercent, putImportError } from "../util";

export default class ListIngredients {
    constructor() {
        this._baseName = "List recipe ingredients";
        this._baseId = "ingredient-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupListener();
    }

    async _loadAndSetupData() {
        try {
            this._moduleData = await import(/* webpackChunkName: "data-modules" */ "../../gen/modules.json").then(
                data => data.default
            );
            this._ingredientData = await import(/* webpackChunkName: "data-recipes" */ "../../gen/recipes.json").then(
                data => data.default.ingredient
            );
        } catch (error) {
            putImportError(error);
        }
    }

    _setupListener() {
        let firstClick = true;

        document.getElementById(this._buttonId).addEventListener("click", async event => {
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
        insertBaseModal(this._modalId, this._baseName);

        const body = d3Select(`#${this._modalId} .modal-body`);

        body.append("div")
            .attr("id", `${this._baseId}`)
            .attr("class", "container-fluid");
    }

    _initModal() {
        this._injectModal();
        this._injectList();
    }

    _ingredientListSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }

        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    _getProperties(recipeName) {
        let text = "";
        let moduleType = "";
        let properties = "";
        this._moduleData.forEach(type => {
            type[1]
                .filter(module => module.name === recipeName)
                .forEach(module => {
                    moduleType = type[0];

                    properties = `<tr><td>${module.properties
                        .map(property => {
                            const amount = property.isPercentage
                                ? formatSignPercent(property.amount / 100)
                                : formatSignInt(property.amount);
                            return `${property.modifier} ${amount}`;
                        })
                        .join("</td></tr><tr><td>")}</td></tr>`;
                });
        });
        text = `<h6 class='text-muted text-left'>${moduleType}</h6>`;
        text += `<table class='table table-sm'><tbody>${properties}</tbody></table>`;

        return properties ? text : "";
    }

    _getRows() {
        return this._ingredientData.map(
            ingredient =>
                `<tr><td>${ingredient.name}</td><td>${ingredient.recipeNames
                    .map(recipeName => {
                        const properties = this._getProperties(recipeName);

                        return properties
                            ? `<a data-toggle="tooltip" title="${properties}">${recipeName}</a>`
                            : recipeName;
                    })
                    .join("<br>")}</td></tr>`
        );
    }

    /**
     * Construct ingredient tables
     * @param {string} selectedIngredientName Selected ingredient.
     * @return {string} html string
     * @private
     */
    _getText() {
        const columns = 2;
        const rows = this._getRows();
        const splitRows = chunkify(rows, columns);
        let text = "";
        [...new Array(splitRows.length).keys()].forEach(column => {
            text += `<div class="col-md-${Math.floor(12 / splitRows.length)}">`;
            text += '<table class="table table-sm"><thead>';
            text += "<tr><th>Ingredient</th><th>Recipes</th></tr></thead><tbody>";
            text += splitRows[column].join("");
            text += "</tbody></table></div>";
        });

        return text;
    }

    /**
     * Show ingredients
     * @return {void}
     * @private
     */
    _injectList() {
        // Remove old recipe list
        d3Select(`#${this._baseId} div`).remove();

        // Add new recipe list
        d3Select(`#${this._baseId}`)
            .append("div")
            .classed("row ingredients", true);
        d3Select(`#${this._baseId} div`).html(this._getText());
        $('[data-toggle="tooltip"]').tooltip({
            html: true,
            placement: "auto",
            sanitize: false
        });
    }
}
