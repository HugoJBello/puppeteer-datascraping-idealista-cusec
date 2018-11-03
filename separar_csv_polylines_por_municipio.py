import pandas as pd

csv_polylines = "encoded_polylines_madrid.csv"
df_polylines = pd.read_csv(csv_polylines,sep=";",error_bad_lines=False, encoding="utf-8")
dir_salida = "csv_polylines_municipios"
nombres_municipios = ["Madrid", "Móstoles", "Alcalá de Henares",
							"Fuenlabrada", "Leganés", "Getafe",
							"Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas",
							"Las Rozas de Madrid", "San Sebastián de los Reyes",
							"Pozuelo de Alarcón", "Coslada", "Rivas-Vaciamadrid",
							"Valdemoro", "Majadahonda", "Collado Villalba", "Aranjuez",
							"Arganda del Rey", "Boadilla del Monte", "Pinto", "Colmenar Viejo",
							"Tres Cantos", "San Fernando de Henares", "Galapagar", "Arroyomolinos",
							"Villaviciosa de Odón", "Navalcarnero", "Ciempozuelos", "Torrelodones",
							"Paracuellos de Jarama", "Mejorada del Campo", "Algete"]

for n_mun in nombres_municipios:
    print("filtrando datos para municipio " + n_mun)
    df_municipio = df_polylines.loc[df_polylines['NMUN'] == n_mun].reset_index()
    nombre_subfichero_salida = n_mun + "_polylines_2011_ccaa12.csv"
    df_municipio.to_csv(dir_salida + "/" + nombre_subfichero_salida, sep=";", index=False, encoding="utf-8")

