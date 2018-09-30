/**
 * This file is part of na-map.
 *
 * @file      Cannon list.
 * @module    cannon-list
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
export default class CannonList {
    constructor(cannonData) {
        this._cannonData = cannonData;

        this._baseName = "List cannons";
        this._baseId = "cannon-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._cannonListSelected();
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        const body = d3.select(`#${this._modalId} .modal-body`);
        ["medium", "long", "carronade"].forEach(type => {
            body.append("h5").text(capitalizeFirstLetter(type));
            body.append("div")
                .attr("id", `${type}-list`)
                .attr("class", "modules");
        });
    }

    _initTablesort() {
        const cleanNumber = i => i.replace(/[^\-?0-9.]/g, ""),
            compareNumber = (a, b) => {
                let aa = parseFloat(a),
                    bb = parseFloat(b);

                aa = Number.isNaN(aa) ? 0 : aa;
                bb = Number.isNaN(bb) ? 0 : bb;

                return aa - bb;
            };

        Tablesort.extend(
            "number",
            item =>
                item.match(/^[-+]?[£\x24Û¢´€]?\d+\s*([,.]\d{0,2})/) || // Prefixed currency
                item.match(/^[-+]?\d+\s*([,.]\d{0,2})?[£\x24Û¢´€]/) || // Suffixed currency
                item.match(/^[-+]?(\d)*-?([,.])?-?(\d)+([E,e][-+][\d]+)?%?$/), // Number
            (a, b) => {
                const aa = cleanNumber(a),
                    bb = cleanNumber(b);

                return compareNumber(bb, aa);
            }
        );
    }

    _initModal() {
        this._initTablesort();
        this._injectModal();
        ["medium", "long", "carronade"].forEach(type => {
            this._injectList(type);
        });
    }

    _cannonListSelected() {
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

        this._cannonData[type].forEach(cannon => {
            console.log(cannon);
            ["damage", "dispersion", "generic", "strength", "crew"].forEach(group => {
                console.log(cannon[group]);
                Object.entries(cannon[group]).forEach(([key]) => {
                    console.log(key);
                    modifiers.add(`${group} ${key}`);
                });
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

        this._cannonData[type].forEach(cannon => {
            text += `<tr><td>${cannon.name}</td>`;
            modifiers.forEach(modifier => {
                ["damage", "dispersion", "generic", "strength", "crew"].forEach(group => {
                    Object.entries(cannon[group]).forEach(([key, value]) => {
                        if (`${group} ${key}` === modifier) {
                            text += `<td class="text-right" data-sort="${value}">${
                                value ? formatFloatFixed(value) : ""
                            }</td>`;
                        }
                    });
                });
            });
            text += "</tr>";
        });
        text += "</tbody></table>";
        console.log(text);
        return text;
    }
}
