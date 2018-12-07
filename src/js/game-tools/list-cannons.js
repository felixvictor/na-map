/**
 * This file is part of na-map.
 *
 * @file      List cannons.
 * @module    game-tools/list-cannons
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";
// eslint-disable-next-line import/no-named-default
import { default as Tablesort } from "tablesort";
import { insertBaseModal } from "../common";
import { capitalizeFirstLetter, formatFloatFixed } from "../util";
import { registerEvent } from "../analytics";

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

/**
 *
 */
export default class ListCannons {
    constructor(cannonData) {
        this._cannonData = cannonData;

        this._baseName = "List cannons";
        this._baseId = "cannon-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._groups = ["damage", "dispersion", "generic", "crew"];
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

        const body = d3Select(`#${this._modalId} .modal-body`);
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
            this._groups.forEach(group => {
                Object.entries(cannon[group]).forEach(([key]) => {
                    modifiers.add(`${group} ${key}`);
                });
            });
        });
        return Array.from(modifiers).sort();
    }

    _getList(type) {
        const modifiers = this._getModifiers(type);
        let text = "";

        text += `<table id="table-${type}-list" class="table table-sm small tablesort"><thead><tr><th data-sort-default>Pounds</th>`;
        modifiers.forEach(modifier => {
            const name = capitalizeFirstLetter(
                modifier
                    .replace("generic ", "")
                    .replace("damage basic", "damage")
                    .replace("damage penetration", "penetration")
            );
            text += `<th>${name}</th>`;
        });
        text += "</tr></thead><tbody>";

        this._cannonData[type].forEach(cannon => {
            const name = cannon.name.replace(" (", "<br>(").replaceAll(" ", "\u00a0");
            text += `<tr><td class="text-right" data-sort="${parseInt(cannon.name, 10)}">${name}</td>`;
            modifiers.forEach(modifier => {
                this._groups.forEach(group => {
                    Object.entries(cannon[group]).forEach(([key, value]) => {
                        if (`${group} ${key}` === modifier) {
                            text += `<td class="text-right" data-sort="${value || 0}">${
                                value ? formatFloatFixed(value) : ""
                            }</td>`;
                        }
                    });
                });
            });
            text += "</tr>";
        });
        text += "</tbody></table>";
        return text;
    }
}
