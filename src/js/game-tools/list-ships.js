/**
 * This file is part of na-map.
 *
 * @file      ship list.
 * @module    ship-list
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { select as d3Select } from "d3-selection";
import { default as Tablesort } from "tablesort";

import { registerEvent } from "../analytics";
import { insertBaseModal } from "../common";
import { formatFloatFixed, putImportError, sortBy } from "../util";

/**
 *
 */
export default class ShipList {
    constructor() {
        this._baseName = "List ships";
        this._baseId = "ship-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._setupListener();
    }

    async _loadAndSetupData() {
        try {
            this._shipData = await import(/* webpackChunkName: "data-ships" */ "../../gen/ships.json").then(
                data => data.default
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
            this._shipListSelected();
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "lg");

        d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("id", `${this._baseId}`)
            .attr("class", "container-fluid");
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

        this._injectList();
    }

    _shipListSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }

        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    /**
     * Show ships
     * @return {void}
     * @private
     */
    _injectList() {
        d3Select(`#${this._baseId} div`).remove();

        // Add new recipe list
        d3Select(`#${this._baseId}`)
            .append("div")
            .classed("row ingredients", true);
        d3Select(`#${this._baseId} div`).html(this._getList());
        const table = document.getElementById(`table-${this._baseId}`);
        // eslint-disable-next-line no-unused-vars
        const sortTable = new Tablesort(table);
    }

    _getList() {
        let text = "";

        text += `<table id="table-${this._baseId}" class="table table-sm small tablesort"><thead>`;
        text += "<tr>";
        text += '<th scope="col"></th>';
        text += '<th scope="col"></th>';
        text += '<th scope="col"></th>';
        text += '<th scope="col"></th>';
        text += '<th scope="col"></th>';
        text += '<th scope="col" colspan="2">Speed</th>';
        text += '<th scope="col"></th>';
        text += '<th scope="col" colspan="2">Chasers</th>';
        text += '<th scope="col"></th>';
        text += "</tr>";

        text += "<tr>";
        text += "<th>Class</th>";
        text += '<th scope="col">Name</th>';
        text += '<th scope="col">Guns</th>';
        text += '<th scope="col">Battle<br>rating</th>';
        text += '<th scope="col">Crew</th>';
        text += '<th scope="col">Maximum</th>';
        text += '<th scope="col">Turn</th>';
        text += '<th scope="col">Broadside</th>';
        text += '<th scope="col">Bow</th>';
        text += '<th scope="col">Stern</th>';
        text += '<th scope="col">Sides</th>';
        text += "</tr></thead><tbody>";

        this._shipData
            .filter(ship => !ship.name.startsWith("Rookie "))
            .sort(sortBy(["class", "-battleRating", "name"]))
            .forEach(ship => {
                text += "<tr>";
                text += `<td class="text-right">${ship.class}</td>`;
                text += `<td>${ship.name}</td>`;
                text += `<td class="text-right">${ship.guns}</td>`;
                text += `<td class="text-right">${ship.battleRating}</td>`;
                text += `<td class="text-right">${ship.crew.max}</td>`;
                text += `<td class="text-right">${formatFloatFixed(ship.ship.maxSpeed)}</td>`;
                text += `<td class="text-right">${formatFloatFixed(ship.rudder.turnSpeed)}</td>`;
                text += `<td class="text-right">${ship.broadside.cannons}</td>`;
                text += `<td class="text-right">${ship.gunsPerDeck[4] ? ship.gunsPerDeck[4] : ""}</td>`;
                text += `<td class="text-right">${ship.gunsPerDeck[5] ? ship.gunsPerDeck[5] : ""}</td>`;
                text += `<td class="text-right" data-sort="${ship.sides.armour}">${ship.sides.armour} (${ship.sides.thickness})</td>`;
                text += "</tr>";
            });
        text += "</tbody></table>";
        return text;
    }
}
