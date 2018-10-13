/**
 * This file is part of na-map.
 *
 * @file      Make a journey.
 * @module    make-journey
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { layoutTextLabel, layoutAnnealing, layoutLabel } from "d3fc-label-layout";
import { range as d3Range } from "d3-array";
import { drag as d3Drag } from "d3-drag";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { event as d3Event, select as d3Select } from "d3-selection";
import { line as d3Line } from "d3-shape";
import moment from "moment";
import "moment/locale/en-gb";
import "round-slider/src/roundslider";

import { compassDirections, degreesToCompass, rotationAngleInDegrees, formatF11 } from "./util";
import { registerEvent } from "./analytics";
import ShipCompare from "./ship-compare";
import WoodCompare from "./wood-compare";
import { convertInvCoordX, convertInvCoordY, getDistance, insertBaseModal, speedFactor } from "./common";

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

        this._compassSize = 100;
        this._line = d3Line()
            .x(d => d[0])
            .y(d => d[1]);
        this._drag = d3Drag()
            .on("start", (d, i, nodes) => {
                console.log("dragStart", { d }, { i }, { d3Event });
                console.log("dragStart", nodes[i], d3Select(nodes[i]));
                d3Select(nodes[i]).classed("drag-active", true);
            })
            .on("drag", (d, i) => {
                console.log("drag.on", { d }, { i }, { d3Event }, d3Select(this));
                d3Event.sourceEvent.stopPropagation();
                // var domain = yRange.domain();
                // d.y = Math.max(domain[0], Math.min(yRange.invert(d3.event.y), domain[1]))
                // d3Select(this).attr("cy", yRange(d.y));
                d.position = [d.position[0] + d3Event.dx, d.position[1] + d3Event.dy];
                this._printLines();
            })
            .on("end", (d, i, nodes) => {
                console.log("dragEnd", { d }, { i }, { d3Event }, d3Event.x, d3Event.y);
                d3Select(nodes[i]).classed("drag-active", false);
                this._journey.segment[i].position = [d.position[0] + d3Event.x, d.position[1] + d3Event.y];
                this._printJourney();
                // d.position=[,];
            });

        this._labelPadding = 20;

        this._minutesForFullCircle = 48;
        this._fullCircle = 360;
        this._degreesPerMinute = this._fullCircle / this._minutesForFullCircle;
        this._degreesSegment = 15;
        this._minOWSpeed = 2;
        this._owSpeedFactor = 2;

        this._speedScale = d3ScaleLinear().domain(d3Range(0, this._fullCircle, this._degreesSegment));

        this._setupSvg();

        this._baseName = "Make journey";
        this._baseId = "make-journey";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._shipId = "ship-journey";
        this._woodId = "wood-journey";
        this._initJourney();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .append("g")
            .classed("coord", true);

        d3Select("#na-svg defs")
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

    _initJourney() {
        this._journey = {
            startPosition: [null, null],
            startWindDegrees: 0,
            currentWindDegrees: 0,
            totalDistance: 0,
            totalMinutes: 0,
            segment: []
        };
    }

    _resetJourney() {
        this._journey.startWindDegrees = this._getStartWind();
        this._journey.currentWindDegrees = this._journey.startWindDegrees;
        this._journey.totalDistance = 0;
        this._journey.totalMinutes = 0;
    }

    _navbarClick(event) {
        registerEvent("Menu", "Journey");
        event.stopPropagation();
        this._journeySelected();
    }

    /**
     * Setup menu item listener
     * @returns {void}
     */
    _setupListener() {
        document.getElementById("journeyNavbar").addEventListener("click", event => this._navbarClick(event));
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

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "sm");

        const body = d3Select(`#${this._modalId} .modal-body`);
        const slider = body
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

        body.append("p")
            .attr("class", "form-text")
            .text("2. Set ship");
        const shipId = `${this._shipId}-Base-select`;
        const div = body.append("div").attr("class", "d-flex flex-column");
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

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._injectModal();
        this._setupWindInput();
        this._shipCompare = new ShipCompare(this._shipData, this._woodData, this._shipId);
        this._woodCompare = new WoodCompare(this._woodData, this._woodId);
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _journeySelected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`).modal("show");
    }

    _printCompass() {
        const x = this._journey.startPosition[0],
            y = this._journey.startPosition[1];
        this._g
            .append("image")
            .classed("compass", true)
            .attr("x", x)
            .attr("y", y)
            .attr("transform", `translate(${-this._compassSize / 2},${-this._compassSize / 2})`)
            .attr("height", this._compassSize)
            .attr("width", this._compassSize)
            .attr("xlink:href", "icons/compass.svg");
        this.gJourneyPath = this._g.append("path");
    }

    _getSpeedAtDegrees(degrees) {
        return Math.max(this._speedScale(degrees), this._minOWSpeed);
    }

    _calculateDistanceForSection(degreesCourse, degreesCurrentWind) {
        const degreesForSpeedCalc = (this._fullCircle - degreesCourse + degreesCurrentWind) % this._fullCircle,
            speedCurrentSection = this._getSpeedAtDegrees(degreesForSpeedCalc) * this._owSpeedFactor,
            distanceCurrentSection = speedCurrentSection * speedFactor;
        /*
        console.log(
            { degreesCourse },
            { degreesCurrentWind },
            { degreesForSpeedCalc },
            { speedCurrentSection },
            { distanceCurrentSection }
        );
        */
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

    /**
     * Segregate each segment into sections, calculate per section speed and distance (each section takes one minute)
     * @param {number} courseDegrees - Ship course in degrees
     * @param {number} startWindDegrees - Wind at start of segment
     * @param {number} distanceSegment - Distance of segment
     * @return {number} - Minutes needed to travel the segment
     * @private
     */
    _calculateMinutesForSegment(courseDegrees, startWindDegrees, distanceSegment) {
        let distanceRemaining = distanceSegment,
            currentWindDegrees = startWindDegrees,
            totalMinutesSegment = 0;

        this._setShipSpeed();
        while (distanceRemaining > 0) {
            const distanceCurrentSection = this._calculateDistanceForSection(courseDegrees, currentWindDegrees);
            if (distanceRemaining > distanceCurrentSection) {
                distanceRemaining -= distanceCurrentSection;
                totalMinutesSegment += 1;
            } else {
                totalMinutesSegment += distanceRemaining / distanceCurrentSection;
                distanceRemaining = 0;
            }
            currentWindDegrees = (this._fullCircle + currentWindDegrees - this._degreesPerMinute) % this._fullCircle;

            // console.log({ distanceCurrentSection }, { totalMinutesSegment });
        }
        this._journey.currentWindDegrees = currentWindDegrees;

        return totalMinutesSegment;
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
            const node = d3Select(nodes[i]),
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
                    // Find longest line (number of characters)
                    index = lines.reduce((p, c, i, a) => (a[p].length > c.length ? p : i), 0);
                return lines[index];
            });

        // Strategy that combines simulated annealing with removal of overlapping labels
        const strategy = layoutAnnealing();

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
        this._g.datum(this._journey.segment.map(segment => segment)).call(labels);
        // Correct text boxes
        this._g.selectAll("g.coord g.label").each(correctTextBox);
    }

    _printLines() {
        this.gJourneyPath
            .datum([this._journey.startPosition].concat(this._journey.segment.map(segment => segment.position)))
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

        if (this._journey.segment.length > 1) {
            const totalDuration = moment.duration(this._journey.totalMinutes, "minutes").humanize(true);
            textDistance += ` \u2606 total ${Math.round(this._journey.totalDistance)}k ${totalDuration}`;
        }
        return textDistance;
    }

    _setSegmentLabel(index = this._journey.segment.length - 1) {
        const pt1 = { x: this._journey.segment[index].position[0], y: this._journey.segment[index].position[1] };
        let pt2 = { x: 0, y: 0 };
        if (index - 1 > 0) {
            pt2 = { x: this._journey.segment[index - 1].position[0], y: this._journey.segment[index - 1].position[1] };
        } else {
            pt2 = { x: this._journey.startPosition[0], y: this._journey.startPosition[1] };
        }

        const courseDegrees = rotationAngleInDegrees(pt1, pt2),
            distanceK = getDistance(pt1, pt2),
            courseCompass = degreesToCompass(courseDegrees);

        const minutes = this._calculateMinutesForSegment(
            courseDegrees,
            this._journey.currentWindDegrees,
            distanceK * 1000
        );
        console.log("*** start", this._journey.currentWindDegrees, { distanceK }, { courseCompass });
        this._journey.totalDistance += distanceK;
        this._journey.totalMinutes += minutes;
        const textDirection = this._getTextDirection(courseCompass, courseDegrees, pt1),
            textDistance = this._getTextDistance(distanceK, minutes);

        this._journey.segment[index].label = `${textDirection}|${textDistance}`;
        console.log("*** end", this._journey);
    }

    _printSegment() {
        this._printLines();
        this._setSegmentLabel();
        this._printLabels();
        const circles = this._g.selectAll("g.coord g.label circle").call(this._drag);
        console.log(circles);
        // d3Drag(circles);
    }

    _printJourney() {
        this._printLines();
        this._resetJourney();
        this._journey.segment.forEach((d, i) => {
            this._setSegmentLabel(i);
        });

        this._printLabels();
        this._g.selectAll("g.coord g.label circle").call(this._drag);
    }

    /* public */
    plotCourse(x, y) {
        if (!this._journey.startPosition[0]) {
            this.clearMap();
            this._journey.startPosition = [x, y];
            this._resetJourney();
            this._printCompass();
        } else {
            this._journey.segment.push({ position: [x, y], label: "" });
            this._printSegment();
        }
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._initJourney();
        this._g.selectAll("*").remove();
    }
}
