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

import { layoutTextLabel, layoutGreedy, layoutLabel, layoutRemoveOverlaps } from "d3fc-label-layout";
import moment from "moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";

import { compassDirections, degreesToCompass, rotationAngleInDegrees, formatF11 } from "./util";
import { registerEvent } from "./analytics";
import ShipCompare from "./ship-compare";
import WoodCompare from "./wood-compare";
import { convertInvCoordX, convertInvCoordY, getDistance, initMultiDropdownNavbar, speedFactor } from "./common";

/**
 * Journey
 */
export default class Journey {
    /**
     * @param {Object} shipData - Ship data
     * @param {Object} woodData - Wood data
     */
    constructor(shipData, woodData, fontSize) {
        this._shipData = shipData;
        this._woodData = woodData;
        this._fontSize = fontSize;

        this._bFirstCoord = true;
        this._compassSize = 100;
        this._line = d3
            .line()
            .x(d => d.x)
            .y(d => d.y);
        this._lineData = [];

        this._labelPadding = 20;
        this._courseLabels = [];

        this._minutesForFullCircle = 48;
        this._fullCircle = 360;
        this._degreesPerMinute = this._fullCircle / this._minutesForFullCircle;
        this._degreesSegment = 15;
        this._minOWSpeed = 2;
        this._owSpeedFactor = 2;

        this._totalDistance = 0;
        this._totalMinutes = 0;
        this._currentWindDegrees = null;

        this._speedScale = d3.scaleLinear().domain(d3.range(0, this._fullCircle, this._degreesSegment));

        this._setupSvg();

        this._shipId = "ship-journey";
        this._woodId = "wood-journey";
        this._selected = false;
        this._setupListener();
    }

    _navbarClick(event) {
        registerEvent("Menu", "Journey");
        event.preventDefault();
        // event.stopPropagation();
        this._journeySelected();
    }

    /**
     * Setup menu item listener
     * @returns {void}
     */
    _setupListener() {
        document
            .getElementById("journeyNavbar")
            .addEventListener("click", event => this._navbarClick(event), { once: true });
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
        if (!this._selected) {
            this._selected = true;

            this._injectInputs();
            this._setupWindInput();

            this._shipCompare = new ShipCompare(this._shipData, this._woodData, this._shipId);
            this._woodCompare = new WoodCompare(this._woodData, this._woodId);

            initMultiDropdownNavbar("journeyNavbar");
        }
    }

    _injectInputs() {
        if (d3.select("#journeyMenu form").empty()) {
            const div = d3
                .select("#journeyMenu")
                .append("div")
                .attr("class", "p-2");
            const slider = div
                .append("form")
                .append("div")
                .attr("class", "form-group");
            slider
                .append("p")
                .attr("class", "form-text")
                .text("1. Set current in-game wind");
            slider
                .append("div")
                .attr("id", "journey-wind-direction")
                .attr("class", "rslider");

            div.append("p")
                .attr("class", "form-text")
                .text("2. Set ship");
            const shipId = `${this._shipId}-Base-select`;
            div.append("label")
                .append("select")
                .attr("name", shipId)
                .attr("id", shipId);
            ["frame", "trim"].forEach(type => {
                const woodId = `${this._woodId}-${type}-Base-select`;
                div.append("label")
                    .append("select")
                    .attr("name", woodId)
                    .attr("id", woodId);
            });
        }
    }

    /* private */
    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .append("g")
            .classed("coord", true);

        d3.select("#na-svg defs")
            .append("marker")
            .attr("id", "course-arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 5)
            .attr("markerHeight", 5)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("class", "course-head");
    }

    _printCompass() {
        const pos = this._lineData.length - 1,
            { x } = this._lineData[pos],
            { y } = this._lineData[pos];
        this._g
            .append("image")
            .classed("compass", true)
            .attr("x", x)
            .attr("y", y)
            .attr("transform", `translate(${-this._compassSize / 2},${-this._compassSize / 2})`)
            .attr("height", this._compassSize)
            .attr("width", this._compassSize)
            .attr("xlink:href", "icons/compass.svg");
        this.gCompass = this._g.append("path");
    }

