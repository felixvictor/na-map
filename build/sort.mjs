import { readJson, saveJsonAsync } from "./common.mjs";

const dates = ["2018-06-18", "2018-06-23"];

function sortData(fileName) {
    const data = readJson(`api-eu1-${fileName}.json`);
    data.sort((a, b) => parseInt(a.Id, 10) - parseInt(b.Id, 10));
    saveJsonAsync(`${fileName}.json`, data);
}

dates.forEach(date => ["ItemTemplates", "Ports", "Shops"].forEach(type => sortData(`${type}-${date}`)));
