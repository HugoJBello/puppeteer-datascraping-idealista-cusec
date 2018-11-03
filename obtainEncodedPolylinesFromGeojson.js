//const polyline = require('@mapbox/polyline');
//var polyline = require( 'google-polyline' )
const encode = require('geojson-polyline').encode

const outputFilename = "encoded_polylines_madrid.csv";
const header = "CUSEC;NMUN;POLYLINE;POLYLINEPREURL;URLENCODED\n";
const fs = require('fs')
fs.writeFileSync(outputFilename,header);

const directory = 'geoJson_output'
const files = fs.readdirSync(directory);
files.forEach((file)=> {
    const cusec = file.split("__")[0];
    const nmun = file.split("__")[1];
    const geojson= require("./" + directory + "/" + file);
    //const polylineEncoded = polyline.fromGeoJSON(pointsArray2)
    const polylineEncoded = encode(geojson)["coordinates"];
    console.log(polylineEncoded);
    console.log("\n-----");
    console.log(file);
    console.log("-----");
    console.log(polylineEncoded);
    const polylineEncodedPreURL = "((" + polylineEncoded + "))";
    const urlEncoded =  encodeURIComponent(polylineEncodedPreURL)
    const newLine = cusec + ";" + nmun + ";" + polylineEncoded + ";" + polylineEncodedPreURL + ";" + urlEncoded + "\n";
    fs.appendFileSync(outputFilename,newLine);

    console.log(urlEncoded);
});

