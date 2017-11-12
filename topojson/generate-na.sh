#! /bin/bash

# W  Tampico      lat 22.23 long -97.86
# S  Dariena      lat  7.91 long -76-73
# E  Barbados     lat 13.19 long -59.48
# N Swannsborough lat 34.69 long -77.12

OUT=na.json
IN_PORTS=ports.geojson

$(yarn bin)/geo2topo \
	   -o ${OUT} \
	   ${IN_PORTS}

for SERVER_NAME in "eu1" "eu2" "us2"; do
    cp "${OUT}" "${SERVER_NAME}.json"
done

rm -f ${OUT}
