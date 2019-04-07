/**
 * This file is part of na-map.
 *
 * @file      List cannons.
 * @module    game-tools/list-cannons
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat";
// eslint-disable-next-line import/no-named-default
import { default as Tablesort } from "tablesort";

import { registerEvent } from "../analytics";
import { initTablesort, insertBaseModalHTML } from "../common";
import { capitalizeFirstLetter, formatFloatFixedHTML } from "../util";

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

        this._cannonTypes = ["medium", "long", "carronade"];
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

    _getList(type) {
        const getColumnGroupHeads = groupValue => html`
            <th scope="col" class="text-center" colspan="${groupValue[1].count}">
                ${capitalizeFirstLetter(groupValue[0])}
            </th>
        `;

        const getColumnHeads = groupValue => html`
            ${/* eslint-disable indent */
            Object.entries(groupValue[1].values).map(
                modifierValue =>
                    html`
                        <th class="text-right">${capitalizeFirstLetter(modifierValue[0])}</th>
                    `
            )}
        `;

        const getRowHead = name => html`
            <th scope="row" class="text-right" data-sort="${parseInt(name, 10)}">
                ${name}
            </th>
        `;

        const getRow = cannon => html`
            ${Object.entries(cannon).map(groupValue => {
                if (groupValue[0] === "name") {
                    return "";
                }

                return Object.entries(groupValue[1]).map(
                    modifierValue =>
                        html`
                            <td class="text-right" data-sort="${modifierValue[1] || 0}">
                                ${modifierValue[1] ? formatFloatFixedHTML(modifierValue[1]) : ""}
                            </td>
                        `
                );
            })}
        `;

        return html`
            <table id="table-${type}-list" class="table table-sm small tablesort">
                <thead>
                    <tr>
                        <th scope="col"></th>

                        ${/* eslint-disable indent */
                        repeat(
                            this._groups,
                            (groupValue, groupKey) => groupKey,
                            groupValue => getColumnGroupHeads(groupValue)
                        )}
                    </tr>
                    <tr>
                        <th scope="col" class="text-right" data-sort-default>Lb</th>

                        ${repeat(
                            this._groups,
                            (groupValue, groupKey) => groupKey,
                            groupValue => getColumnHeads(groupValue)
                        )}
                    </tr>
                </thead>
                <tbody>
                    ${/* eslint-disable indent */
                    repeat(
                        this._cannonData[type],
                        cannon => cannon.id,
                        cannon => {
                            return html`
                                <tr>
                                    ${getRowHead(cannon.name)}${getRow(cannon)}
                                </tr>
                            `;
                        }
                    )}
                </tbody>
            </table>
        `;
    }

    _getModalBody() {
        return html`
            ${/* eslint-disable indent */
            repeat(
                this._cannonTypes,
                type => type,
                type =>
                    html`
                        <h5>${capitalizeFirstLetter(type)}</h5>
                        <div id="${type}-list" class="modules">
                            ${this._getList(type)}
                        </div>
                    `
            )}
        `;
    }

    _injectModal() {
        render(
            insertBaseModalHTML(this._modalId, this._baseName, this._getModalBody.bind(this)),
            document.getElementById("modal-section")
        );

        this._cannonTypes.forEach(type => {
            const table = document.getElementById(`table-${type}-list`);
            // eslint-disable-next-line no-unused-vars
            const sortTable = new Tablesort(table);
        });
    }

    _initModal() {
        initTablesort();
        this._injectModal();
    }

    _cannonListSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }

        // Show modal
        $(`#${this._modalId}`).modal("show");
    }
}
