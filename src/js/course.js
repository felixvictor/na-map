/*
    course.js
*/

/* global d3 : false
 */

import { convertInvCoordX, convertInvCoordY } from "./common";
import { degreesToCompass, rotationAngleInDegrees, distancePoints } from "./util";

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
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("class", "course-head");
    }

    _printCompass(x, y) {
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

    _printLine(x, y) {
        const degrees = rotationAngleInDegrees(
                this._lineData[this._lineData.length - 1],
                this._lineData[this._lineData.length - 2]
            ),
            compass = degreesToCompass(degrees),
            F11X0 = convertInvCoordX(
                this._lineData[this._lineData.length - 1][0],
                this._lineData[this._lineData.length - 1][1]
            ),
            F11Y0 = convertInvCoordY(
                this._lineData[this._lineData.length - 1][0],
                this._lineData[this._lineData.length - 1][1]
            ),
            F11X1 = convertInvCoordX(
                this._lineData[this._lineData.length - 2][0],
                this._lineData[this._lineData.length - 2][1]
            ),
            F11Y1 = convertInvCoordY(
                this._lineData[this._lineData.length - 2][0],
                this._lineData[this._lineData.length - 2][1]
            ),
            distance = distancePoints([F11X0, F11Y0], [F11X1, F11Y1]) / 400;
        console.log([F11X0, F11Y0], [F11X1, F11Y1]);

        this.gCompass
            .datum(this._lineData)
            .attr("marker-end", "url(#course-arrow)")
            .attr("d", this._line);

        const svg = this._g
            .append("svg")
            .attr("x", x)
            .attr("y", y);
        const rect = svg.append("rect");
        const text = svg
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .text(`${compass} (${Math.round(degrees)}°) ${Math.round(distance)}k`);

        const bbox = text.node().getBBox();

        const height = bbox.height + this._fontSize,
            width = bbox.width + this._fontSize;
        rect
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
            this._printCompass(x, y);
            this._bFirstCoord = !this._bFirstCoord;
        } else {
            this._printLine(x, y);
        }
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._bFirstCoord = true;
        if (typeof this._lineData !== "undefined") {
            this._lineData.splice(0, this._lineData.length);
        }

        this._g.selectAll("*").remove();
    }
}
