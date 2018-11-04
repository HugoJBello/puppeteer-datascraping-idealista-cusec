const ConvertCsvRawFilesToJson = require('../ConvertCsvRawFilesToJson');
const fs = require('fs');
const config = require("../scraping_config.json");

(async () => {
    const converter = new ConvertCsvRawFilesToJson('../csv_polylines_municipios', "../json_polylines_municipios");
    const date = new Date().toLocaleString().replace(/:/g, '_').replace(/ /g, '_').replace(/\//g, '_');


    const sessionId = "scraping" + "----" + date;
    config.sessionId = sessionId;
    fs.writeFileSync('../scraping_config.json', JSON.stringify(config));

    if (!fs.existsSync("../tmp/" + sessionId)) {
        fs.mkdirSync("../tmp/" + sessionId);
    }
    await converter.convert();
})()