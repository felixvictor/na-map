import fs from "fs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const APIItems = JSON.parse(fs.readFileSync(`${inBaseFilename}-ItemTemplates-${date}.json`, "utf8")),;

function saveJson(data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(outFilename, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

function convertShips() {
    const geoJson = {};
    geoJson.shipData = [];

    APIItems.filter(item => item.ItemType === "Ship").forEach(ship => {
        const calcPortSpeed = ship.Specs.MaxSpeed * 0.076752029372859 - 0.007759512279223,
            speedDegrees = ship.Specs.SpeedToWind.map(d => d * calcPortSpeed);

        const length = ship.Specs.SpeedToWind.length;
        // Elemente kopieren
        for (let i = 0; i < (length - 1) * 2; i += 2) {
            speedDegrees.unshift(speedDegrees[i]);
        }
        // Letztes Element nach vorne stellen
        speedDegrees.unshift(speedDegrees[length * 2 - 1 - 1]);
        // Dann letztes Element löschen
        speedDegrees.pop();

        const shipData = {
            id: ship.Id,
            name: ship.Name.replace("'", "’"),
            class: ship.Class,
            healthInfo: ship.HealthInfo,
            shipMass: ship.ShipMass,
            battleRating: ship.BattleRating,
            decks: ship.Decks,
            holdSize: ship.HoldSize,
            maxWeight: ship.MaxWeight,
            minCrewRequired: ship.MinCrewRequired,
            minSpeed: speedDegrees.reduce((a, b) => Math.min(a, b)),
            maxSpeed: speedDegrees.reduce((a, b) => Math.max(a, b)),
            speedDegrees
        };
        geoJson.shipData.push(shipData);
    });

    geoJson.shipData.sort((a, b) => {
        if (a.class < b.class) {
            return -1;
        }
        if (a.class > b.class) {
            return 1;
        }
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });

    saveJson(geoJson);
}

convertShips();
