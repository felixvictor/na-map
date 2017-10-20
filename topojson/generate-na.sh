#! /bin/bash

# ogrinfo -geom=summary natural_earth/50m_cultural/ne_50m_admin_0_map_units.shp ne_50m_admin_0_map_units > ne_50m_admin_0_map_units.txt

# Auflösung 10m, 50m oder 110m
RES=10m

DIR="/home/ibey/src/topojson/natural_earth"

IN_SHP_COUNTRIES=${DIR}/${RES}/ne_${RES}_admin_0_countries.shp

# W  Tampico      lat 22.23 long -97.86
# S  Dariena      lat  7.91 long -76-73
# E  Barbados     lat 13.19 long -59.48
# N Swannsborough lat 34.69 long -77.12
CLIP="-98 7.5 -59 35"

OUT=na.json
OUT_COUNTRIES=countries.geojson
OUT_SHP_COUNTRIES=countries.shp
IN_PORTS=ports.geojson

rm -f ${OUT_COUNTRIES}

ogr2ogr \
	-clipsrc ${CLIP} \
	${OUT_SHP_COUNTRIES} ${IN_SHP_COUNTRIES} 

$(yarn bin)/shp2json \
	   --newline-delimited \
	   ${OUT_SHP_COUNTRIES} | \
    $(yarn bin)/ndjson-filter 'delete d.properties, true' | \
    $(yarn bin)/ndjson-reduce 'p.features.push(d), p' '{type: "FeatureCollection", features: []}' \
	   > ${OUT_COUNTRIES}


$(yarn bin)/geo2topo \
	   -o ${OUT}1 \
	   ${OUT_COUNTRIES} \
	   ${IN_PORTS}

$(yarn bin)/topoquantize \
	   -o ../public/${OUT} \
	   1e4 \
	   ${OUT}1

rm -f ${OUT}1 ${OUT}2
