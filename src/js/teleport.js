/*
	teleport.js
*/

/* global d3 : false
 */

export default class Teleport {
    constructor(minCoord, maxCoord, ports) {
        this._ports = ports;
        this._show = false;
        this._voronoiCoord = [[minCoord - 1, minCoord - 1], [maxCoord + 1, maxCoord + 1]];
        this._teleportPorts = this._getPortData();
        this._voronoiDiagram = this._getVoronoiDiagram();
        this._data = {};
        this._highlightId = null;
        this._g = d3
            .select("#na-svg")
            .insert("g", ".ports")
            .classed("voronoi", true);
    }

    _getPortData() {
        // Use only ports that deep water ports and not a county capital
        return (
            this._ports.portDataDefault
                .filter(d => !d.properties.shallow)
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
        this._highlightId = event.data.id;
        this.update();
        this._ports.highlightId(this._highlightId);
        this._ports.update();
    }

    update() {
        // Data join
        const pathUpdate = this._g.selectAll("path").data(this._data, d => d.data.id);

        // Remove old paths
        pathUpdate.exit().remove();

        // Update kept paths
        // pathUpdate; // not needed

        // Add new paths (teleport areas)
        const pathEnter = pathUpdate
            .enter()
            .append("path")
            .attr("d", d => (d ? `M${d.join("L")}Z` : null))
            .on("mouseover", event => this._mouseover(event));

        // Apply to both old and new
        pathUpdate.merge(pathEnter).classed("highlight-voronoi", d => d.data.id === this._highlightId);
    }

    /**
     * Set show status
     * @param {Boolean} show - True if teleport areas are shown
     * @return {void}
     */
    set show(show) {
        this._show = show;
    }

    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
    }

    setData() {
        if (this._show && this._zoomLevel !== "pbZone") {
            this._data = this._voronoiDiagram.polygons();
        } else {
            this._data = {};
        }
        this._highlightId = null;
        this._ports.setHighlightId(this._highlightId);
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }
}
