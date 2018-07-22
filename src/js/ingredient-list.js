/*    ingredient-list.js
 */

/* global d3 : false
 */

import { chunkify, formatSignPercent } from "./util";
import { registerEvent } from "./analytics";

export default class Ingredient {
    constructor(ingredientData, moduleData) {
        this._ingredientData = ingredientData;
        this._moduleData = moduleData;

        this._setupListener();
    }

    _setupListener() {
        $("#button-ingredient-list").on("click", event => {
            registerEvent("Tools", "List ingredients");
            event.stopPropagation();
            this._ingredientListSelected();
        });
    }

    _ingredientListSelected() {
        $("#modal-ingredients").modal("show");
        this._div = "#ingredients-list";
        this._showIngredient();
    }

    _getProperties(recipeName) {
        let text = "",
            moduleType = "",
            properties = "";
        this._moduleData.forEach(type => {
            type[1].filter(module => module.name === recipeName).forEach(module => {
                moduleType = type[0];
                properties = `<tr><td>${module.properties
                    .map(property => {
                        const amount = property.absolute ? property.amount : formatSignPercent(property.amount / 100);
                        return `${property.modifier} ${amount}`;
                    })
                    .join("</td></tr><tr><td>")}</td></tr>`;
            });
        });
        text = `<h6 class='text-muted text-left'>${moduleType}</h6>`;
        text += `<table class='table table-sm'><tbody>${properties}</tbody></table>`;

        return text;
    }

    _getRows() {
        /*

        text = `<h6 class="card-subtitle mb-2 text-muted">${moduleType}</h6>`;
        text += `<table class="table table-sm"><tbody>${properties}</tbody></table>`;
        */

        return this._ingredientData.map(
            ingredient =>
                `<tr><td>${ingredient.name}</td><td>${ingredient.recipe
                    .map(
                        recipeName =>
                            `<a data-toggle="tooltip" data-html="true" title="${this._getProperties(
                                recipeName
                            )}">${recipeName}</a>`
                    )
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
        const columns = 2,
            rows = this._getRows(),
            splitRows = chunkify(rows, columns);
        let text = "";
        Array.from(Array(splitRows.length).keys()).forEach(column => {
            text += `<div class="col-md-${Math.floor(12 / splitRows.length)}">`;
            text += '<table class="table table-sm"><thead>';
            text += "<tr><th>Ingredient</th><th>Recipe</th></tr></thead><tbody>";
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
    _showIngredient() {
        // Remove old ingredient list
        d3.select(`${this._div} div`).remove();

        // Add new ingredient list
        d3.select(this._div)
            .append("div")
            .classed("row ingredients mt-4", true);
        $(this._div)
            .find("div")
            .append(this._getText());
        $('[data-toggle="tooltip"]').tooltip();
    }
}
