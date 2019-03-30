import { sortBy, readJson, roundToThousands, saveJson, speedConstA, speedConstB } from "./common.mjs";

const inBaseFilename = process.argv[2];
const outFilename = process.argv[3];
const date = process.argv[4];

const APIItems = readJson(`${inBaseFilename}-ItemTemplates-${date}.json`);

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

function convertShips() {
    const cannonWeight = [0, 42, 32, 24, 18, 12, 9, 0, 6, 4, 4, 2];
    const carroWeight = [0, 0, 68, 42, 32, 24, 0, 18, 12];
    const ships = [];

    APIItems.filter(item => item.ItemType === "Ship").forEach(ship => {
        const calcPortSpeed = ship.Specs.MaxSpeed * speedConstA - speedConstB;
        const speedDegrees = ship.Specs.SpeedToWind.map(speed => roundToThousands(speed * calcPortSpeed));
        const { length } = ship.Specs.SpeedToWind;

        // Elemente kopieren
        for (let i = 1; i < (length - 1) * 2; i += 2) {
            speedDegrees.unshift(speedDegrees[i]);
        }

        // Dann letztes Element löschen
        speedDegrees.pop();

        const shipData = {
            id: ship.Id,
            name: ship.Name.replace("u00E4", "ä")
                .replace("L'Ocean", "L'Océan")
                .replaceAll("'", "’"),
            class: ship.Class,
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
            crew: { min: ship.MinCrewRequired, max: ship.HealthInfo.Crew },
            speedDegrees,
            speed: {
                min: speedDegrees.reduce((a, b) => Math.min(a, b)),
                max: calcPortSpeed
            },
            sides: { armour: ship.HealthInfo.LeftArmor },
            bow: { armour: ship.HealthInfo.FrontArmor },
            stern: { armour: ship.HealthInfo.BackArmor },
            structure: { armour: ship.HealthInfo.InternalStructure },
            sails: { armour: ship.HealthInfo.Sails },
            pump: { armour: ship.HealthInfo.Pump },
            rudder: {
                armour: ship.HealthInfo.Rudder
            },
            upgradeXP: ship.OverrideTotalXpForUpgradeSlots
            // hostilityScore: ship.HostilityScore
        };
        // Delete mortar entry
        shipData.gunsPerDeck.pop();
        shipData.guns = 0;
        let cannonBroadside = 0;
        let carronadesBroadside = 0;
        let t = [0, 0];
        for (let i = 0; i < 4; i += 1) {
            if (shipData.deckClassLimit[i]) {
                shipData.guns += shipData.gunsPerDeck[i];
                if (shipData.deckClassLimit[i][1]) {
                    carronadesBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][1]) / 2;
                } else {
                    carronadesBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][0]) / 2;
                }

                cannonBroadside += (shipData.gunsPerDeck[i] * shipData.deckClassLimit[i][0]) / 2;
            } else {
                shipData.deckClassLimit.push(t);
            }
        }

        shipData.broadside = { cannons: cannonBroadside, carronades: carronadesBroadside };

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
        ships.push(shipData);
    });

    ships.sort(sortBy(["class", "name"]));
    saveJson(outFilename, ships);
}

convertShips();
