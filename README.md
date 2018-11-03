# puppeteer-datascraping-idealista-cusec
puppeteer-datascraping-idealista-cusec

scripts order:
- 1. extract_points_from_features.py -> this creates geoJson_output folder with the points for polyline encoding. A polygon for each cusec.
- 2. obtainEncodedPolylinesFromGeojson.js -> creates encoded_polylines_madrid.csv
- 3. separar_csv_polylines_por_municipio.py -> creates foder csv_polylines_municipios


scrapers:
- scraperPuppeteerIdealista.js