    _getSpeedAtDegrees(degrees) {
        return Math.max(this._speedScale(degrees), this._minOWSpeed);
    }

    _calculateDistanceForSection(degreesCourse, degreesCurrentWind) {
        const degreesForSpeedCalc = (this._fullCircle - degreesCourse + degreesCurrentWind) % this._fullCircle,
            speedCurrentSection = this._getSpeedAtDegrees(degreesForSpeedCalc) * this._owSpeedFactor,
            distanceCurrentSection = speedCurrentSection * speedFactor;
        console.log(
            { degreesCourse },
            { degreesCurrentWind },
            { degreesForSpeedCalc },
            { speedCurrentSection },
            { distanceCurrentSection }
        );
        return distanceCurrentSection;
    }

    _getStartWind() {
        const currentUserWind = $("#journey-wind-direction").roundSlider("getValue");
        let currentWindDegrees;
        // Current wind in degrees
        if (!$("#journey-wind-direction").length) {
            currentWindDegrees = 0;
        } else {
            currentWindDegrees = +currentUserWind;
        }
        return currentWindDegrees;
    }

    _setShipSpeed() {
        // Dummy ship speed of 19 knots
        let speedDegrees = Array.from(Array(24).fill(19 / 2));

        if (typeof this._shipCompare !== "undefined") {
            ({ speedDegrees } = this._shipCompare._singleShipData);
        }
        this._speedScale.range(speedDegrees);
        console.log(this._speedScale.range());
    }

    _calculateMinutesForCourse(courseDegrees, startWindDegrees, distanceTotal) {
        let distanceRemaining = distanceTotal,
            currentWindDegrees = startWindDegrees,
            totalMinutes = 0;

        this._setShipSpeed();
        while (distanceRemaining > 0) {
            const distanceCurrentSection = this._calculateDistanceForSection(courseDegrees, currentWindDegrees);
            if (distanceRemaining > distanceCurrentSection) {
                distanceRemaining -= distanceCurrentSection;
                totalMinutes += 1;
            } else {
                totalMinutes += distanceRemaining / distanceCurrentSection;
                distanceRemaining = 0;
            }
            currentWindDegrees = (this._fullCircle + currentWindDegrees - this._degreesPerMinute) % this._fullCircle;

            console.log({ distanceCurrentSection }, { totalMinutes });
        }
        this._currentWindDegrees = currentWindDegrees;

        return totalMinutes;
    }

    _getShipName() {
        let text = "";
        if (typeof this._shipCompare !== "undefined") {
            text += `${
                this._shipCompare._woodCompare._woodsSelected.Base.frame
            }/${this._shipCompare._woodCompare._woodsSelected.Base.trim.toLowerCase()} ${
                this._shipCompare._singleShipData.name
            }|`;
        }
        return text;
    }

