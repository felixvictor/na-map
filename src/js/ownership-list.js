/**
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    ownership-list
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { scaleOrdinal as d3ScaleOrdinal } from "d3-scale";
import { schemePaired as d3SchemePaired } from "d3-scale-chromatic";
import { select as d3Select } from "d3-selection";
import TimelinesChart from "timelines-chart";

import { insertBaseModal } from "./common";
import { registerEvent } from "./analytics";

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

/**
 *
 */
export default class OwnershipList {
    constructor(ownershipData) {
        this._ownershipData = ownershipData;

        this._baseName = "Port ownership";
        this._baseId = "ownership-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupListener();
    }

    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._ownershipListSelected();
        });
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        this._div = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("id", `${this._baseId}`)
            .attr("class", "container-fluid");
    }

    _initModal() {
        this._injectModal();
        this._injectChart();
    }

    _ownershipListSelected() {
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
    _injectChart() {
        const colourScale = d3ScaleOrdinal(d3SchemePaired),
            chart = TimelinesChart()
                .data(this._ownershipData)
                .zQualitative(true)
                .zColorScale(colourScale)
                .width(1000)
                (this._div.node());
        console.log(chart.zQualitative(), chart.zColorScale().domain(), chart.zColorScale().range());
    }
}
