const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const fs = require('fs');
const Apify = require('apify');
const randomUA = require('modern-random-ua');

require('dotenv').load();


module.exports = class ScrapperIdealistaPuppeteer {
    constructor() {
        this.outputTempDir = "tmp/";
        this.config = require("./data/config/scrapingConfig.json");
        this.timoutTimeSearches = 1000;
        this.timoutTimeCapchaDetected = 5 * 60 * 1000;
        this.sessionId = this.config.sessionId;
        this.MongoClient = require('mongodb').MongoClient;
        this.separatedFeatures = require("./data/separatedFeatures/separatedFeatures.json");
        this.scrapingIndexPath = "./data/separatedFeatures/scrapingIndex.json";
        this.scrapingIndex = require(this.scrapingIndexPath);
        this.tmpDir = "data/tmp/"
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync("./" + this.tmpDir);
        }
        this.date = "";
        this.browser = null;
        this.page = null;
    }


    initializeSession() {
        this.date = new Date().toLocaleString().replace(/:/g, '_').replace(/ /g, '_').replace(/\//g, '_');
        this.outputTempDir = this.outputTempDir + this.sessionId + "/";
        this.sessionId = this.config.sessionId;
        console.log("\n-------------------------------------------------------");
        console.log("starting execution " + this.sessionId);
        console.log("\n-------------------------------------------------------");

    }

    main() {
        Apify.main(async () => {
            this.initializeSession();
            console.log(this.date);

            for (let nmun in this.separatedFeatures) {
                console.log("-----------------------\n Scraping data from " + nmun + "\n-----------------------");
                let municipioResults = this.initializeMunicipio(nmun);
                for (let cusecName in this.separatedFeatures[nmun]) {
                    this.initializeConfigAndIndex();
                    console.log("\n------->" + cusecName)

                    // we only scrap if the index sais so
                    if (!this.scrapingIndex[nmun][cusecName]) {
                        municipioResults = await this.scrapCusecData(cusecName, nmun, municipioResults);
                        this.updateIndex(cusecName, nmun);
                        await this.saveData(municipioResults, nmun);
                    }
                }
            }
            await this.resetIndexAndFinalize();
        });
    }

    initializeMunicipio(nmun) {
        if (!fs.existsSync(this.tmpDirSession)) {
            fs.mkdirSync("./" + this.tmpDirSession);
        }
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".json";
        if (fs.existsSync(nmunPath)) {
            return require("./" + nmunPath);
        } else {
            return { _id: nmun + "---" + this.config.sessionId, nmun: nmun, scrapingId: this.config.sessionId, date: this.date, cusecs: {} };
        }
    }

    async scrapCusecData(cusecName, nmun, municipioResults) {
        await this.initalizePuppeteer();

        if (!this.scrapingIndex[nmun][cusecName]) {
            let continueScraping = true;
            let cusecFeature = this.separatedFeatures[nmun][cusecName];

            let cusecData;
            while (continueScraping) {
                let capchaFound = false;

                await this.page.setUserAgent(randomUA.generate());
                await this.page.emulate(devices['iPhone 6']);

                cusecData = await this.extractDataAlquilerVenta(cusecFeature);

                await this.page.waitFor(this.timoutTimeSearches);
                console.log(cusecData);
                capchaFound = await this.detectCapcha(cusecData);

                if (!capchaFound) {
                    continueScraping = false;
                }

            }

            municipioResults.cusecs[cusecName] = cusecData;
            await this.saveData(municipioResults, nmun);
            return municipioResults;
        }
    }

    async initalizePuppeteer() {
        if (process.env['RASPBERRY_MODE']) {
            this.browser = await Apify.launchPuppeteer({
                executablePath: '/usr/bin/chromium-browser',
                userAgent: randomUA.generate(),
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else {
            this.browser = await Apify.launchPuppeteer({
                userAgent: randomUA.generate(),
                headless: true,
                args: ['--no-sandbox']
            });
        }
        this.page = await this.browser.newPage();
    }

    async extractDataAlquilerVenta(cusecFeature) {
        const urlVenta = "https://www.idealista.com/en/areas/venta-viviendas/?shape=" + cusecFeature.polylineEncoded;
        console.log("--> venta " + cusecFeature.cusec);
        console.log(urlVenta);

        let data = { fecha: this.date, cusec: cusecFeature.cusec, nmun: cusecFeature.nmun, precio_medio_venta: undefined, numero_anuncios_venta: undefined, precio_medio_alquiler: undefined, numero_anuncios_alquiler: undefined };
        data["_id"] = cusecFeature.cusec + "--" + this.date;
        try {
            const extractedVenta = await this.extractPrize(urlVenta);
            data["precio_medio_venta"] = extractedVenta.averagePrize;
            data["numero_anuncios_venta"] = extractedVenta.numberOfElements;

        } catch (error) {
            console.log("error");
        }
        await this.page.waitFor(this.timoutTimeSearches);

        const urlAlql = "https://www.idealista.com/en/areas/alquiler-viviendas/?shape=" + cusecFeature.polylineEncoded;
        console.log("--> alquiler" + cusecFeature.cusec);
        console.log(urlAlql);

        try {
            const extractedAlql = await this.extractPrize(urlAlql);
            data["precio_medio_alquiler"] = extractedAlql.averagePrize;
            data["numero_anuncios_alquiler"] = extractedAlql.numberOfElements;

        } catch (error) {
            console.log("error");
        }
        return data;
    }

    async extractPrize(urlVenta) {
        await this.page.goto(urlVenta);
        await this.page.screenshot({ path: 'example.png' });
        let averagePrize = '0';
        let numberOfElements = '0';
        if (! await this.detectedNoResultsPage()) {
            const elementPrize = await this.page.$(".items-average-price");
            const text = await this.page.evaluate((element) => element.textContent, elementPrize);
            averagePrize = text.replace("Average price:", "").replace("eur/m²", "").replace(",", "").trim()

            const elementNumber = await this.page.$(".h1-simulated");
            const textNumber = await this.page.evaluate((element) => element.textContent, elementNumber);
            numberOfElements = textNumber.replace(" ", "").trim()
        }
        return { averagePrize: averagePrize, numberOfElements: numberOfElements }
    }

    async  detectedNoResultsPage() {
        let found;
        try {
            const pagetxt = await this.page.content();
            found = pagetxt.indexOf('t found what you are looking', 1) > -1;
            if (found) {
                console.log("no results found");
            }
        } catch (error) {
            return false
        }
        return found;
    }

    saveInCsv(extractedData, json_file) {
        if (json_file) {
            const header = "CUSEC;NMUN;V_VENTA;N_VENTA;V_ALQL;N_ALQL;FECHA\n"
            const outputFilename = "./" + this.outputTempDir + json_file.replace(".json", "_scraped.csv");
            fs.writeFileSync(outputFilename, header);
            for (let data of extractedData.scrapedData) {
                let newLine;
                if (data.cusec) {
                    newLine = data.cusec + ";" + data.nmun + ";" + data.precio_medio_venta + ";" + data.numero_anuncios_venta + ";" + data.precio_medio_alquiler + ";" + data.numero_anuncios_alquiler + ";" + data.fecha + "\n";
                    fs.appendFileSync(outputFilename, newLine);

                }
            }
        }
    }

    async detectCapcha(data) {
        let found = false;
        if (!data.precio_medio_venta && !data.precio_medio_alquiler) {
            try {
                const pagetxt = await this.page.content();
                found = pagetxt.indexOf('Vaya! parece que estamos recibiendo muchas peticiones', 1) > -1;
                if (found) {
                    console.log("--------------------\n Captcha ha saltado!")
                    console.log("esperando...");
                    await this.page.waitFor(this.timoutTimeCapchaDetected);
                    await this.initalizePuppeteer();

                }
            } catch (error) {
                return false
            }
        }
        return found;
    }


    initializeConfigAndIndex() {
        this.config = require("./data/config/scrapingConfig.json");
        this.scrapingIndex = require("./data/separatedFeatures/scrapingIndex.json");
        this.tmpDirSession = "data/tmp/" + this.config.sessionId;
    }

    async saveData(municipioResults, nmun) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".json";
        fs.writeFileSync(nmunPath, JSON.stringify(municipioResults));
        if (this.config.useMongoDb) {
            await this.saveDataInMongo(municipioResults, nmun);
        }
    }

    async saveDataInMongo(municipioResults, nmun) {
        await this.MongoClient.connect(this.config.mongoUrl, function (err, client) {
            const db = "idealista-db";
            const collectionName = "summaries-idealista-scraping";
            console.log("saving data in mongodb");
            const collection = client.db(db).collection(collectionName);
            collection.save(municipioResults);
            client.close();
        });
    }

    saveDataAsCSV(municipioResults, nmun) {
        let nmunPath = this.tmpDirSession + "/" + nmun + "---" + this.config.sessionId + ".csv";
        const header = "CUSEC;NMUN;N_ANUN;P_MEDIO;FECHA\n"

    }

    updateIndex(cusecName, nmun) {
        this.scrapingIndex[nmun][cusecName] = true;
        fs.writeFileSync(this.scrapingIndexPath, JSON.stringify(this.scrapingIndex));
    }

    resetIndexAndFinalize() {
        const FeatureProcessor = require('./FeatureProcessor');
        const featureProcessor = new FeatureProcessor();
        featureProcessor.processAllFeaturesAndCreateIndex();
        this.date = new Date().toLocaleString().replace(/:/g, '_').replace(/ /g, '_').replace(/\//g, '_');
        this.config.scrapingId = "scraping--idealista--" + this.date;
        fs.writeFileSync("./data/config/scrapingConfig.json", JSON.stringify(this.config));
    }

}