    /**
     * Print labels
     * @private
     * @return {void}
     */
    _printLabels() {
        /** Correct Text Box
         *  - split text into lines
         *  - correct box width
         *  - enlarge circles
         *  - remove last circle
         * {@link https://stackoverflow.com/a/13275930}
         * @param {object} d - Element
         * @param {number} i - Index
         * @param {object} nodes - Nodes
         * @return {void}
         */
        const correctTextBox = (d, i, nodes) => {
            // Split text into lines
            const node = d3.select(nodes[i]),
                text = node.select("text"),
                lines = d.label.split("|"),
                lineHeight = this._fontSize * 1.3;

            text.text("").attr("dy", 0);
            lines.forEach((line, j) => {
                const tspan = text.append("tspan").text(line);
                if (j > 0) {
                    tspan.attr("x", 0).attr("dy", lineHeight);
                }
            });

            // Correct box width
            const bbText = text.node().getBBox(),
                rect = node.select("rect");
            rect.attr("width", bbText.width + this._labelPadding * 2).attr(
                "height",
                bbText.height + this._labelPadding
            );

            // Enlarge circles
            node.select("circle").attr("r", 10);

            // Remove last circle
            if (i === nodes.length - 1) {
                node.select("circle").remove();
            }
        };

        // Component used to render each label (take only single longest line)
        const textLabel = layoutTextLabel()
            .padding(this._labelPadding)
            .value(d => {
                const lines = d.label.split("|"),
                    // Find longest line
                    index = lines.reduce((p, c, i, a) => (a[p].length > c.length ? p : i), 0);
                return lines[index];
            });

        // Strategy that combines simulated annealing with removal of overlapping labels
        const strategy = layoutRemoveOverlaps(layoutGreedy());

        // Create the layout that positions the labels
        const labels = layoutLabel(strategy)
            .size((d, i, nodes) => {
                // measure the label and add the required padding
                const numberLines = d.label.split("|").length,
                    bbText = nodes[i].getElementsByTagName("text")[0].getBBox();
                return [bbText.width + this._labelPadding * 2, bbText.height * numberLines + this._labelPadding * 2];
            })
            .position(d => d.position)
            .component(textLabel);

        // Render
        this._g.datum(this._courseLabels).call(labels);
        // Correct text boxes
        this._g.selectAll("g.coord g.label").each(correctTextBox);
    }

    _printLines() {
        this.gCompass
            .datum(this._lineData)
            .attr("marker-end", "url(#course-arrow)")
            .attr("d", this._line);
    }

    _getTextDirection(courseCompass, courseDegrees, pt1) {
        return `${this._getShipName()}${courseCompass} (${Math.round(courseDegrees)}°) \u2606 F11: ${formatF11(
            convertInvCoordX(pt1.x, pt1.y)
        )}\u202f/\u202f${formatF11(convertInvCoordY(pt1.x, pt1.y))}`;
    }

    _getTextDistance(distanceK, minutes) {
        const duration = moment.duration(minutes, "minutes").humanize(true);
        let textDistance = `${Math.round(distanceK)}k ${duration}`;

        if (this._lineData.length > 2) {
            const totalDuration = moment.duration(this._totalMinutes, "minutes").humanize(true);
            textDistance += ` \u2606 total ${Math.round(this._totalDistance)}k ${totalDuration}`;
        }
        return textDistance;
    }

    _setSegmentLabel() {
        const pt1 = this._lineData[this._lineData.length - 1],
            pt2 = this._lineData[this._lineData.length - 2],
            courseDegrees = rotationAngleInDegrees(pt1, pt2),
            distanceK = getDistance(pt1, pt2),
            courseCompass = degreesToCompass(courseDegrees),
            startWindDegrees = this._currentWindDegrees || this._getStartWind();

        const minutes = this._calculateMinutesForCourse(courseDegrees, startWindDegrees, distanceK * 1000);
        console.log("*** start", { startWindDegrees }, { distanceK }, { courseCompass });
        this._totalDistance += distanceK;
        this._totalMinutes += minutes;
        const textDirection = this._getTextDirection(courseCompass, courseDegrees, pt1),
            textDistance = this._getTextDistance(distanceK, minutes);

        this._courseLabels.push({ label: `${textDirection}|${textDistance}`, position: [pt1.x, pt1.y] });
    }

    _printSegment() {
        this._printLines();
        this._setSegmentLabel();
        this._printLabels();
    }

    /* public */
    plotCourse(x, y) {
        if (this._bFirstCoord) {
            this.clearMap();
        }
        this._lineData.push({ x, y });
        if (this._bFirstCoord) {
            this._printCompass();
            this._bFirstCoord = !this._bFirstCoord;
        } else {
            this._printSegment();
        }
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._bFirstCoord = true;
        this._currentWindDegrees = null;
        this._totalDistance = 0;
        this._totalMinutes = 0;
        if (typeof this._lineData !== "undefined") {
            this._lineData.splice(0, this._lineData.length);
        }

        this._g.selectAll("*").remove();
    }
}
