/*
    course.js
*/

/* global d3 : false
 */

import { degreesToCompass, rotationAngleInDegrees } from "./util";

export default class Course {
    constructor(fontSize) {
        this.fontSize = fontSize;
        this.bFirstCoord = true;
        this.compassSize = 100;
        this.line = d3.line();
        this.lineData = [];

        this.setupSvg();
    }

    setupSvg() {
        this.g = d3.select("#na-svg")
            .append("g")
            .classed("coord", true);

        d3.select("#na-svg defs")
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

    plotCourse(x, y) {
        if (this.bFirstCoord) {
            this.clearMap();
        }

        this.lineData.push([x, y]);

        if (this.bFirstCoord) {
            this.printCompass(x, y);
            this.bFirstCoord = !this.bFirstCoord;
        } else {
            this.printLine(x, y);
        }
    }

    printCompass(x, y) {
        this.g
            .append("image")
            .classed("compass", true)
            .attr("x", x)
            .attr("y", y)
            .attr("transform", `translate(${-this.compassSize / 2},${-this.compassSize / 2})`)
            .attr("height", this.compassSize)
            .attr("width", this.compassSize)
            .attr("xlink:href", "icons/compass.svg");
        this.gCompass = this.g.append("path");
    }

    printLine(x, y) {
        const degrees = rotationAngleInDegrees(
            this.lineData[this.lineData.length - 1],
            this.lineData[this.lineData.length - 2]
        );
        const compass = degreesToCompass(degrees);
        this.gCompass
            .datum(this.lineData)
            .attr("marker-end", "url(#course-arrow)")
            .attr("d", this.line);

        const svg = this.g
            .append("svg")
            .attr("x", x)
            .attr("y", y);
        const rect = svg.append("rect");
        const text = svg
            .append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .text(`${compass} (${Math.round(degrees)}°)`);

        const bbox = text.node().getBBox();
        const height = bbox.height + this.fontSize,
            width = bbox.width + this.fontSize;
        rect
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", height)
            .attr("width", width);
        svg.attr("height", height).attr("width", width);
    }

    transform(transform) {
        this.g.attr("transform", transform);
    }

    clearMap() {
        this.bFirstCoord = true;
        if (typeof this.lineData !== "undefined") {
            this.lineData.splice(0, this.lineData.length);
        }

        this.g.selectAll("*").remove();
    }
}
