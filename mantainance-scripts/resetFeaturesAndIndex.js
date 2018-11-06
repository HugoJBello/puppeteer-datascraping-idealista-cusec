const FeatureProcessor = require('../FeatureProcessor')

const filterer = new FeatureProcessor("../data/maps/", "../data/separatedFeatures/");
filterer.processAllFeaturesAndCreateIndex();
