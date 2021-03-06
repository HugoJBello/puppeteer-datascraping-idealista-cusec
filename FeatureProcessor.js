
const fs = require('fs');
const encode = require('geojson-polyline').encode


module.exports = class FeatureProcessor {
    constructor(mapDir = "./data/maps/", outputDir = "./data/separatedFeatures/") {
        this.nMuns = ["Madrid", "Móstoles", "Alcalá de Henares",
            "Fuenlabrada", "Leganés", "Getafe",
            "Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas",
            "Las Rozas de Madrid", "San Sebastián de los Reyes",
            "Pozuelo de Alarcón", "Coslada", "Rivas-Vaciamadrid",
            "Valdemoro", "Majadahonda", "Collado Villalba", "Aranjuez",
            "Arganda del Rey", "Boadilla del Monte", "Pinto", "Colmenar Viejo",
            "Tres Cantos", "San Fernando de Henares", "Galapagar", "Arroyomolinos",
            "Villaviciosa de Odón", "Navalcarnero", "Ciempozuelos", "Torrelodones",
            "Paracuellos de Jarama", "Mejorada del Campo", "Algete"]
        this.foundFeatures = {};
        this.scrapingIndex = {};
        this.fileContents = fs.readFileSync(mapDir + "SECC_CPV_E_20111101_01_R_INE_MADRID_cs_epsg.geojson.json", 'utf8');
        this.geoJson = JSON.parse(this.fileContents);

        this.outputDir = outputDir;
        this.outputFilenameFeatures = this.outputDir + "separatedFeatures.json";
        this.outputFilenameIndex = this.outputDir + "scrapingIndex.json";
    }

    processAllFeaturesAndCreateIndex() {
        this.generateProcessedFeaturesAndIndex();
        this.saveInFile();
        //console.log(this.foundFeatures);
    }

    generateProcessedFeaturesAndIndex() {
        for (let feature of this.geoJson["features"]) {
            if (this.nMuns.includes(feature.properties["NMUN"])) {
                let procFeature = this.processFeature(feature);
                if (feature.properties["NMUN"] in this.foundFeatures) {
                    this.foundFeatures[feature.properties["NMUN"]][procFeature.cusec] = procFeature;
                    this.scrapingIndex[feature.properties["NMUN"]][procFeature.cusec] = false;
                } else {
                    this.foundFeatures[feature.properties["NMUN"]] = {};
                    this.scrapingIndex[feature.properties["NMUN"]] = {};
                    this.foundFeatures[feature.properties["NMUN"]][procFeature.cusec] = procFeature;
                    this.scrapingIndex[feature.properties["NMUN"]][procFeature.cusec] = false;

                }
            }
        }
    }

    processFeature(feature) {
        let processedFeature = {};
        processedFeature["nmun"] = feature.properties["NMUN"];
        processedFeature["cusec"] = feature.properties["CUSEC"];
        //processedFeature["coordinates"] = feature["geometry"].coordinates;
        processedFeature["type"] = feature["geometry"].type;
        const polyline = this.getPolyline(feature["geometry"]);
        processedFeature["polylineEncoded"] = polyline;
        return processedFeature;

    }


    getPolyline(geojson) {
        const polylineEncoded = encode(geojson)["coordinates"];
        const polylineEncodedPreURL = "((" + polylineEncoded + "))";
        const urlEncoded = encodeURIComponent(polylineEncodedPreURL)
        console.log(urlEncoded);
        return urlEncoded;
    }

    saveInFile() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir);
        }
        fs.writeFileSync(this.outputFilenameFeatures, JSON.stringify(this.foundFeatures));
        fs.writeFileSync(this.outputFilenameIndex, JSON.stringify(this.scrapingIndex));

    }
}


