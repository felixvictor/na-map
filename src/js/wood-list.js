/**
 * This file is part of na-map.
 *
 * @file      Wood list.
 * @module    wood-list
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global d3 : false
 */

// eslint-disable-next-line import/no-named-default
import { default as Tablesort } from "tablesort";
import { insertBaseModal } from "./common";
import { capitalizeFirstLetter, formatFloatFixed } from "./util";
import { registerEvent } from "./analytics";

/**
 *
 */
export default class WoodList {
    constructor(woodData) {
        this._woodData = woodData;

        this._baseName = "List woods";
        this._baseId = "wood-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._woodListSelected();
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        const body = d3.select(`#${this._modalId} .modal-body`);
        body.append("h5").text("Frames");
        body.append("div")
            .attr("id", "frame-list")
            .attr("class", "modules");
        body.append("h5").text("Trims");
        body.append("div")
            .attr("id", "trim-list")
            .attr("class", "modules");
    }

    _initModal() {
        this._injectModal();
        this._injectList("frame");
        this._injectList("trim");
    }

    _woodListSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    /**
     * Show wood type
     * @param {string} type Wood type (frame or trim)
     * @return {void}
     * @private
     */
    _injectList(type) {
        $(`#${type}-list`).append(this._getList(type));
        const table = document.getElementById(`table-${type}-list`),
            sortTable = new Tablesort(table);
    }

    _getModifiers(type) {
        const modifiers = new Set();
        this._woodData[type].forEach(wood => {
            wood.properties.forEach(property => {
                if (property.modifier !== "Ship material" && property.modifier !== "Boarding morale") {
                    modifiers.add(property.modifier);
                }
            });
        });
        return Array.from(modifiers).sort();
    }

    _getList(type) {
        const modifiers = this._getModifiers(type);
        let text = "";

        text += `<table id="table-${type}-list" class="table table-sm small tablesort"><thead><tr><th>${capitalizeFirstLetter(
            type
        )}</th>`;
        modifiers.forEach(modifier => {
            text += `<th>${modifier}</th>`;
        });
        text += "</tr></thead><tbody>";

        this._woodData[type].forEach(wood => {
            text += `<tr><td>${wood.name}</td>`;
            modifiers.forEach(modifier => {
                const amount = wood.properties
                    .filter(property => property.modifier === modifier)
                    .map(property => property.amount)[0];
                text += `<td class="text-right">${amount ? formatFloatFixed(amount) : ""}</td>`;
            });
            text += "</tr>";
        });
        text += "</tbody></table>";

        return text;
    }
}
