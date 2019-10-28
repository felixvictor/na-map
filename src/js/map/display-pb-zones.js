/**
 * This file is part of na-map.
 *
 * @file      Display port battle zones.
 * @module    map/display-pb-zones
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";

import Cookie from "../util/cookie";
import RadioButton from "../util/radio-button";
import { putImportError } from "../util";

export default class DisplayPbZones {
    constructor(ports) {
        this._ports = ports;

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

        this._isDataLoaded = false;

        this._setupSvg();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .insert("g", "#ports")
            .attr("class", "pb");
        /*
        this._gJoinCirclesInner = this._g.append("path").attr("class", "join-circle");
        this._gJoinCirclesOuter = this._g.append("path").attr("class", "join-circle");
        this._gPBCircles = this._g.append("path").attr("class", "pb-circle");
        this._gTowers = this._g.append("path").attr("class", "tower");
        this._gForts = this._g.append("path").attr("class", "fort");

         */
    }

    async _loadData() {
        try {
            this._pbZonesDefault = await import(/* webpackChunkName: "data-pb" */ "../../gen/pb.json").then(
                data => data.default
            );
        } catch (error) {
            putImportError(error);
        }
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
        const drawCircle = (x, y, r) => `M${x},${y} m${-r},0 a${r},${r} 0,1,0 ${r * 2},0 a${r},${r} 0,1,0 ${-r * 2},0z`;
        const drawRect = (x, y, r) => `M${x - r / 2},${y - r / 2}h${r}v${r}h${-r}z`;

        this._g
            .selectAll("g")
            .data(this._pbZonesFiltered, d => d.id)
            .join(enter => {
                const g = enter.append("g");

                // Join circles
                g.append("path")
                    .attr("class", "join-circle")
                    .attr("d", d =>
                        drawCircle(d.joinCircles[0], d.joinCircles[1], 28).concat(
                            drawCircle(d.joinCircles[0], d.joinCircles[1], 14)
                        )
                    );

                // Forts
                g.append("path")
                    .attr("class", "fort")
                    .attr("d", d => d.forts.map(fort => drawRect(fort[0], fort[1], 3)).join(""));
                g.append("text")
                    .attr("class", "pb-text pb-fort-text")
                    .attr("x", d => d.forts.map(fort => fort[0]))
                    .attr("y", d => d.forts.map(fort => fort[1]))
                    .text(d => d.forts.map((fort, i) => `${i + 1}`).join(""));

                // Towers
                g.append("path")
                    .attr("class", "tower")
                    .attr("d", d => d.towers.map(tower => drawCircle(tower[0], tower[1], 1.5)).join(""));
                g.append("text")
                    .attr("class", "pb-text pb-tower-text")
                    .attr("x", d => d.towers.map(tower => tower[0]))
                    .attr("y", d => d.towers.map(tower => tower[1]))
                    .text(d => d.towers.map((tower, i) => `${i + 1}`).join(""));

                // Port battle circles
                g.append("path")
                    .attr("class", "pb-circle")
                    .attr("d", d => d.pbCircles.map(pbCircle => drawCircle(pbCircle[0], pbCircle[1], 3.5)).join(""));
                g.append("text")
                    .attr("class", "pb-text pb-circle-text")
                    .attr("x", d => d.pbCircles.map(tower => tower[0]))
                    .attr("y", d => d.pbCircles.map(tower => tower[1]))
                    .text(d => d.pbCircles.map((tower, i) => String.fromCharCode(65 + i)).join(""));

                // Raid points
                g.append("path")
                    .attr("class", "raid-point")
                    .attr("d", d =>
                        d.raidPoints.map(raidPoint => drawCircle(raidPoint[0], raidPoint[1], 1.5)).join("")
                    );
                g.append("text")
                    .attr("class", "pb-text pb-raid-point-text")
                    .attr("x", d => d.raidPoints.map(raidPoint => raidPoint[0]))
                    .attr("y", d => d.raidPoints.map(raidPoint => raidPoint[1]))
                    .text("RR");
            });
    }

    _isPortIn(d) {
        return this._showPB === "all" || (this._showPB === "single" && d.id === this._ports.currentPort.id);
    }

    _setData() {
        const filterData = () => {
            this._filterVisible();
            this._pbZonesFiltered = this._pbZonesFiltered.filter(d => this._isPortIn(d));
        };

        if (this._ports.zoomLevel === "pbZone" && this._showPB !== "noShow") {
            if (this._isDataLoaded) {
                filterData();
            } else {
                this._loadData().then(() => {
                    this._isDataLoaded = true;
                    filterData();
                });
            }
        } else {
            this._pbZonesFiltered = {};
        }
    }

    _filterVisible() {
        this._pbZonesFiltered = this._pbZonesDefault.filter(
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
