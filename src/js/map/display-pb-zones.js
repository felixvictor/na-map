/**
 * This file is part of na-map.
 *
 * @file      Display port battle zones.
 * @module    map/display-pb-zones
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { geoPath as d3GeoPath } from "d3-geo";
import { select as d3Select } from "d3-selection";

import Cookie from "../util/cookie";
import RadioButton from "../util/radio-button";

export default class DisplayPbZones {
    constructor(pbCircles, forts, towers, joinCircles, ports) {
        this._ports = ports;

        this._pbCircleDataDefault = pbCircles;
        this._pbCircleData = pbCircles;

        this._fortDataDefault = forts;
        this._fortData = forts;

        this._towerDataDefault = towers;
        this._towerData = towers;

        this._joinCircleDataDefault = joinCircles;
        this._joinCircleData = joinCircles;

        this._showId = "show-pb";

        /**
         * Possible values for show port battle zones radio buttons (first is default value)
         * @type {string[]}
         * @private
         */
        this._showValues = ["all", "single", "off"];

        /**
         * Show port battle zones cookie
         * @type {Cookie}
         */
        this._showCookie = new Cookie({ id: this._showId, values: this._showValues });

        /**
         * Show port battle zones radio buttons
         * @type {RadioButton}
         */
        this._showRadios = new RadioButton(this._showId, this._showValues);

        /**
         * Get showLayer setting from cookie or use default value
         * @type {string}
         * @private
         */
        this._showPB = this._getShowPBSetting();

        this._setupSvg();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .insert("g", "g.ports")
            .classed("pb", true);
        this._gJoinCirclesInner = this._g.append("path").classed("join-circle", true);
        this._gJoinCirclesOuter = this._g.append("path").classed("join-circle", true);
        this._gPBCircles = this._g.append("path").classed("pb-circle", true);
        this._gTowers = this._g.append("path").classed("tower", true);
        this._gForts = this._g.append("path").classed("fort", true);
    }

    _setupListener() {
        $("#show-pb").change(() => this._showPBZonesSelected());
    }

    /**
     * Get show setting from cookie or use default value
     * @returns {string} - Show setting
     * @private
     */
    _getShowPBSetting() {
        const r = this._showCookie.get();

        this._showRadios.set(r);

        return r;
    }

    _refreshPBZones() {
        this.refresh();
        this._ports.updateTexts();
    }

    _showPBZonesSelected() {
        this._showPB = this._showRadios.get();

        this._showCookie.set(this._showPB);
        this._refreshPBZones();
    }

    _update() {
        this._gPBCircles.datum(this._pbCircleData).attr("d", d3GeoPath().pointRadius(3.5));
        this._gTowers.datum(this._towerData).attr("d", d3GeoPath().pointRadius(1.5));
        this._gForts.datum(this._fortData).attr("d", d3GeoPath().pointRadius(2));
        this._gJoinCirclesInner.datum(this._joinCircleData).attr("d", d3GeoPath().pointRadius(14));
        this._gJoinCirclesOuter.datum(this._joinCircleData).attr("d", d3GeoPath().pointRadius(28));
    }

    _isPortIn(d) {
        return this._showPB === "all" || (this._showPB === "single" && d.id === this._ports.currentPort.id);
    }

    _setData() {
        if (this._ports.zoomLevel === "pbZone" && this._showPB !== "noShow") {
            this._filterVisible();
            this._pbCircleData = {
                type: "FeatureCollection",
                features: this._pbCircleDataFiltered.filter(d => this._isPortIn(d))
            };
            this._fortData = {
                type: "FeatureCollection",
                features: this._fortDataFiltered.filter(d => this._isPortIn(d))
            };
            this._towerData = {
                type: "FeatureCollection",
                features: this._towerDataFiltered.filter(d => this._isPortIn(d))
            };
            this._joinCircleData = {
                type: "FeatureCollection",
                features: this._joinCircleDataFiltered.filter(d => this._isPortIn(d))
            };
        } else {
            this._pbCircleData = {};
            this._fortData = {};
            this._towerData = {};
            this._joinCircleData = {};
        }
    }

    _filterVisible() {
        this._pbCircleDataFiltered = this._pbCircleDataDefault.filter(
            port =>
                port.position[0] >= this._lowerBound[0] &&
                port.position[0] <= this._upperBound[0] &&
                port.position[1] >= this._lowerBound[1] &&
                port.position[1] <= this._upperBound[1]
        );
        this._fortDataFiltered = this._fortDataDefault.filter(
            port =>
                port.position[0] >= this._lowerBound[0] &&
                port.position[0] <= this._upperBound[0] &&
                port.position[1] >= this._lowerBound[1] &&
                port.position[1] <= this._upperBound[1]
        );
        this._towerDataFiltered = this._towerDataDefault.filter(
            port =>
                port.position[0] >= this._lowerBound[0] &&
                port.position[0] <= this._upperBound[0] &&
                port.position[1] >= this._lowerBound[1] &&
                port.position[1] <= this._upperBound[1]
        );
        this._joinCircleDataFiltered = this._joinCircleDataDefault.filter(
            port =>
                port.position[0] >= this._lowerBound[0] &&
                port.position[0] <= this._upperBound[0] &&
                port.position[1] >= this._lowerBound[1] &&
                port.position[1] <= this._upperBound[1]
        );
    }

    /**
     * Set bounds of current viewport
     * @param {Bound} lowerBound - Top left coordinates of current viewport
     * @param {Bound} upperBound - Bottom right coordinates of current viewport
     * @return {void}
     */
    setBounds(lowerBound, upperBound) {
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }

    refresh() {
        this._setData();
        this._update();
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }
}
