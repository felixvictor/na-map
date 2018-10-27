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
import { select as d3Select } from "d3-selection";
import { getContentRect } from "resize-observer-polyfill/src/utils/geometry";
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
    /**
     * @param {object} ownershipData - Port ownership data over time
     */
    constructor(ownershipData) {
        this._ownershipData = ownershipData;

        this._baseName = "Port ownership";
        this._baseId = "ownership-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupListener();
    }

    /**
     * Setup listener
     * @return {void}
     * @private
     */
    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._ownershipListSelected();
        });
    }

    /**
     * Inject modal
     * @return {void}
     * @private
     */
    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        this._div = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("id", `${this._baseId}`)
            .append("div");
    }

    /**
     * Init modal
     * @return {void}
     * @private
     */
    _initModal() {
        this._injectModal();
    }

    /**
     * Action when menu item is clicked
     * @return {void}
     * @private
     */
    _ownershipListSelected() {
        let emptyModal = false;

        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            emptyModal = true;
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`)
            .on("shown.bs.modal", () => {
                // Inject chart after modal is shown to calculate modal width
                if (emptyModal) {
                    this._injectChart();
                    emptyModal = false;
                }
            })
            .modal("show");
    }

    /**
     * Inject chart
     * @return {void}
     * @private
     */
    _injectChart() {
        // http://tools.medialab.sciences-po.fr/iwanthue/
        const colourScale = d3ScaleOrdinal().range([
                "#72823a",
                "#825fc8",
                "#78b642",
                "#cd47a3",
                "#50b187",
                "#d34253",
                "#628bcc",
                "#cb9f3d",
                "#cc88c9",
                "#ca5b2b",
                "#b55576",
                "#c27b58"
            ]),
            chart = TimelinesChart()
                .data(this._ownershipData)
                .timeFormat("%-d %B %Y")
                .zQualitative(true)
                .zColorScale(colourScale)
                .width(document.getElementById(this._baseId).offsetWidth)(this._div.node());
    }
}
