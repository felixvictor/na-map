import fs from "fs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const APIItems = JSON.parse(fs.readFileSync(`${inBaseFilename}-ItemTemplates-${date}.json`, "utf8")),
    constA = 0.076752029372859,
    constB = 0.007759512279223;

function saveJson(data) {
    // eslint-disable-next-line consistent-return
    fs.writeFile(outFilename, JSON.stringify(data), "utf8", err => {
        if (err) {
            return console.log(err);
        }
    });
}

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertShips() {
    const geoJson = {},
        cannonWeight = [0, 42, 32, 24, 18, 12, 9, 6, 4],
        carroWeight = [0, 0, 68, 42, 32, 24, 18, 12];
    geoJson.shipData = [];

    APIItems.filter(item => item.ItemType === "Ship").forEach(ship => {
        const calcPortSpeed = ship.Specs.MaxSpeed * constA - constB,
            speedDegrees = ship.Specs.SpeedToWind.map(d => d * calcPortSpeed);

        const { length } = ship.Specs.SpeedToWind;
        // Elemente kopieren
        for (let i = 1; i < (length - 1) * 2; i += 2) {
            speedDegrees.unshift(speedDegrees[i]);
        }
        // Dann letztes Element löschen
        speedDegrees.pop();

        const shipData = {
            id: ship.Id,
            name: ship.Name.replace("L'Ocean", "L'Océan").replaceAll("'", "’"),
            class: ship.Class,
            healthInfo: ship.HealthInfo,
            gunsPerDeck: ship.GunsPerDeck,
            deckClassLimit: ship.DeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ]),
            frontDeckClassLimit: ship.FrontDeckClassLimit,
            backDeckClassLimit: ship.BackDeckClassLimit,
            shipMass: ship.ShipMass,
            battleRating: ship.BattleRating,
            decks: ship.Decks,
            holdSize: ship.HoldSize,
            maxWeight: ship.MaxWeight,
            minCrewRequired: ship.MinCrewRequired,
            minSpeed: speedDegrees.reduce((a, b) => Math.min(a, b)),
            maxSpeed: speedDegrees.reduce((a, b) => Math.max(a, b)),
            speedDegrees,
            maxTurningSpeed: ship.Specs.MaxTurningSpeed,
            // captureType: ship.CaptureType,
            upgradeXP: ship.OverrideTotalXpForUpgradeSlots,
            // hostilityScore: ship.HostilityScore
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
