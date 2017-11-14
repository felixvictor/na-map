#! /bin/bash

# W  Tampico      lat 22.23 long -97.86
# S  Dariena      lat  7.91 long -76-73
# E  Barbados     lat 13.19 long -59.48
# N Swannsborough lat 34.69 long -77.12

OUT_PORTS=na.json
OUT_PB_ZONES=pb.json
IN_PORTS=ports.geojson

$(yarn bin local)/geo2topo \
	   -o ${OUT_PORTS} \
	   ${IN_PORTS}

$(yarn bin local)/geo2topo --verbose \
	   -o ${OUT_PB_ZONES} \
	   pbzones.json \
	   towers.json \
	   forts.json

for SERVER_NAME in "eu1" "eu2" "us2"; do
    cp --update "${OUT_PORTS}" "${SERVER_NAME}.json"
done
cp --update "${OUT_PB_ZONES}" ../public

rm -f "${OUT_PORTS}" "${OUT_PB_ZONES}"
