/**
 * This file is part of na-map.
 *
 * @file      Show wind rose continuously.
 * @module    map-tools/wind-rose
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";
import { line as d3Line } from "d3-shape";
import moment from "moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";
import "round-slider/src/roundslider.css";
import "../../scss/roundslider.scss";

import Cookies from "js-cookie";
import { compassDirections, degreesToRadians, displayCompass, getUserWind, printSmallCompassRose } from "../util";
import { registerEvent } from "../analytics";
import { degreesPerSecond, insertBaseModal } from "../common";

export default class WindRose {
    constructor() {
        this._line = d3Line();
        this._windPath = null;

        this._windArrowWidth = 4;

        this._intervalSeconds = 40;

        this._baseName = "In-game wind";
        this._baseId = "ingame-wind";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._formId = `form-${this._baseId}`;
        this._sliderId = `slider-${this._baseId}`;

        /**
         * Wind degrees cookie name
         * @type {string}
         * @private
         */
        this._cookieDegrees = `na-map--${this._baseId}-degrees`;

        /**
         * Wind degrees time cookie name
         * @type {string}
         * @private
         */
        this._cookieTime = `na-map--${this._baseId}-time`;

        this._cookieExpire = this._getExpire();

        /**
         * Get current wind from cookie or use default value
         * @type {number}
         * @private
         */
        this._currentWindDegrees = this._getCurrentWindCookie();

        this._setupListener();
        if (this._currentWindDegrees) {
            this._initShowCurrentWind();
        }
    }

    _getHeight() {
        const div = document.querySelector("#port-summary div.d-flex div.block");
        const { height } = div.getBoundingClientRect();
        const paddingTop = parseFloat(window.getComputedStyle(div).getPropertyValue("padding-top"));
        const paddingBottom = parseFloat(window.getComputedStyle(div).getPropertyValue("padding-bottom"));

        return height - paddingTop - paddingBottom;
    }

    _getCurrentWindCookie() {
        // Use default value if cookie is not stored
        const wind = Cookies.get(this._cookieDegrees) || null;
        if (wind) {
            const time = Cookies.get(this._cookieTime);
            // Difference in seconds since wind has been stored
            const diffSeconds = Math.round((Date.now() - time) / 1000);
            this._currentWindDegrees = 360 + (Math.floor(wind - degreesPerSecond * diffSeconds) % 360);
        }
        return wind;
    }

    _getExpire() {
        const now = moment.utc();
        let end = moment()
            .utc()
            .hour(10)
            .minute(0)
            .second(0);

        if (now.hour() > end.hour()) {
            end = end.add(1, "day");
        }

        return end.local().toDate();
    }

    /**
     * Store current wind in cookie
     * @return {void}
     * @private
     */
    _storeCurrentWindCookie() {
        Cookies.set(this._cookieDegrees, this._currentWindDegrees, {
            expires: this._cookieExpire
        });
        Cookies.set(this._cookieTime, Date.now());
    }

    _setupSvg() {
        this._div = d3Select("#port-summary div.d-flex")
            .insert("div", ":first-child")
            .attr("id", this._baseId)
            .classed("block", true);
        this._svg = this._div.append("svg").classed("coord small", true);
    }

    _navbarClick(event) {
        registerEvent("Menu", this._baseName);
        event.stopPropagation();
        this._windRoseSelected();
    }

    _setupListener() {
        document.getElementById(`${this._buttonId}`).addEventListener("click", event => this._navbarClick(event));
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

        window.tooltip = args => `${displayCompass(args.value)}<br>${args.value}°`;

        $(`#${this._sliderId}`).roundSlider({
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
                this._currentWind = $(`#${this._sliderId}`).roundSlider("getValue");
            }
        });
    }

    _injectModal() {
        moment.locale("en-gb");

        insertBaseModal(this._modalId, this._baseName, "sm");

        const body = d3Select(`#${this._modalId} .modal-body`);
        const form = body.append("form").attr("id", this._formId);

        const formGroupA = form.append("div").attr("class", "form-group");
        const slider = formGroupA.append("div").classed("alert alert-primary", true);
        slider
            .append("label")
            .attr("for", this._sliderId)
            .text("Current in-game wind");
        slider
            .append("div")
            .attr("id", this._sliderId)
            .attr("class", "rslider");
    }

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._injectModal();
        this._setupWindInput();
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _windRoseSelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`)
            .modal("show")
            .on("hidden.bs.modal", () => {
                this._useUserInput();
            });
    }

    _windChange() {
        this._currentWindDegrees = 360 + ((this._currentWindDegrees - degreesPerSecond * this._intervalSeconds) % 360);

        this._updateWindDirection();
    }

    _useUserInput() {
        this._currentWindDegrees = getUserWind(this._sliderId);

        if (!this._windPath) {
            this._initShowCurrentWind();
        } else {
            this._updateWindDirection();
        }
    }

    _initShowCurrentWind() {
        this._setupSvg();
        this._initPrintCompassRose();
        this._updateWindDirection();
        this._intervalId = window.setInterval(() => {
            this._windChange();
        }, this._intervalSeconds * 1000);
    }

    _updateWindDirection() {
        const radians = degreesToRadians(this._currentWindDegrees);
        const dx = this._length * Math.cos(radians);
        const dy = this._length * Math.sin(radians);
        const lineData = [
            [Math.round(this._xCompass + dx), Math.round(this._yCompass + dy)],
            [Math.round(this._xCompass - dx), Math.round(this._yCompass - dy)]
        ];

        this._windPath.datum(lineData).attr("d", this._line);
        this._storeCurrentWindCookie();
    }

    _initPrintCompassRose() {
        this._height = this._getHeight();
        this._yCompass = this._height / 2;
        this._width = this._height;
        this._xCompass = this._width / 2;
        this._compassRadius = Math.min(this._height, this._width) / 2;
        this._length = this._compassRadius * 0.6;

        this._svg.attr("height", this._height).attr("width", this._width);

        // Compass rose
        const compassElem = this._svg
            .append("svg")
            .classed("compass", true)
            .attr("x", this._xCompass)
            .attr("y", this._yCompass);
        printSmallCompassRose({ elem: compassElem, radius: this._compassRadius });

        this._windPath = this._svg
            .append("path")
            .classed("wind", true)
            .attr("marker-end", "url(#wind-arrow)");
    }

    clearMap() {
        window.clearInterval(this._intervalId);
        if (this._div) {
            this._div.remove();
        }
        this._windPath = null;
        Cookies.remove(this._cookieDegrees);
    }
}
