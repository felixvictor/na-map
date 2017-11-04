webpackHotUpdate(0,{

/***/ 133:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($) {/* harmony export (immutable) */ __webpack_exports__[\"a\"] = naDisplay;\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_d3_geo__ = __webpack_require__(134);\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_d3_queue__ = __webpack_require__(178);\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_d3_request__ = __webpack_require__(181);\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_d3_selection__ = __webpack_require__(1);\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_d3_voronoi__ = __webpack_require__(229);\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_d3_zoom__ = __webpack_require__(234);\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_d3fc_label_layout__ = __webpack_require__(289);\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_d3fc_label_layout___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_d3fc_label_layout__);\n/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_topojson_client__ = __webpack_require__(334);\nfunction naDisplay(a){function b(){var a,b,c;m=w.geoPath().projection(l),j=document.getElementById(\"na\").offsetWidth-{top:0,right:0,bottom:0,left:0}.left-{top:0,right:0,bottom:0,left:0}.right,j=4000>j?4000:j,a=m.bounds(u),b=a[1][0]-a[0][0],c=a[1][1]-a[0][1],k=j/(b/c)-{top:0,right:0,bottom:0,left:0}.top-{top:0,right:0,bottom:0,left:0}.bottom,l=w.geoEquirectangular().fitExtent([[-b,-c],[j+b,k+c]],u),m=w.geoPath().projection(l)}function c(){n=w.select(\"#na\").append(\"svg\").attr(\"id\",\"na-svg\").attr(\"width\",j).attr(\"height\",k).on(\"click\",e,!0),n.append(\"rect\").attr(\"class\",\"background\").attr(\"width\",j).attr(\"height\",k),p=w.zoom().scaleExtent([0.6,3]).on(\"zoom\",d),n.call(p),o=n.append(\"defs\")}function d(){r.attr(\"transform\",transform),q.attr(\"transform\",transform),s.attr(\"transform\",transform),q.selectAll(\".label text\").style(\"font-size\",function(){return\"naFontSize / transform.k\"}),q.selectAll(\".label circle\").attr(\"r\",10/transform.k)}function e(){__WEBPACK_IMPORTED_MODULE_3_d3_selection__[\"event\"].defaultPrevented&&__WEBPACK_IMPORTED_MODULE_3_d3_selection__[\"event\"].stopPropagation()}function f(){var a=o.append(\"filter\").attr(\"id\",\"border\");a.append(\"feColorMatrix\").attr(\"in\",\"SourceGraphic\").attr(\"type\",\"matrix\").attr(\"values\",\"0 0 0 0 0.302  0 0 0 0 0.263  0 0 0 0 0.216  0 0 0 1 0\").attr(\"result\",\"fmask\"),a.append(\"feGaussianBlur\").attr(\"in\",\"fmask\").attr(\"stdDeviation\",15).attr(\"result\",\"f1blur\"),a.append(\"feColorMatrix\").attr(\"in\",\"SourceGraphic\").attr(\"type\",\"matrix\").attr(\"values\",\"0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0\").attr(\"result\",\"f2mask1\"),a.append(\"feMorphology\").attr(\"in\",\"f2mask1\").attr(\"radius\",1).attr(\"operator\",\"erode\").attr(\"result\",\"f2m\"),a.append(\"feGaussianBlur\").attr(\"in\",\"f2m\").attr(\"stdDeviation\",5).attr(\"result\",\"f2blur\"),a.append(\"feColorMatrix\").attr(\"in\",\"f2blur\").attr(\"type\",\"matrix\").attr(\"values\",\"1 0 0 0 0.302 0 1 0 0 0.263 0 0 1 0 0.216 0 0 0 -1 1\").attr(\"result\",\"f2mask2\"),a.append(\"feComposite\").attr(\"operator\",\"in\").attr(\"in\",\"f2mask2\").attr(\"in2\",\"f2mask1\").attr(\"result\",\"f2border\");var b=a.append(\"feMerge\");b.append(\"feMergeNode\").attr(\"in\",\"f1blur\"),b.append(\"feMergeNode\").attr(\"in\",\"SourceGraphic\"),b.append(\"feMergeNode\").attr(\"in\",\"f2border\"),r=n.append(\"g\"),r.append(\"path\").attr(\"class\",\"na-country\").datum(u).attr(\"d\",m).style(\"filter\",\"url(#border)\")}function g(){for(var d=0;d<=12;d++)o.append(\"pattern\").attr(\"id\",\"n\"+d).attr(\"x\",\"0%\").attr(\"y\",\"0%\").attr(\"width\",\"100%\").attr(\"height\",\"100%\").attr(\"viewBox\",\"0 0 50 50\").append(\"image\").attr(\"x\",\"0\").attr(\"y\",\"0\").attr(\"height\",\"50\").attr(\"width\",\"50\").attr(\"xlink:href\",\"icons/n\"+d+\".svg\");var a=x.layoutTextLabel().padding(3).value(function(a){return a.properties.name}),b=x.layoutGreedy(),c=x.layoutLabel(b).size(function(a,b,c){var d=w.select(c[b]).select(\"text\").node().getBBox();return[d.width,d.height]}).position(function(a){return l(a.geometry.coordinates)}).component(a);q=n.append(\"g\").datum(v.features).call(c),q.selectAll(\".label text\").attr(\"dx\",10).attr(\"class\",function(a){var b;return b=a.properties.shallow||a.properties.countyCapital?\"na-port-out\":\"na-port-in\",b}),q.selectAll(\".label rect\").attr(\"class\",\"label-rect\"),q.selectAll(\".label circle\").attr(\"id\",function(a){return\"p\"+a.properties.id}).attr(\"r\",10).attr(\"fill\",function(a){return\"url(#\"+a.properties.nation+\")\"}).on(\"mouseover\",function(a){w.select(this).attr(\"data-toggle\",\"tooltip\").attr(\"title\",function(a){return h(a.properties)}),$(\"#p\"+a.properties.id).tooltip({delay:{show:100,hide:100},html:!0,placement:\"auto\"}).tooltip(\"show\")}).on(\"mouseout\",function(a){$(\"#p\"+a.properties.id).tooltip(\"hide\")})}function h(a){var b;return b=\"<table><tbody<tr><td><i class='flag-icon \"+a.nation+\"'></i></td>\",b+=\"<td class='port-name'>\"+a.name+\"</td></tr></tbody></table>\",b+=\"<p>\"+(a.shallow?\"Shallow\":\"Deep\"),b+=\" water port\",a.countyCapital&&(b+=\", county capital\"),b+=a.nonCapturable?\", not capturable\":\", \"+a.brLimit+\" BR limit\",a.capturer&&(b+=\", owned by \"+a.capturer),b+=\"</p>\",b+=\"<table class='table table-sm'>\",a.produces.length&&(b+=\"<tr><td>Produces</td><td>\"+a.produces.join(\", \")+\"</td></tr>\"),a.drops.length&&(b+=\"<tr><td>Drops</td><td>\"+a.drops.join(\", \")+\"</tr>\"),a.consumes.length&&(b+=\"<tr><td>Consumes</td><td>\"+a.consumes.join(\", \")+\"</tr>\"),b+=\"</table>\",b}function i(){var a=v.features.filter(function(a){return!a.properties.shallow&&!a.properties.countyCapital}).map(function(a){return[a.geometry.coordinates[0],a.geometry.coordinates[1]]});s=n.append(\"g\").attr(\"class\",\"voronoi\").call(p).selectAll(\".voronoi\").data(a).enter().append(\"g\");var b=j/10,c=w.voronoi().extent([[-1,-1],[j+1,k+1]]),d=c(a.map(l));s.append(\"path\").data(c.polygons(a.map(l))).attr(\"id\",function(a){return\"v\"+a.id}).attr(\"d\",function(a){return a?\"M\"+a.coord.join(\"L\")+\"Z\":null}).attr(\"pointer-events\",\"visibleFill\").on(\"mouseover\",function(){var a=Object(__WEBPACK_IMPORTED_MODULE_3_d3_selection__[\"mouse\"])(this),c=a[0],e=a[1],f=d.find(c,e,b);t=s._groups[0][f.index],t.classList.add(\"highlight-voronoi\")}).on(\"mouseout\",function(){t.classList.remove(\"highlight-voronoi\")})}var j,k,l,m,n,o,p,q,r,s,t,u,v,w={geoEquirectangular:__WEBPACK_IMPORTED_MODULE_0_d3_geo__[\"a\" /* geoEquirectangular */],geoPath:__WEBPACK_IMPORTED_MODULE_0_d3_geo__[\"b\" /* geoPath */],json:__WEBPACK_IMPORTED_MODULE_2_d3_request__[\"a\" /* json */],queue:__WEBPACK_IMPORTED_MODULE_1_d3_queue__[\"a\" /* queue */],request:__WEBPACK_IMPORTED_MODULE_2_d3_request__[\"b\" /* request */],select:__WEBPACK_IMPORTED_MODULE_3_d3_selection__[\"select\"],voronoi:__WEBPACK_IMPORTED_MODULE_4_d3_voronoi__[\"a\" /* voronoi */],zoom:__WEBPACK_IMPORTED_MODULE_5_d3_zoom__[\"a\" /* zoom */]},x={layoutTextLabel:__WEBPACK_IMPORTED_MODULE_6_d3fc_label_layout__[\"layoutTextLabel\"],layoutGreedy:__WEBPACK_IMPORTED_MODULE_6_d3fc_label_layout__[\"layoutGreedy\"],layoutLabel:__WEBPACK_IMPORTED_MODULE_6_d3fc_label_layout__[\"layoutLabel\"]},y={feature:__WEBPACK_IMPORTED_MODULE_7_topojson_client__[\"a\" /* feature */]},z=parseInt(window.getComputedStyle(document.getElementById(\"na\")).fontSize);w.queue().defer(w.json,a+\".json\").await(function(a,d){if(a)throw a;u=y.feature(d,d.objects.countries),v=y.feature(d,d.objects.ports),b(),c(),i(),f(),g()})}\n/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(14)))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9qcy9uYS1kaXNwbGF5LmpzP2UwMjkiXSwibmFtZXMiOlsibmFEaXNwbGF5IiwiZ2VvUGF0aCIsInByb2plY3Rpb24iLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwib2Zmc2V0V2lkdGgiLCJsZWZ0IiwicmlnaHQiLCJib3VuZHMiLCJ0b3AiLCJib3R0b20iLCJnZW9FcXVpcmVjdGFuZ3VsYXIiLCJmaXRFeHRlbnQiLCJzZWxlY3QiLCJhcHBlbmQiLCJhdHRyIiwib24iLCJ6b29tIiwic2NhbGVFeHRlbnQiLCJjYWxsIiwidHJhbnNmb3JtIiwic2VsZWN0QWxsIiwic3R5bGUiLCJrIiwiY3VycmVudEQzRXZlbnQiLCJkZWZhdWx0UHJldmVudGVkIiwic3RvcFByb3BhZ2F0aW9uIiwiZGF0dW0iLCJsYXlvdXRUZXh0TGFiZWwiLCJwYWRkaW5nIiwidmFsdWUiLCJwcm9wZXJ0aWVzIiwibmFtZSIsImxheW91dEdyZWVkeSIsImxheW91dExhYmVsIiwic2l6ZSIsIm5vZGUiLCJnZXRCQm94Iiwid2lkdGgiLCJoZWlnaHQiLCJwb3NpdGlvbiIsImdlb21ldHJ5IiwiY29vcmRpbmF0ZXMiLCJjb21wb25lbnQiLCJmZWF0dXJlcyIsInNoYWxsb3ciLCJjb3VudHlDYXBpdGFsIiwiaWQiLCJuYXRpb24iLCIkIiwidG9vbHRpcCIsIm5vbkNhcHR1cmFibGUiLCJickxpbWl0IiwiY2FwdHVyZXIiLCJwcm9kdWNlcyIsImxlbmd0aCIsImpvaW4iLCJkcm9wcyIsImNvbnN1bWVzIiwiZmlsdGVyIiwibWFwIiwiZGF0YSIsImVudGVyIiwidm9yb25vaSIsImV4dGVudCIsInBvbHlnb25zIiwiY29vcmQiLCJjdXJyZW50RDNtb3VzZSIsImZpbmQiLCJfZ3JvdXBzIiwiaW5kZXgiLCJjbGFzc0xpc3QiLCJhZGQiLCJyZW1vdmUiLCJqc29uIiwicXVldWUiLCJyZXF1ZXN0IiwiZmVhdHVyZSIsInBhcnNlSW50Iiwid2luZG93IiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImZvbnRTaXplIiwiZGVmZXIiLCJhd2FpdCIsIm9iamVjdHMiLCJjb3VudHJpZXMiLCJwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQXNCZSxRQUFTQSxVQUFULEdBQStCLENBMkIxQyxZQUE2QixDQUN6QixHQUVJLEVBRkosQ0FFYyxDQUZkLENBRTZCLENBRjdCLENBSUEsRUFBUyxFQUFHQyxPQUFILEdBQWFDLFVBQWIsR0FMZ0IsQ0FNekIsRUFBVUMsU0FBU0MsY0FBVCxDQUF3QixJQUF4QixFQUE4QkMsV0FBOUIsQ0FBNEMsZ0NBQVNDLElBQXJELENBQTRELGdDQUFTQyxLQU50RCxDQU96QixFQUFVLGFBUGUsQ0FRekIsRUFBVyxFQUFPQyxNQUFQLEdBUmMsQ0FTekIsRUFBZ0IsRUFBUyxDQUFULEVBQVksQ0FBWixFQUFpQixFQUFTLENBQVQsRUFBWSxDQUFaLENBVFIsQ0FVekIsRUFBaUIsRUFBUyxDQUFULEVBQVksQ0FBWixFQUFpQixFQUFTLENBQVQsRUFBWSxDQUFaLENBVlQsQ0FXekIsRUFBVyxHQUFXLEdBQVgsRUFBNkMsZ0NBQVNDLEdBQXRELENBQTRELGdDQUFTQyxNQVh2RCxDQWF6QixFQUFlLEVBQ1ZDLGtCQURVLEdBRVZDLFNBRlUsQ0FHUCxDQUFDLENBQUMsRUFBRCxDQUFpQixFQUFqQixDQUFELENBQW9DLENBQUMsR0FBRCxDQUEwQixHQUExQixDQUFwQyxDQUhPLEdBYlUsQ0FtQnpCLEVBQVMsRUFBR1gsT0FBSCxHQUFhQyxVQUFiLEdBQ1osQ0FFRCxZQUF5QixDQUNyQixFQUFRLEVBQ0hXLE1BREcsQ0FDSSxLQURKLEVBRUhDLE1BRkcsQ0FFSSxLQUZKLEVBR0hDLElBSEcsQ0FHRSxJQUhGLENBR1EsUUFIUixFQUlIQSxJQUpHLENBSUUsT0FKRixJQUtIQSxJQUxHLENBS0UsUUFMRixJQU1IQyxFQU5HLENBTUEsT0FOQSxNQURhLENBU3JCLEVBQ0tGLE1BREwsQ0FDWSxNQURaLEVBRUtDLElBRkwsQ0FFVSxPQUZWLENBRW1CLFlBRm5CLEVBR0tBLElB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QixDQUVESyxhQUFjLCtEQUZiLENBR0RDLFlBQWEsOERBSFosQ0FWVCxDQWVJLEVBQVcsQ0FDUDJDLFFBQVMsZ0VBREYsQ0FmZixDQXVCTSxFQUFhQyxTQUFTQyxPQUFPQyxnQkFBUCxDQUF3QjdFLFNBQVNDLGNBQVQsQ0FBd0IsSUFBeEIsQ0FBeEIsRUFBdUQ2RSxRQUFoRSxDQXZCbkIsQ0E4WEEsRUFDS04sS0FETCxHQUVLTyxLQUZMLENBRVcsRUFBR1IsSUFGZCxDQXRXa0IsRUFBYSxPQXNXL0IsRUFHS1MsS0FITCxDQWpCQSxhQUErQixDQUMzQixLQUNJLFFBSUosRUFBYyxFQUFTTixPQUFULEdBQXdCLEVBQU1PLE9BQU4sQ0FBY0MsU0FBdEMsQ0FOYSxDQU8zQixFQUFVLEVBQVNSLE9BQVQsR0FBd0IsRUFBTU8sT0FBTixDQUFjRSxLQUF0QyxDQVBpQixDQVMzQixHQVQyQixDQVUzQixHQVYyQixDQVkzQixHQVoyQixDQWEzQixHQWIyQixDQWMzQixHQUNILENBRUQsQ0FJSCxDIiwiZmlsZSI6IjEzMy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gICAgRHJhd3MgdGVsZXBvcnQgbWFwIGZvciBOYXZhbCBBY3Rpb25cblxuICAgIGlCIDIwMTdcbiAqL1xuXG5pbXBvcnQgeyBnZW9FcXVpcmVjdGFuZ3VsYXIgYXMgZDNnZW9FcXVpcmVjdGFuZ3VsYXIsIGdlb1BhdGggYXMgZDNHZW9QYXRoIH0gZnJvbSBcImQzLWdlb1wiO1xuaW1wb3J0IHsgcXVldWUgYXMgZDNRdWV1ZSB9IGZyb20gXCJkMy1xdWV1ZVwiO1xuaW1wb3J0IHsganNvbiBhcyBkM0pzb24sIHJlcXVlc3QgYXMgZDNSZXF1ZXN0IH0gZnJvbSBcImQzLXJlcXVlc3RcIjtcbi8vIGV2ZW50IG5lZWRzIGxpdmUtYmluZGluZ1xuaW1wb3J0IHsgZXZlbnQgYXMgY3VycmVudEQzRXZlbnQsIG1vdXNlIGFzIGN1cnJlbnREM21vdXNlLCBzZWxlY3QgYXMgZDNTZWxlY3QgfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XG5pbXBvcnQgeyB2b3Jvbm9pIGFzIGQzVm9yb25vaSB9IGZyb20gXCJkMy12b3Jvbm9pXCI7XG5pbXBvcnQgeyB6b29tIGFzIGQzWm9vbSB9IGZyb20gXCJkMy16b29tXCI7XG5cbmltcG9ydCB7XG4gICAgbGF5b3V0VGV4dExhYmVsIGFzIGZjTGF5b3V0VGV4dExhYmVsLFxuICAgIGxheW91dEdyZWVkeSBhcyBmY0xheW91dEdyZWVkeSxcbiAgICBsYXlvdXRMYWJlbCBhcyBmY0xheW91dExhYmVsXG59IGZyb20gXCJkM2ZjLWxhYmVsLWxheW91dFwiO1xuXG5pbXBvcnQgeyBmZWF0dXJlIGFzIHRvcG9qc29uRmVhdHVyZSB9IGZyb20gXCJ0b3BvanNvbi1jbGllbnRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbmFEaXNwbGF5KHNlcnZlck5hbWUpIHtcbiAgICBjb25zdCBkMyA9IHtcbiAgICAgICAgICAgIGdlb0VxdWlyZWN0YW5ndWxhcjogZDNnZW9FcXVpcmVjdGFuZ3VsYXIsXG4gICAgICAgICAgICBnZW9QYXRoOiBkM0dlb1BhdGgsXG4gICAgICAgICAgICBqc29uOiBkM0pzb24sXG4gICAgICAgICAgICBxdWV1ZTogZDNRdWV1ZSxcbiAgICAgICAgICAgIHJlcXVlc3Q6IGQzUmVxdWVzdCxcbiAgICAgICAgICAgIHNlbGVjdDogZDNTZWxlY3QsXG4gICAgICAgICAgICB2b3Jvbm9pOiBkM1Zvcm9ub2ksXG4gICAgICAgICAgICB6b29tOiBkM1pvb21cbiAgICAgICAgfSxcbiAgICAgICAgZmMgPSB7XG4gICAgICAgICAgICBsYXlvdXRUZXh0TGFiZWw6IGZjTGF5b3V0VGV4dExhYmVsLFxuICAgICAgICAgICAgbGF5b3V0R3JlZWR5OiBmY0xheW91dEdyZWVkeSxcbiAgICAgICAgICAgIGxheW91dExhYmVsOiBmY0xheW91dExhYmVsXG4gICAgICAgIH0sXG4gICAgICAgIHRvcG9qc29uID0ge1xuICAgICAgICAgICAgZmVhdHVyZTogdG9wb2pzb25GZWF0dXJlXG4gICAgICAgIH07XG5cbiAgICBsZXQgbmFXaWR0aCwgbmFIZWlnaHQ7XG4gICAgbGV0IG5hUHJvamVjdGlvbiwgbmFQYXRoLCBuYVN2ZywgbmFEZWZzLCBuYVpvb207XG4gICAgbGV0IGdQb3J0cywgZ0NvdW50cmllcywgZ1Zvcm9ub2ksIG5hQ3VycmVudFZvcm9ub2k7XG4gICAgbGV0IG5hQ291bnRyaWVzLCBuYVBvcnRzO1xuICAgIGNvbnN0IG5hRm9udFNpemUgPSBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5hXCIpKS5mb250U2l6ZSk7XG4gICAgY29uc3QgbmFNYXBKc29uID0gc2VydmVyTmFtZSArIFwiLmpzb25cIjtcblxuICAgIGZ1bmN0aW9uIG5hU2V0dXBQcm9qZWN0aW9uKCkge1xuICAgICAgICBjb25zdCBuYU1hcmdpbiA9IHsgdG9wOiAwLCByaWdodDogMCwgYm90dG9tOiAwLCBsZWZ0OiAwIH07XG4gICAgICAgIGNvbnN0IG1pbldpZHRoID0gNDAwMDtcbiAgICAgICAgbGV0IG5hQm91bmRzLCBuYUJvdW5kc1dpZHRoLCBuYUJvdW5kc0hlaWdodDtcblxuICAgICAgICBuYVBhdGggPSBkMy5nZW9QYXRoKCkucHJvamVjdGlvbihuYVByb2plY3Rpb24pO1xuICAgICAgICBuYVdpZHRoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuYVwiKS5vZmZzZXRXaWR0aCAtIG5hTWFyZ2luLmxlZnQgLSBuYU1hcmdpbi5yaWdodDtcbiAgICAgICAgbmFXaWR0aCA9IG1pbldpZHRoID4gbmFXaWR0aCA/IG1pbldpZHRoIDogbmFXaWR0aDtcbiAgICAgICAgbmFCb3VuZHMgPSBuYVBhdGguYm91bmRzKG5hQ291bnRyaWVzKTtcbiAgICAgICAgbmFCb3VuZHNXaWR0aCA9IG5hQm91bmRzWzFdWzBdIC0gbmFCb3VuZHNbMF1bMF07XG4gICAgICAgIG5hQm91bmRzSGVpZ2h0ID0gbmFCb3VuZHNbMV1bMV0gLSBuYUJvdW5kc1swXVsxXTtcbiAgICAgICAgbmFIZWlnaHQgPSBuYVdpZHRoIC8gKG5hQm91bmRzV2lkdGggLyBuYUJvdW5kc0hlaWdodCkgLSBuYU1hcmdpbi50b3AgLSBuYU1hcmdpbi5ib3R0b207XG5cbiAgICAgICAgbmFQcm9qZWN0aW9uID0gZDNcbiAgICAgICAgICAgIC5nZW9FcXVpcmVjdGFuZ3VsYXIoKVxuICAgICAgICAgICAgLmZpdEV4dGVudChcbiAgICAgICAgICAgICAgICBbWy1uYUJvdW5kc1dpZHRoLCAtbmFCb3VuZHNIZWlnaHRdLCBbbmFXaWR0aCArIG5hQm91bmRzV2lkdGgsIG5hSGVpZ2h0ICsgbmFCb3VuZHNIZWlnaHRdXSxcbiAgICAgICAgICAgICAgICBuYUNvdW50cmllc1xuICAgICAgICAgICAgKTtcbiAgICAgICAgbmFQYXRoID0gZDMuZ2VvUGF0aCgpLnByb2plY3Rpb24obmFQcm9qZWN0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuYVNldHVwQ2FudmFzKCkge1xuICAgICAgICBuYVN2ZyA9IGQzXG4gICAgICAgICAgICAuc2VsZWN0KFwiI25hXCIpXG4gICAgICAgICAgICAuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgICAgICAuYXR0cihcImlkXCIsIFwibmEtc3ZnXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIG5hV2lkdGgpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBuYUhlaWdodClcbiAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIG5hU3RvcFByb3AsIHRydWUpO1xuXG4gICAgICAgIG5hU3ZnXG4gICAgICAgICAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImJhY2tncm91bmRcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgbmFXaWR0aClcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIG5hSGVpZ2h0KTtcblxuICAgICAgICBuYVpvb20gPSBkM1xuICAgICAgICAgICAgLnpvb20oKVxuICAgICAgICAgICAgLnNjYWxlRXh0ZW50KFswLjYsIDNdKVxuICAgICAgICAgICAgLm9uKFwiem9vbVwiLCBuYVpvb21lZCk7XG5cbiAgICAgICAgbmFTdmcuY2FsbChuYVpvb20pO1xuXG4gICAgICAgIG5hRGVmcyA9IG5hU3ZnLmFwcGVuZChcImRlZnNcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmFab29tZWQoKSB7XG4gICAgICAgIGdDb3VudHJpZXMuYXR0cihcInRyYW5zZm9ybVwiLCB0cmFuc2Zvcm0pO1xuICAgICAgICBnUG9ydHMuYXR0cihcInRyYW5zZm9ybVwiLCB0cmFuc2Zvcm0pO1xuICAgICAgICBnVm9yb25vaS5hdHRyKFwidHJhbnNmb3JtXCIsIHRyYW5zZm9ybSk7XG5cbiAgICAgICAgZ1BvcnRzLnNlbGVjdEFsbChcIi5sYWJlbCB0ZXh0XCIpLnN0eWxlKFwiZm9udC1zaXplXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm5hRm9udFNpemUgLyB0cmFuc2Zvcm0ua1wiO1xuICAgICAgICB9KTtcblxuICAgICAgICBnUG9ydHMuc2VsZWN0QWxsKFwiLmxhYmVsIGNpcmNsZVwiKS5hdHRyKFwiclwiLCAxMCAvIHRyYW5zZm9ybS5rKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuYVN0b3BQcm9wKCkge1xuICAgICAgICBpZiAoY3VycmVudEQzRXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgY3VycmVudEQzRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuYURpc3BsYXlDb3VudHJpZXMoKSB7XG4gICAgICAgIGxldCBuYUZpbHRlciA9IG5hRGVmcy5hcHBlbmQoXCJmaWx0ZXJcIikuYXR0cihcImlkXCIsIFwiYm9yZGVyXCIpO1xuXG4gICAgICAgIG5hRmlsdGVyXG4gICAgICAgICAgICAuYXBwZW5kKFwiZmVDb2xvck1hdHJpeFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJpblwiLCBcIlNvdXJjZUdyYXBoaWNcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLCBcIm1hdHJpeFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ2YWx1ZXNcIiwgXCIwIDAgMCAwIDAuMzAyICAwIDAgMCAwIDAuMjYzICAwIDAgMCAwIDAuMjE2ICAwIDAgMCAxIDBcIilcbiAgICAgICAgICAgIC5hdHRyKFwicmVzdWx0XCIsIFwiZm1hc2tcIik7XG5cbiAgICAgICAgbmFGaWx0ZXJcbiAgICAgICAgICAgIC5hcHBlbmQoXCJmZUdhdXNzaWFuQmx1clwiKVxuICAgICAgICAgICAgLmF0dHIoXCJpblwiLCBcImZtYXNrXCIpXG4gICAgICAgICAgICAuYXR0cihcInN0ZERldmlhdGlvblwiLCAxNSlcbiAgICAgICAgICAgIC5hdHRyKFwicmVzdWx0XCIsIFwiZjFibHVyXCIpO1xuXG4gICAgICAgIG5hRmlsdGVyXG4gICAgICAgICAgICAuYXBwZW5kKFwiZmVDb2xvck1hdHJpeFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJpblwiLCBcIlNvdXJjZUdyYXBoaWNcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLCBcIm1hdHJpeFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ2YWx1ZXNcIiwgXCIwIDAgMCAwIDAgICAwIDAgMCAwIDAgICAwIDAgMCAwIDAgICAwIDAgMCAxIDBcIilcbiAgICAgICAgICAgIC5hdHRyKFwicmVzdWx0XCIsIFwiZjJtYXNrMVwiKTtcblxuICAgICAgICBuYUZpbHRlclxuICAgICAgICAgICAgLmFwcGVuZChcImZlTW9ycGhvbG9neVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJpblwiLCBcImYybWFzazFcIilcbiAgICAgICAgICAgIC5hdHRyKFwicmFkaXVzXCIsIDEpXG4gICAgICAgICAgICAuYXR0cihcIm9wZXJhdG9yXCIsIFwiZXJvZGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwicmVzdWx0XCIsIFwiZjJtXCIpO1xuXG4gICAgICAgIG5hRmlsdGVyXG4gICAgICAgICAgICAuYXBwZW5kKFwiZmVHYXVzc2lhbkJsdXJcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaW5cIiwgXCJmMm1cIilcbiAgICAgICAgICAgIC5hdHRyKFwic3RkRGV2aWF0aW9uXCIsIDUpXG4gICAgICAgICAgICAuYXR0cihcInJlc3VsdFwiLCBcImYyYmx1clwiKTtcblxuICAgICAgICBuYUZpbHRlclxuICAgICAgICAgICAgLmFwcGVuZChcImZlQ29sb3JNYXRyaXhcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaW5cIiwgXCJmMmJsdXJcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHlwZVwiLCBcIm1hdHJpeFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ2YWx1ZXNcIiwgXCIxIDAgMCAwIDAuMzAyIDAgMSAwIDAgMC4yNjMgMCAwIDEgMCAwLjIxNiAwIDAgMCAtMSAxXCIpXG4gICAgICAgICAgICAuYXR0cihcInJlc3VsdFwiLCBcImYybWFzazJcIik7XG5cbiAgICAgICAgbmFGaWx0ZXJcbiAgICAgICAgICAgIC5hcHBlbmQoXCJmZUNvbXBvc2l0ZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJvcGVyYXRvclwiLCBcImluXCIpXG4gICAgICAgICAgICAuYXR0cihcImluXCIsIFwiZjJtYXNrMlwiKVxuICAgICAgICAgICAgLmF0dHIoXCJpbjJcIiwgXCJmMm1hc2sxXCIpXG4gICAgICAgICAgICAuYXR0cihcInJlc3VsdFwiLCBcImYyYm9yZGVyXCIpO1xuXG4gICAgICAgIGxldCBmZU1lcmdlID0gbmFGaWx0ZXIuYXBwZW5kKFwiZmVNZXJnZVwiKTtcbiAgICAgICAgZmVNZXJnZS5hcHBlbmQoXCJmZU1lcmdlTm9kZVwiKS5hdHRyKFwiaW5cIiwgXCJmMWJsdXJcIik7XG4gICAgICAgIGZlTWVyZ2UuYXBwZW5kKFwiZmVNZXJnZU5vZGVcIikuYXR0cihcImluXCIsIFwiU291cmNlR3JhcGhpY1wiKTtcbiAgICAgICAgZmVNZXJnZS5hcHBlbmQoXCJmZU1lcmdlTm9kZVwiKS5hdHRyKFwiaW5cIiwgXCJmMmJvcmRlclwiKTtcblxuICAgICAgICBnQ291bnRyaWVzID0gbmFTdmcuYXBwZW5kKFwiZ1wiKTtcblxuICAgICAgICBnQ291bnRyaWVzXG4gICAgICAgICAgICAuYXBwZW5kKFwicGF0aFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5hLWNvdW50cnlcIilcbiAgICAgICAgICAgIC5kYXR1bShuYUNvdW50cmllcylcbiAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBuYVBhdGgpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWx0ZXJcIiwgXCJ1cmwoI2JvcmRlcilcIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmFEaXNwbGF5UG9ydHMoKSB7XG4gICAgICAgIGNvbnN0IGxhYmVsUGFkZGluZyA9IDM7XG5cbiAgICAgICAgY29uc3QgbmFOYXRpb25zID0gMTI7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gbmFOYXRpb25zOyBpKyspIHtcbiAgICAgICAgICAgIG5hRGVmc1xuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJwYXR0ZXJuXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJpZFwiLCBcIm5cIiArIGkpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIFwiMCVcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInlcIiwgXCIwJVwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgXCIxMDAlXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgXCIxMDAlXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ2aWV3Qm94XCIsIFwiMCAwIDUwIDUwXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcImltYWdlXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIFwiMFwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCBcIjBcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBcIjUwXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBcIjUwXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4bGluazpocmVmXCIsIFwiaWNvbnMvblwiICsgaSArIFwiLnN2Z1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRoZSBjb21wb25lbnQgdXNlZCB0byByZW5kZXIgZWFjaCBsYWJlbFxuICAgICAgICBsZXQgdGV4dExhYmVsID0gZmNcbiAgICAgICAgICAgIC5sYXlvdXRUZXh0TGFiZWwoKVxuICAgICAgICAgICAgLnBhZGRpbmcobGFiZWxQYWRkaW5nKVxuICAgICAgICAgICAgLnZhbHVlKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5wcm9wZXJ0aWVzLm5hbWU7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBsZXQgc3RyYXRlZ3kgPSBmYy5sYXlvdXRHcmVlZHkoKTtcblxuICAgICAgICAvLyBjcmVhdGUgdGhlIGxheW91dCB0aGF0IHBvc2l0aW9ucyB0aGUgbGFiZWxzXG4gICAgICAgIGxldCBsYWJlbHMgPSBmY1xuICAgICAgICAgICAgLmxheW91dExhYmVsKHN0cmF0ZWd5KVxuICAgICAgICAgICAgLnNpemUoZnVuY3Rpb24oXywgaSwgZykge1xuICAgICAgICAgICAgICAgIC8vIG1lYXN1cmUgdGhlIGxhYmVsIGFuZCBhZGQgdGhlIHJlcXVpcmVkIHBhZGRpbmdcbiAgICAgICAgICAgICAgICBsZXQgdGV4dFNpemUgPSBkM1xuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0KGdbaV0pXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3QoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgICAgIC5ub2RlKClcbiAgICAgICAgICAgICAgICAgICAgLmdldEJCb3goKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3RleHRTaXplLndpZHRoLCB0ZXh0U2l6ZS5oZWlnaHRdO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5wb3NpdGlvbihmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5hUHJvamVjdGlvbihkLmdlb21ldHJ5LmNvb3JkaW5hdGVzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY29tcG9uZW50KHRleHRMYWJlbCk7XG5cbiAgICAgICAgLy8gcmVuZGVyIVxuICAgICAgICBnUG9ydHMgPSBuYVN2Z1xuICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5kYXR1bShuYVBvcnRzLmZlYXR1cmVzKVxuICAgICAgICAgICAgLmNhbGwobGFiZWxzKTtcblxuICAgICAgICAvLyBQb3J0IHRleHQgY29sb3VyXG4gICAgICAgIGdQb3J0c1xuICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5sYWJlbCB0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcImR4XCIsIDEwKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgbGV0IGY7XG4gICAgICAgICAgICAgICAgaWYgKCFkLnByb3BlcnRpZXMuc2hhbGxvdyAmJiAhZC5wcm9wZXJ0aWVzLmNvdW50eUNhcGl0YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZiA9IFwibmEtcG9ydC1pblwiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGYgPSBcIm5hLXBvcnQtb3V0XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgZ1BvcnRzLnNlbGVjdEFsbChcIi5sYWJlbCByZWN0XCIpLmF0dHIoXCJjbGFzc1wiLCBcImxhYmVsLXJlY3RcIik7XG5cbiAgICAgICAgLy8gUG9ydCBjaXJjbGUgY29sb3VyIGFuZCBzaXplXG4gICAgICAgIGdQb3J0c1xuICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5sYWJlbCBjaXJjbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaWRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcInBcIiArIGQucHJvcGVydGllcy5pZDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInJcIiwgMTApXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcInVybCgjXCIgKyBkLnByb3BlcnRpZXMubmF0aW9uICsgXCIpXCI7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICBkM1xuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZGF0YS10b2dnbGVcIiwgXCJ0b29sdGlwXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidGl0bGVcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5hVG9vbHRpcERhdGEoZC5wcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJChcIiNwXCIgKyBkLnByb3BlcnRpZXMuaWQpXG4gICAgICAgICAgICAgICAgICAgIC50b29sdGlwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDEwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2VtZW50OiBcImF1dG9cIlxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAudG9vbHRpcChcInNob3dcIik7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICQoXCIjcFwiICsgZC5wcm9wZXJ0aWVzLmlkKS50b29sdGlwKFwiaGlkZVwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5hVG9vbHRpcERhdGEoZCkge1xuICAgICAgICBsZXQgaDtcbiAgICAgICAgaCA9IFwiPHRhYmxlPjx0Ym9keTx0cj48dGQ+PGkgY2xhc3M9J2ZsYWctaWNvbiBcIiArIGQubmF0aW9uICsgXCInPjwvaT48L3RkPlwiO1xuICAgICAgICBoICs9IFwiPHRkIGNsYXNzPSdwb3J0LW5hbWUnPlwiICsgZC5uYW1lICsgXCI8L3RkPjwvdHI+PC90Ym9keT48L3RhYmxlPlwiO1xuICAgICAgICBoICs9IFwiPHA+XCIgKyAoZC5zaGFsbG93ID8gXCJTaGFsbG93XCIgOiBcIkRlZXBcIik7XG4gICAgICAgIGggKz0gXCIgd2F0ZXIgcG9ydFwiO1xuICAgICAgICBpZiAoZC5jb3VudHlDYXBpdGFsKSB7XG4gICAgICAgICAgICBoICs9IFwiLCBjb3VudHkgY2FwaXRhbFwiO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZC5ub25DYXB0dXJhYmxlKSB7XG4gICAgICAgICAgICBoICs9IFwiLCBcIiArIGQuYnJMaW1pdCArIFwiIEJSIGxpbWl0XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBoICs9IFwiLCBub3QgY2FwdHVyYWJsZVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkLmNhcHR1cmVyKSB7XG4gICAgICAgICAgICBoICs9IFwiLCBvd25lZCBieSBcIiArIGQuY2FwdHVyZXI7XG4gICAgICAgIH1cbiAgICAgICAgaCArPSBcIjwvcD5cIjtcbiAgICAgICAgaCArPSBcIjx0YWJsZSBjbGFzcz0ndGFibGUgdGFibGUtc20nPlwiO1xuICAgICAgICBpZiAoZC5wcm9kdWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGggKz0gXCI8dHI+PHRkPlByb2R1Y2VzPC90ZD48dGQ+XCIgKyBkLnByb2R1Y2VzLmpvaW4oXCIsIFwiKSArIFwiPC90ZD48L3RyPlwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkLmRyb3BzLmxlbmd0aCkge1xuICAgICAgICAgICAgaCArPSBcIjx0cj48dGQ+RHJvcHM8L3RkPjx0ZD5cIiArIGQuZHJvcHMuam9pbihcIiwgXCIpICsgXCI8L3RyPlwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkLmNvbnN1bWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgaCArPSBcIjx0cj48dGQ+Q29uc3VtZXM8L3RkPjx0ZD5cIiArIGQuY29uc3VtZXMuam9pbihcIiwgXCIpICsgXCI8L3RyPlwiO1xuICAgICAgICB9XG4gICAgICAgIGggKz0gXCI8L3RhYmxlPlwiO1xuXG4gICAgICAgIHJldHVybiBoO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5hRGlzcGxheVRlbGVwb3J0QXJlYXMoKSB7XG4gICAgICAgIC8vIEV4dHJhY3QgcG9ydCBjb29yZGluYXRlc1xuICAgICAgICBsZXQgcG9ydHMgPSBuYVBvcnRzLmZlYXR1cmVzXG4gICAgICAgICAgICAvLyBVc2Ugb25seSBwb3J0cyB0aGF0IGRlZXAgd2F0ZXIgcG9ydHMgYW5kIG5vdCBhIGNvdW50eSBjYXBpdGFsXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWQucHJvcGVydGllcy5zaGFsbG93ICYmICFkLnByb3BlcnRpZXMuY291bnR5Q2FwaXRhbDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvLyBNYXAgdG8gY29vcmRpbmF0ZXMgYXJyYXlcbiAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbZC5nZW9tZXRyeS5jb29yZGluYXRlc1swXSwgZC5nZW9tZXRyeS5jb29yZGluYXRlc1sxXV07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBBcHBlbmQgZ3JvdXAgd2l0aCBjbGFzcyAudm9yb25vaVxuICAgICAgICBnVm9yb25vaSA9IG5hU3ZnXG4gICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInZvcm9ub2lcIilcbiAgICAgICAgICAgIC5jYWxsKG5hWm9vbSlcbiAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIudm9yb25vaVwiKVxuICAgICAgICAgICAgLmRhdGEocG9ydHMpXG4gICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgLmFwcGVuZChcImdcIik7XG5cbiAgICAgICAgLy8gbGltaXQgaG93IGZhciBhd2F5IHRoZSBtb3VzZSBjYW4gYmUgZnJvbSBmaW5kaW5nIGEgdm9yb25vaSBzaXRlXG4gICAgICAgIGNvbnN0IHZvcm9ub2lSYWRpdXMgPSBuYVdpZHRoIC8gMTA7XG4gICAgICAgIGNvbnN0IG5hVm9yb25vaSA9IGQzLnZvcm9ub2koKS5leHRlbnQoW1stMSwgLTFdLCBbbmFXaWR0aCArIDEsIG5hSGVpZ2h0ICsgMV1dKTtcbiAgICAgICAgY29uc3QgbmFWb3Jvbm9pRGlhZ3JhbSA9IG5hVm9yb25vaShwb3J0cy5tYXAobmFQcm9qZWN0aW9uKSk7XG5cbiAgICAgICAgLy8gRHJhdyB0ZWxlcG9ydCBhcmVhc1xuICAgICAgICBnVm9yb25vaVxuICAgICAgICAgICAgLmFwcGVuZChcInBhdGhcIilcbiAgICAgICAgICAgIC5kYXRhKG5hVm9yb25vaS5wb2x5Z29ucyhwb3J0cy5tYXAobmFQcm9qZWN0aW9uKSkpXG4gICAgICAgICAgICAuYXR0cihcImlkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ2XCIgKyBkLmlkO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQgPyBcIk1cIiArIGQuY29vcmQuam9pbihcIkxcIikgKyBcIlpcIiA6IG51bGw7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJwb2ludGVyLWV2ZW50c1wiLCBcInZpc2libGVGaWxsXCIpXG4gICAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgIC8vIGdldCB0aGUgY3VycmVudCBtb3VzZSBwb3NpdGlvblxuICAgICAgICAgICAgICAgIGxldCByZWYgPSBjdXJyZW50RDNtb3VzZSh0aGlzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBteCA9IHJlZlswXSxcbiAgICAgICAgICAgICAgICAgICAgbXkgPSByZWZbMV07XG5cbiAgICAgICAgICAgICAgICAvLyB1c2UgdGhlIG5ldyBkaWFncmFtLmZpbmQoKSBmdW5jdGlvbiB0byBmaW5kIHRoZSB2b3Jvbm9pIHNpdGUgY2xvc2VzdCB0b1xuICAgICAgICAgICAgICAgIC8vIHRoZSBtb3VzZSwgbGltaXRlZCBieSBtYXggZGlzdGFuY2UgZGVmaW5lZCBieSB2b3Jvbm9pUmFkaXVzXG4gICAgICAgICAgICAgICAgY29uc3Qgc2l0ZSA9IG5hVm9yb25vaURpYWdyYW0uZmluZChteCwgbXksIHZvcm9ub2lSYWRpdXMpO1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJzaXRlOiBcIiArIHNpdGUuaW5kZXgpO1xuICAgICAgICAgICAgICAgIG5hQ3VycmVudFZvcm9ub2kgPSBnVm9yb25vaS5fZ3JvdXBzWzBdW3NpdGUuaW5kZXhdO1xuICAgICAgICAgICAgICAgIG5hQ3VycmVudFZvcm9ub2kuY2xhc3NMaXN0LmFkZChcImhpZ2hsaWdodC12b3Jvbm9pXCIpO1xuICAgICAgICAgICAgICAgIC8vIGhpZ2hsaWdodCB0aGUgcG9pbnQgaWYgd2UgZm91bmQgb25lLCBvdGhlcndpc2UgaGlkZSB0aGUgaGlnaGxpZ2h0IGNpcmNsZVxuICAgICAgICAgICAgICAgIC8vbmFWb3Jvbm9pSGlnaGxpZ2h0KHNpdGUuZGF0YSwgc2l0ZS5pbmRleCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gaGlkZSB0aGUgaGlnaGxpZ2h0IGNpcmNsZSB3aGVuIHRoZSBtb3VzZSBsZWF2ZXMgdGhlIGNoYXJ0XG4gICAgICAgICAgICAgICAgLy9uYVZvcm9ub2lIaWdobGlnaHQobnVsbCk7XG4gICAgICAgICAgICAgICAgbmFDdXJyZW50Vm9yb25vaS5jbGFzc0xpc3QucmVtb3ZlKFwiaGlnaGxpZ2h0LXZvcm9ub2lcIik7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBjYWxsYmFjayB0byBoaWdobGlnaHQgYSBwb2ludFxuICAgIGZ1bmN0aW9uIG5hVm9yb25vaUhpZ2hsaWdodChkLCBpZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImQ6IFwiICsgZCk7XG4gICAgICAgIC8vIG5vIHBvaW50IHRvIGhpZ2hsaWdodCAtIGhpZGUgdGhlIGNpcmNsZSBhbmQgY2xlYXIgdGhlIHRleHRcbiAgICAgICAgaWYgKCFkKSB7XG4gICAgICAgICAgICBkMy5zZWxlY3QoXCIjcFwiICsgaWQpLmF0dHIoXCJyXCIsIDEwKTtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgc2hvdyB0aGUgaGlnaGxpZ2h0IGNpcmNsZSBhdCB0aGUgY29ycmVjdCBwb3NpdGlvblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZDNcbiAgICAgICAgICAgICAgICAuc2VsZWN0KFwiI3BcIiArIGlkKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgXCJcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcInJcIiwgMzApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbmFSZWFkeShlcnJvciwgbmFNYXApIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlYWQgbWFwIGRhdGFcbiAgICAgICAgbmFDb3VudHJpZXMgPSB0b3BvanNvbi5mZWF0dXJlKG5hTWFwLCBuYU1hcC5vYmplY3RzLmNvdW50cmllcyk7XG4gICAgICAgIG5hUG9ydHMgPSB0b3BvanNvbi5mZWF0dXJlKG5hTWFwLCBuYU1hcC5vYmplY3RzLnBvcnRzKTtcblxuICAgICAgICBuYVNldHVwUHJvamVjdGlvbigpO1xuICAgICAgICBuYVNldHVwQ2FudmFzKCk7XG5cbiAgICAgICAgbmFEaXNwbGF5VGVsZXBvcnRBcmVhcygpO1xuICAgICAgICBuYURpc3BsYXlDb3VudHJpZXMoKTtcbiAgICAgICAgbmFEaXNwbGF5UG9ydHMoKTtcbiAgICB9XG5cbiAgICBkM1xuICAgICAgICAucXVldWUoKVxuICAgICAgICAuZGVmZXIoZDMuanNvbiwgbmFNYXBKc29uKVxuICAgICAgICAuYXdhaXQobmFSZWFkeSk7XG59XG5cblxuXG4vLyBXRUJQQUNLIEZPT1RFUiAvL1xuLy8gLi9qcy9uYS1kaXNwbGF5LmpzIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///133\n");

/***/ })

})