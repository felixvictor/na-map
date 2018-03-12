/*
	teleport.js
*/

import { select as d3Select } from "d3-selection";
import { voronoi as d3Voronoi } from "d3-voronoi";

export default class Teleport {
    constructor(portData, minCoord, maxCoord, ports) {
        function getPortData() {
            // Use only ports that deep water ports and not a county capital
            return (
                portData
                    .filter(d => !d.properties.shallow && !d.properties.countyCapital)
                    // Map to coordinates array
                    .map(d => ({
                        id: d.id,
                        coord: {
                            x: d.geometry.coordinates[0],
                            y: d.geometry.coordinates[1]
                        }
                    }))
            );
        }

        this.ports = ports;
        this.showTeleportAreas = false;
        this.voronoiCoord = [[minCoord - 1, minCoord - 1], [maxCoord + 1, maxCoord + 1]];
        this.teleportPorts = getPortData();
        this.voronoiDiagram = this.getVoronoiDiagram();
        this.teleportData = {};
        this.highlightId = null;
        this.g = d3Select("#na-svg")
            .insert("g", ".port")
            .classed("voronoi", true);

        this.setupListener();
    }

    getVoronoiDiagram() {
        return d3Voronoi()
            .extent(this.voronoiCoord)
            .x(d => d.coord.x)
            .y(d => d.coord.y)(this.teleportPorts);
    }

    setTeleportData(teleportLevel) {
        if (this.showTeleportAreas && teleportLevel) {
            this.teleportData = this.voronoiDiagram.polygons();
        } else {
            this.teleportData = {};
        }
        this.highlightId = null;
    }

    mouseover(event) {
        // console.log(event);
        /*
        const ref = d3Mouse(nodes[i]),
            mx = ref[0],
            my = ref[1];

        // use the new diagram.find() function to find the voronoi site closest to
        // the mouse, limited by max distance defined by voronoiRadius
        console.log("mouseover ", this.voronoiDiagram);
        const site = this.getVoronoiDiagram().find(mx, my, this.voronoiRadius);
        if (site) {
            this.highlightId = site.data.id;
            this.updateTeleportAreas();
            // updatePorts(zoomLevel);
        }
        */
        this.highlightId = event.data.id;
        this.updateTeleportAreas();
        this.ports.updatePorts(this.highlightId);
    }

    updateTeleportAreas() {
        // Data join
        const pathUpdate = this.g.selectAll("path").data(this.teleportData, d => d.data.id);

        // Remove old paths
        pathUpdate.exit().remove();

        // Update kept paths
        // pathUpdate; // not needed

        // Add new paths (teleport areas)
        const pathEnter = pathUpdate
            .enter()
            .append("path")
            .attr("d", d => (d ? `M${d.join("L")}Z` : null))
            .on("mouseover", event => this.mouseover(event));

        // Apply to both old and new
        pathUpdate.merge(pathEnter).classed("highlight-voronoi", d => d.data.id === this.highlightId);
    }

    transform(transform) {
        this.g.attr("transform", transform);
    }

    setupListener() {
        $("#show-teleport")
            .on("click", event => event.stopPropagation())
            .on("change", () => {
                const $input = $("#show-teleport");

                this.showTeleportAreas = $input.is(":checked");
                this.updateTeleportAreas();
            });
    }
}
