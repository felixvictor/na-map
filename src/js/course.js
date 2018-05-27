/*
    course.js
*/

/* global d3 : false
 */

import moment from "moment";
import "moment/locale/en-gb";

import { convertInvCoordX, convertInvCoordY, getDistance } from "./common";
import { degreesToCompass, rotationAngleInDegrees, formatF11 } from "./util";

export default class Course {
    constructor(fontSize) {
        this._fontSize = fontSize;
        this._bFirstCoord = true;
        this._compassSize = 100;
        this._line = d3.line();
        this._lineData = [];

        this._setupSvg();
    }

    /* private */
    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .append("g")
            .classed("coord", true);

        d3
            .select("#na-svg defs")
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
            x = this._lineData[pos][0],
            y = this._lineData[pos][1];
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

    _printLine() {
        const pos0 = this._lineData.length - 1,
            pos1 = this._lineData.length - 2,
            degrees = rotationAngleInDegrees(this._lineData[pos0], this._lineData[this._lineData.length - 2]),
            compass = degreesToCompass(degrees),
            pt0 = [this._lineData[pos0][0], this._lineData[pos0][1]],
            pt1 = [this._lineData[pos1][0], this._lineData[pos1][1]],
            distance = getDistance(pt0, pt1),
            factor = 2.56,
            speedFactor = 19 / factor;
        this._totalDistance += distance;
        const duration = moment.duration(distance / speedFactor, "minutes").humanize(true),
            totalDuration = moment.duration(this._totalDistance / speedFactor, "minutes").humanize(true),
            textDirection = `${compass} (${Math.round(degrees)}°) \u2606 F11: ${formatF11(
                convertInvCoordX(pt0[0], pt0[1])
            )}\u202f/\u202f${formatF11(convertInvCoordY(pt0[0], pt0[1]))}`;
        let textDistance = `${Math.round(distance)}k ${duration}`;
        const textLines = 2;
        if (this._lineData.length > 2) {
            textDistance += ` \u2606 total ${Math.round(this._totalDistance)}k ${totalDuration}`;
        }

        this.gCompass
            .datum(this._lineData)
            .attr("marker-end", "url(#course-arrow)")
            .attr("d", this._line);

        const svg = this._g
            .append("svg")
            .attr("x", pt0[0])
            .attr("y", pt0[1]);
        const textBackgroundBox = svg.append("rect");
        const textDirectionBox = svg
            .append("text")
            .attr("x", "10%")
            .attr("y", "33%")
            .text(textDirection);

        const textDistanceBox = svg
            .append("text")
            .attr("x", "10%")
            .attr("y", "66%")
            .text(textDistance);

        const bbTextDirectionBox = textDirectionBox.node().getBBox(),
            bbTextDistanceBox = textDistanceBox.node().getBBox();

        const height = (bbTextDirectionBox.height + this._fontSize) * textLines * 1.1,
            width = (Math.max(bbTextDirectionBox.width, bbTextDistanceBox.width) + this._fontSize) * 1.1;
        textBackgroundBox
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", height)
            .attr("width", width);
        svg.attr("height", height).attr("width", width);
    }

    /* public */
    plotCourse(x, y) {
        if (this._bFirstCoord) {
            this.clearMap();
        }
        this._lineData.push([x, y]);
        if (this._bFirstCoord) {
            this._printCompass();
            this._bFirstCoord = !this._bFirstCoord;
        } else {
            this._printLine();
        }
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._bFirstCoord = true;
        this._totalDistance = 0;
        if (typeof this._lineData !== "undefined") {
            this._lineData.splice(0, this._lineData.length);
        }

        this._g.selectAll("*").remove();
    }
}
