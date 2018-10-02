/**
 * This file is part of na-map.
 *
 * @file      Make a journey.
 * @module    make-journey
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global d3 : false
 */

import "round-slider/src/roundslider";

import {
    compassDirections,
    degreesToCompass,
    formatInt,
    formatFloat,
    getOrdinal,
    isEmpty,
    capitalizeFirstLetter
} from "./util";
import { registerEvent } from "./analytics";
import ShipCompare from "./ship-compare";
import WoodCompare from "./wood-compare";

/**
 * Journey
 */
export default class Journey {
    /**
     * @param {Object} shipData - Ship data
     * @param {Object} woodData - Wood data
     */
    constructor(shipData, woodData) {
        this._shipData = shipData;
        this._woodData = woodData;
        this._baseId = "ship-journey";
        this._woodId = "wood-journey";
        this._setupListener();
    }

    /**
     * Setup menu item listener
     * @returns {void}
     */
    _setupListener() {
        $("#journeyNavbar").on("shown.bs.dropdown", event => {
            registerEvent("Menu", "Journey");
            event.stopPropagation();
            this._journeySelected();
        });
    }

    _setupWindInput() {
        // workaround from https://github.com/soundar24/roundSlider/issues/71
        // eslint-disable-next-line func-names,no-underscore-dangle
        const { _getTooltipPos } = $.fn.roundSlider.prototype;
        // eslint-disable-next-line func-names,no-underscore-dangle
        $.fn.roundSlider.prototype._getTooltipPos = function() {
            if (!this.tooltip.is(":visible")) {
                $("body").append(this.tooltip);
            }
            const pos = _getTooltipPos.call(this);
            this.container.append(this.tooltip);
            return pos;
        };

        window.tooltip = args => degreesToCompass(args.value);

        $("#journey-wind-direction").roundSlider({
            sliderType: "default",
            handleSize: "+1",
            startAngle: 90,
            width: 20,
            radius: 110,
            min: 0,
            max: 359,
            step: 360 / compassDirections.length,
            editableTooltip: false,
            tooltipFormat: "tooltip",
            create() {
                this.control.css("display", "block");
            },
            change() {
                this._currentWind = $("#journey-wind-direction").roundSlider("getValue");
            }
        });
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _journeySelected() {
        this._injectInputs();
        this._setupWindInput();

        this._shipCompare = new ShipCompare(this._shipData, this._woodData, this._baseId);
        this._woodCompare = new WoodCompare(this._woodData, this._woodId);

        console.log(this._shipCompare);
        console.log(this._shipCompare.ships);
        console.log(this._shipCompare.ships.Base);
        console.log(this._shipCompare.ships.Base._shipData);
    }

    _injectInputs() {
        if (d3.select("#journeyMenu form").empty()) {
            const form = d3
                .select("#journeyMenu")
                .append("form")
                .attr("id", "journey-form")
                .attr("class", "p-2");
            const slider = form.append("div").attr("class", "form-group");
            slider
                .append("p")
                .attr("class", "form-text")
                .text("1. Set current in-game wind");
            slider
                .append("div")
                .attr("id", "journey-wind-direction")
                .attr("class", "rslider");

            const select = form.append("div").attr("class", "form-group");
            select
                .append("p")
                .attr("class", "form-text")
                .text("2. Set ship");

            const div1 = select.append("div").attr("class", "dropdown-item");
            const shipId = `${this._baseId}-Base-select`;
            div1.append("label").attr("for", shipId);
            div1.append("select")
                .attr("name", shipId)
                .attr("id", shipId);

            ["frame", "trim"].forEach(type => {
                const div2 = select.append("div").attr("class", "dropdown-item");
                const woodId = `${this._woodId}-${type}-Base-select`;
                div2.append("label").attr("for", woodId);
                div2.append("select")
                    .attr("name", woodId)
                    .attr("id", woodId);
            });
        }
    }
}
