/*
	teleport.js
*/

/* global d3 : false
 */

export default class Teleport {
    constructor(minCoord, maxCoord, ports) {
        this._ports = ports;
        this._showTeleportAreas = false;
        this._voronoiCoord = [[minCoord - 1, minCoord - 1], [maxCoord + 1, maxCoord + 1]];
        this._teleportPorts = this._getPortData();
        this._voronoiDiagram = this._getVoronoiDiagram();
        this._teleportData = {};
        this._highlightId = null;
        this._g = d3
            .select("#na-svg")
            .insert("g", ".port")
            .classed("voronoi", true);

        this._setupListener();
    }

    _setupListener() {
        $("#show-teleport")
            .on("click", event => event.stopPropagation())
            .on("change", () => {
                const $input = $("#show-teleport");

                this._showTeleportAreas = $input.is(":checked");
                this.updateTeleportAreas();
            });
    }

    _getPortData() {
        // Use only ports that deep water ports and not a county capital
        return (
            this._ports.portDataDefault
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

    _getVoronoiDiagram() {
        return d3
            .voronoi()
            .extent(this._voronoiCoord)
            .x(d => d.coord.x)
            .y(d => d.coord.y)(this._teleportPorts);
    }

    _mouseover(event) {
        // console.log(event);
        /*
        const ref = d3.mouse(nodes[i]),
            mx = ref[0],
            my = ref[1];

        // use the new diagram.find() function to find the voronoi site closest to
        // the mouse, limited by max distance defined by voronoiRadius
        console.log("_mouseover ", this._voronoiDiagram);
        const site = this._getVoronoiDiagram().find(mx, my, this.voronoiRadius);
        if (site) {
            this.highlightId = site.data.id;
            this.updateTeleportAreas();
            // update(zoomLevel);
        }
        */
        this._highlightId = event.data.id;
        this.updateTeleportAreas();
        this._ports.setHighlightId(this._highlightId);
        this._ports.update();
    }

    updateTeleportAreas() {
        // Data join
        const pathUpdate = this._g.selectAll("path").data(this._teleportData, d => d.data.id);

        // Remove old paths
        pathUpdate.exit().remove();

        // Update kept paths
        // pathUpdate; // not needed

        // Add new paths (teleport areas)
        const pathEnter = pathUpdate
            .enter()
            .append("path")
            .attr("d", d => (d ? `M${d.join("L")}Z` : null))
            .on("_mouseover", event => this._mouseover(event));

        // Apply to both old and new
        pathUpdate.merge(pathEnter).classed("highlight-voronoi", d => d.data.id === this._highlightId);
    }

    setTeleportData(teleportLevel) {
        if (this._showTeleportAreas && teleportLevel) {
            this._teleportData = this._voronoiDiagram.polygons();
        } else {
            this._teleportData = {};
        }
        this._highlightId = null;
        this._ports.setHighlightId(this._highlightId);
    }

    setZoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }
}
