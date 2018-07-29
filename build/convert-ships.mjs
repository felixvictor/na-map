import { readJson, saveJson } from "./common.mjs";

const inBaseFilename = process.argv[2],
    outFilename = process.argv[3],
    date = process.argv[4];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`),
    constA = 0.076752029372859,
    constB = 0.007759512279223;

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertShips() {
    const geoJson = {},
        cannonWeight = [0, 42, 32, 24, 18, 12, 9, 0, 6, 4, 4, 2],
        carroWeight = [0, 0, 68, 42, 32, 24, 0, 18, 12];
    geoJson.shipData = [];

    APIItems.filter(item => item.ItemType === "Ship").forEach(ship => {
        const calcPortSpeed = ship.Specs.MaxSpeed * constA - constB,
            speedDegrees = ship.Specs.SpeedToWind.map(d => Math.round(d * calcPortSpeed * 1000) / 1000);

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
            upgradeXP: ship.OverrideTotalXpForUpgradeSlots,
            hostilityScore: ship.HostilityScore
        };
        // Delete mortar entry
        shipData.gunsPerDeck.pop();
        shipData.guns = 0;
        shipData.cannonBroadside = 0;
        shipData.carroBroadside = 0;
        let t = [0, 0];
        for (let i = 0; i < 4; i += 1) {
            if (shipData.deckClassLimit[i]) {
                shipData.guns += shipData.gunsPerDeck[i];
                if (shipData.deckClassLimit[i][1]) {
                    shipData.carroBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][1]) / 2;
                } else {
                    shipData.carroBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][0]) / 2;
                }
                shipData.cannonBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][0]) / 2;
            } else {
                shipData.deckClassLimit.push(t);
            }
        }

        if (ship.FrontDecks) {
            t = ship.FrontDeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ])[0];
        }
        shipData.deckClassLimit.push(t);
        t = [0, 0];
        if (ship.BackDecks) {
            t = ship.BackDeckClassLimit.map(deck => [
                cannonWeight[deck.Limitation1.Min],
                carroWeight[deck.Limitation2.Min]
            ])[0];
        }
        shipData.deckClassLimit.push(t);
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

    saveJson(outFilename, geoJson);
}

convertShips();
