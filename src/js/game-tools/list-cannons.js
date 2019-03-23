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
import { capitalizeFirstLetter, formatFloatFixed, formatInt } from "../util";
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
        this._groups = new Map();
        this._cannonData.long.forEach(group => {
            for (const [key, value] of Object.entries(group)) {
                if (key !== "name") {
                    this._groups.set(key, { values: value, count: Object.entries(value).length });
                }
            }
        });
        this._groups = new Map([...this._groups.entries()].sort());

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
        const cleanNumber = i => i.replace(/[^\-?0-9.]/g, "");
        const compareNumber = (a, b) => {
            let aa = parseFloat(a);
            let bb = parseFloat(b);

            aa = Number.isNaN(aa) ? 0 : aa;
            bb = Number.isNaN(bb) ? 0 : bb;

            return aa - bb;
        };

        Tablesort.extend(
            "number",
            item =>
                item.match(/^[-+]?[£\u0024Û¢´€]?\d+\s*([,.]\d{0,2})/) || // Prefixed currency
                item.match(/^[-+]?\d+\s*([,.]\d{0,2})?[£\u0024Û¢´€]/) || // Suffixed currency
                item.match(/^[-+]?(\d)*-?([,.])?-?(\d)+([E,e][-+][\d]+)?%?$/), // Number
            (a, b) => {
                const aa = cleanNumber(a);
                const bb = cleanNumber(b);

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
        const table = document.getElementById(`table-${type}-list`);
        // eslint-disable-next-line no-unused-vars
        const sortTable = new Tablesort(table);
    }

    _getList(type) {
        let text = "";

        text += `<table id="table-${type}-list" class="table table-sm small tablesort">`;
        text += '<thead><tr><th scope="col"></th>';
        this._groups.forEach((groupValue, groupKey) => {
            text += `<th scope="col" class="text-center" colspan="${groupValue.count}">${capitalizeFirstLetter(
                groupKey
            )}</th>`;
        });
        text += "</tr>";
        text += '<tr><th scope="col" class="text-right" data-sort-default>Pd</th>';
        this._groups.forEach(groupValue => {
            Object.entries(groupValue.values).forEach(modifierValue => {
                text += `<th class="text-right">${capitalizeFirstLetter(modifierValue[0])}</th>`;
            });
        });
        text += "</tr></thead><tbody>";

        this._cannonData[type].forEach(cannon => {
            const name = cannon.name.replace(" (", "<br>(").replaceAll(" ", "\u00A0");
            text += `<tr><th scope="row" class="text-right" data-sort="${parseInt(cannon.name, 10)}">${name}</th>`;

            Object.entries(cannon).forEach((groupValue, groupKey) => {
                if (groupValue[0] !== "name") {
                    Object.entries(groupValue[1]).forEach(modifierValue => {
                        text += `<td class="text-right" data-sort="${modifierValue[1] || 0}">${
                            modifierValue[1] ? formatFloatFixed(modifierValue[1]) : ""
                        }</td>`;
                    });
                }
            });
            text += "</tr>";
        });
        text += "</tbody></table>";
        return text;
    }
}
