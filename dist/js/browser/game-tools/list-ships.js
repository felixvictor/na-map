/*!
 * This file is part of na-map.
 *
 * @file      ship list.
 * @module    ship-list
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { select as d3Select } from "d3-selection";
import { registerEvent } from "../analytics";
import { putImportError } from "../../common/common";
import { initTablesort, insertBaseModal } from "../../common/common-browser";
import { formatFloatFixed, formatInt } from "../../common/common-format";
import { sortBy } from "../../common/common-node";
export default class ShipList {
    constructor() {
        this._shipData = {};
        this._baseName = "List ships";
        this._baseId = "ship-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._setupListener();
    }
    async _loadAndSetupData() {
        try {
            this._shipData = (await import("Lib/gen-generic/ships.json"))
                .default;
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
            this._shipListSelected();
        });
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName, size: "lg" });
        d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("id", `${this._baseId}`)
            .attr("class", "container-fluid");
    }
    _initModal() {
        initTablesort();
        this._injectModal();
        this._injectList();
    }
    _shipListSelected() {
        if (!document.querySelector(`#${this._modalId}`)) {
            this._initModal();
        }
        $(`#${this._modalId}`).modal("show");
    }
    _injectList() {
        d3Select(`#${this._baseId} div`).remove();
        d3Select(`#${this._baseId}`).append("div").classed("row ingredients", true);
        d3Select(`#${this._baseId} div`).html(this._getList());
    }
    _getList() {
        let text = "";
        text += `<table id="table-${this._baseId}" class="table table-sm small tablesort"><thead>`;
        text += "<tr>";
        text += '<th scope="col" class="border-bottom-0"></th>';
        text += '<th scope="col" class="border-bottom-0"></th>';
        text += '<th scope="col" class="text-right border-bottom-0"></th>';
        text += '<th scope="col" class="text-right border-bottom-0"></th>';
        text += '<th scope="col" class="text-right border-bottom-0"></th>';
        text += '<th scope="col" class="text-center" colspan="2">Speed</th>';
        text += '<th scope="col" class="text-right border-bottom-0"></th>';
        text += '<th scope="col" class="text-center" colspan="2">Chasers</th>';
        text += '<th scope="col" class="text-right border-bottom-0"></th>';
        text += "</tr>";
        text += '<tr data-sort-method="thead">';
        text += '<th scope="col" class="text-right border-top-0">Class</th>';
        text += '<th scope="col" class="border-top-0">Name</th>';
        text += '<th scope="col" class="text-right border-top-0">Guns</th>';
        text += '<th scope="col" class="text-right border-top-0">Battle rating</th>';
        text += '<th scope="col" class="text-right border-top-0">Crew</th>';
        text += '<th scope="col" class="text-right">Maximum</th>';
        text += '<th scope="col" class="text-right">Turn</th>';
        text += '<th scope="col" class="text-right border-top-0">Broadside</th>';
        text += '<th scope="col" class="text-right border-top-0">Bow</th>';
        text += '<th scope="col" class="text-right">Stern</th>';
        text += '<th scope="col" class="text-right border-top-0">Sides</th>';
        text += "</tr></thead><tbody>";
        const ships = this._shipData
            .filter((ship) => !ship.name.startsWith("Rookie "))
            .sort(sortBy(["class", "-battleRating", "name"]));
        for (const ship of ships) {
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
            text += `<td class="text-right" data-sort="${ship.sides.armour}">${formatInt(ship.sides.armour)} (${ship.sides.thickness})</td>`;
            text += "</tr>";
        }
        text += "</tbody></table>";
        return text;
    }
}
//# sourceMappingURL=list-ships.js.map