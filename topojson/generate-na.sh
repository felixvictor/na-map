#! /bin/bash

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
OUT_SHP=countries.shp
OUT_SQL=countries.sqlite
IN_PORTS=ports.geojson

rm -f ${OUT_COUNTRIES}

$(yarn bin)/geo2topo \
	   -o ${OUT}1 \
	   ${IN_PORTS}

$(yarn bin)/topoquantize \
	   -o ${OUT} \
	   1e4 \
	   ${OUT}1

for SERVER_NAME in "eu1" "eu2" "us2"; do
    cp "${OUT}" "${SERVER_NAME}.json"
done

rm -f ${OUT} ${OUT}1 ${OUT_SQL}
