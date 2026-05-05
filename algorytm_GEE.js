



//============================================================ 
//         COLECCIONES
//============================================================
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
var csPlus = ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED")
var landcover = ee.ImageCollection('ESA/WorldCover/v200').first();

// AOI - Santiago del Estero
var administrativeUnits = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level1");
var santiagoDelEsteroFeature = administrativeUnits.filter(ee.Filter.eq('ADM1_NAME', 'Santiago Del Estero'));



//============================================================-
//        OTROS
//============================================================

function maskingAgro(image){
    var mask= image.clip(AGRO).mask()
    var inverter=mask.not()
    var inverter=image.updateMask(inverter)
    
    return inverter;
}

//============================================================
//        FECHAS
//============================================================
var number = '2024-05-30';
var today = ee.Date(number);
var last2Week = today.advance(-15, 'days');
var startDate = today.advance(-16, 'days');
var lastYear = startDate.advance(-710, 'days');
var last3Months = startDate.advance(-90, 'days');



//============================================================
//        COLECCIÓN SENTINEL 
//============================================================

//FUNCIÓN PARA PROCESAR COLECCIÓN DE IMÁGENES CON FECHA INICIO Y FIN
var sentinelFunction = function(start, end) {
  var filtered = sentinel2
    .filterBounds(santiagoDelEsteroFeature)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 85))
    .select(['B2', 'B3', 'B4', 'B8', 'B11']); 

  var csPlusBands = csPlus.first().bandNames();
  var filteredS2WithCs = filtered.linkCollection(csPlus, csPlusBands);

  // Function to mask pixels with low CS+ QA scores
  function maskLowQA(image) {
    var qaBand = image.select('cs');
    var mask = qaBand.gte(0.83);
    
    return image.updateMask(mask);
  }

  var filteredMasked = filteredS2WithCs
    .map(maskLowQA)
    .select('B2', 'B3', 'B4', 'B8', 'B11');
    
  return filteredMasked;
};


//COLECCIONES DE SENTINEL DE DISTINTOS PERIODOS

//Referencia de las ultimas dos semanas hasta hoy
  var rangeLastWeek= sentinelFunction(last2Week, today)
//Referencia a partir del d+ia previo a las ultimas dos semanas (para evitar solape de periodos)
  var rangeLastYear = sentinelFunction(lastYear,startDate)
  var rangeLast3Months = sentinelFunction(last3Months,startDate) 

    

//COMPOSICIÓN DE LA ÚLTIMA SEMANA
  var imageLastWeek = rangeLastWeek.mosaic();
  



//============================================================
//        VISUALES
//============================================================

//PALETAS DE COLORES

    //ndvi
    var NDVIpalette = [
      'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
      '74A901', '66A000', '529400', '3E8601', '207401', '056201',
      '004C00', '023B01', '012E01', '011D01', '011301'];
      
    //paleta de visualización final
    var palette2 = ['#454546', '#666666', '#8c8c8c','#b50b0b', '#fc0303'];
    
    
    
//AJUSTES DE VISIUALIZACIÓN DE CAPAS
    var ndviVis = {
      min:0, 
      max:1, 
      palette: NDVIpalette };

    //rgb
    var rgbVis = {
      min: 0.0,
      max: 3000,
      bands: ['B4', 'B3', 'B2']};
  


  

  
//INDICES
    //función de agregar índices a --> sentinel
    function addIndices(image) {
      var ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi');
      var ndwi = image.normalizedDifference(['B3', 'B11']).rename('ndwi');
      var nbr = image.normalizedDifference(['B8', 'B11']).rename('nbr');
    
    
      return image.addBands(ndvi).addBands(ndwi).addBands(nbr);
    }
    
    //Aplicar función a cada una de las tres colecciones
    var indicesLastYear = rangeLastYear.map(addIndices);
    var indicesLast3mon = rangeLast3Months.map(addIndices);
    var indicesLastWeek = addIndices(imageLastWeek);    //no es una colección pero lo tratamos como tal
    
    //seleccionar la banda ndvi en cada una de las colecciones
    var indicesNDVILastYear = indicesLastYear.select('ndvi');
    var indicesNDVILast3Mon = indicesLast3mon.select('ndvi');
    var indicesNDVILastWeek = indicesLastWeek.select('ndvi');
    
    //seleccionar la banda nbr en cada una de las colecciones
    var indicesNbrLastYear = indicesLastYear.select('nbr');
    var indicesNbrLast3Mon = indicesLast3mon.select('nbr');
    var indicesNbrLastWeek = indicesLastWeek.select('nbr');
    
    //seleccionar la banda ndwi (agua) en la colección de la última semana
    var indicesNDWILastWeek = indicesLastWeek.select('ndwi');
    




//============================================================
//        ESTADÍSTICAS
//============================================================

    //función para agregar banda de tiempo a las imágenes (a veces pueden perder la propiedad o tener algun error)
    function addTime(image) {
      var time = ee.Image.constant(image.date().difference(startDate, 'day')).rename('time');
      return image.addBands(time).float();
    }
    var withTimeYear = indicesLastYear.map(addTime);
    

//
    //LASTYEAR----------------------------------------------------------------------
    var minNDVISentinelY = indicesNDVILastYear.min();
    var minNBRSentinelY = indicesNbrLastYear.min();
    var medianNDVISentinelY = indicesNDVILastYear.median();

    //LAST 3 MONTHS----------------------------------------------------------------
    var minNDVISentinelM = indicesNDVILast3Mon.min();
    var medianNDVISentinelM = indicesNDVILast3Mon.mosaic();
    var medianNBRSentinelM = indicesNbrLast3Mon.mosaic();
    

    //TODAY
    var medianNDVISentinelT = indicesNDVILastWeek;
    var medianNBRSentinelT = indicesNbrLastWeek;




//MASKS-----------------------------------------------------------------------------------------------
      var indicesNDWILastWeek = indicesLastWeek.select('ndwi');
      var urbanMask = landcover.select('Map').eq(50);
      var noUrbanMask = urbanMask.not();
          
      var ndwiMask = indicesNDWILastWeek.gt(0.05);
      var noWaterMask = ndwiMask.not();
      var exclusionMask = noUrbanMask.and(noWaterMask);
    
  
    //FINAL RESULTS
        //Classificated Image
        var combinedMask = table;
        Map.addLayer(combinedMask,{},'MASK',false)

      

        
        //ndvi  
          var updateMaskedNdviY = medianNDVISentinelY.clip(combinedMask); //mediana ndvi
          var updateMaskedMinNdviY = minNDVISentinelY.clip(combinedMask);//minimos de ndvi
          var updateMaskedMinNdviY =maskingAgro(updateMaskedMinNdviY);
          
          var updateMaskedNdviM = medianNDVISentinelM.clip(combinedMask);
         var updateMaskedNdviM =maskingAgro(updateMaskedNdviM);
         
          var updateMaskedNdviT = medianNDVISentinelT.clip(combinedMask);
           var updateMaskedNdviT = maskingAgro(updateMaskedNdviT)

    
        //Nbr
          var updateMaskedMinNbrY = minNBRSentinelY.clip(combinedMask); //minimos de NBR
          var updateMaskedMinNbrY = maskingAgro(updateMaskedMinNbrY);
          
          var updateMaskedNbrM = medianNBRSentinelM.clip(combinedMask);
          var updateMaskedNbrM = maskingAgro(updateMaskedNbrM)
          
          var updateMaskedNbrT = medianNBRSentinelT.clip(combinedMask)
          var updateMaskedNbrT = maskingAgro(updateMaskedNbrT);
        
        //RGB
          //var updateMaskedRgbY = imageLastYear.clip(combinedMask);
          //var updateMaskedRgbM = imageLast3mon.clip(combinedMask);
          var updateMaskedRgbW = imageLastWeek.clip(combinedMask);
        

        Map.addLayer(imageLastWeek.clip(santiagoDelEsteroFeature), rgbVis, 'TEST',true)




//============================================================
//        HANSEN FOREST MASK
//============================================================


//-->forest
  var hansen = ee.Image('UMD/hansen/global_forest_change_2023_v1_11')
  //var hansen = ee.Image("UMD/hansen/global_forest_change_2024_v1_12")
      var datasetUnmask=hansen.unmask()
      var hansenForest=datasetUnmask.select('treecover2000')
         .gt(30)
         .add(datasetUnmask.select('gain'))
         .subtract(datasetUnmask.select('loss'))
         .add(datasetUnmask.select('lossyear')
             .eq(23))
         .gt(0)
         .clip(santiagoDelEsteroFeature);
var hansenForest2=hansenForest.updateMask(hansenForest)
var hansenValue=hansenForest.select('treecover2000')
         
Map.addLayer(hansenForest2, {palette: ['blue']}, "HANSEN",false)





//============================================================
//        GENERACIÓN DE LOS PARÁMETROS
//============================================================


//-->min
//me evito conflictos de temporadas tomando min de todo el año
var umbralesMinNBR = ee.List([
-0.162630628,
-0.171129535,
-0.157044053,
-0.192417229,
-0.14689545,
-0.163021125,
-0.17705029,
-0.169423444,
-0.182141385,
-0.210923424,
-0.209937511,
-0.1975292

  ]); // Valor mínimo de NBR actual
var umbralesMaxNBR = ee.List([
  -0.058872646,	
  -0.022967218,	
  -0.00489675,
  -0.017560333,
  -0.020328055,
  -0.040058923,
  -0.059118182,//fix fenologia
  -0.1807,//-0.114883333,//fix fenologia//
  -0.2089,//-0.143233333,//fix fenologia//
  -0.1845,//-0.148591667,//fix fenologia//
  -0.136496279,
  -0.11921//-0.0929130
  ]); // Valor máximo de NBR actual
//var umbralesMaxNBR = ee.List([-0.021,	-0.08,	-0.04,	-0.02,	-0.02,	-0.02,	 -0.06,	-0.1,	-0.15,	-0.155,	-0.008,	-0.09]); // Valor máximo de NBR actual
 

var mes = today.get('month');
var index = mes.subtract(1);

var minNBR = ee.Number(umbralesMinNBR.get(index));
var maxNBR = ee.Number(umbralesMaxNBR.get(index));
print(minNBR,maxNBR)
var condRangoNBR = updateMaskedNbrT.lte(maxNBR).and(updateMaskedNbrT.gte(-0.40));
Map.addLayer(condRangoNBR.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'orange']}, 'condRangoNBR', false);



//-->Q1
// 1. CALCULAR P25 ESTACIONAL (3 meses de ventana)
function getP25Estacional(ndviCollection, targetMonth) {
  var coleccionFiltrada = ndviCollection.filter(ee.Filter.calendarRange(targetMonth, targetMonth, 'month'));
  
  // Para meses con pocos datos, expandir ligeramente
  var count = coleccionFiltrada.size();
  var coleccionFinal = ee.Algorithms.If({
    condition: count.lt(10),
    trueCase: ndviCollection.filter(ee.Filter.calendarRange(targetMonth.subtract(1), targetMonth.add(1), 'month')),
    falseCase: coleccionFiltrada
  });
  print("coleccion estacional" ,ee.ImageCollection(coleccionFinal))
  
  var reducerCompuesto = ee.Reducer
  .percentile([25])
  .combine({
    reducer2: ee.Reducer.min(),
    sharedInputs: true
  })
  
  
  return ee.ImageCollection(coleccionFinal).reduce(reducerCompuesto);
}

// 2. APLICAR EN TU CÓDIGO
var mesActual = today.get('month');
var p25EstacionalNBR = getP25Estacional(indicesNbrLastYear, mesActual).select('nbr_min');
var p25EstacionalNDVI = getP25Estacional(indicesNDVILastYear, mesActual).select('ndvi_min');

var  p25BrokenNBR= updateMaskedNbrT.lt(p25EstacionalNBR);
var p25BrokenNDVI =updateMaskedNdviT.lt(p25EstacionalNDVI)
Map.addLayer(p25BrokenNBR.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'p25BrokenNBR',false);
Map.addLayer(p25BrokenNDVI.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'p25BrokenNDVI',false);



var p25BrokenConfiable = p25BrokenNBR.and(p25BrokenNDVI)
var p25BrokenConfiable = maskingAgro(p25BrokenConfiable)

Map.addLayer(p25BrokenConfiable.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'MIN NDVI - ANTIGUO P25',false);



// Listas de umbrales absolutos y porcentuales por mes (enero a diciembre)
var umbralesNdviAbsolutos = ee.List([
0.105470012,
0.179117315,
0.152816731,
0.153279039,
0.145466838,
0.133795189,
0.138702606,
0.072854155,
0.019060866,
0.045586521,
0.02787156,
0.0684040
  ]);
  
var umbralesNdviAbsolutos2 = ee.List([
0.300093137,
0.369004614,
0.338981558,
0.362296876,
0.319325042,
0.292160988,
0.251013006,
0.182195785,
0.110877663,
0.163413568,
0.1494397,
0.2402889
  ]);
//var umbralesNdviAbsolutos = ee.List([ 0.098,	0.089,	0.093,	0.076,	0.139,	0.16,	0.13,	0.11,	0.1,	0.1,	0.048,	0.1]);
var umbralesNdviPorcentuales = ee.List([0.4, 0.38, 0.38, 0.38, 0.33, 0.31, 0.29, 0.26, 0.18, 0.24, 0.36, 0.43]);
var umbralesMinNDVI = ee.List([
0.314508813,
0.313943217,
0.369190026,
0.314631271,
0.383862711,
0.366245598,
0.328097357,
0.303567602,
0.301954981,
0.263594981,
0.25541486,
0.278306154

  ]); 
var umbralesMaxNDVI = ee.List([
0.467073819,
0.521950997,
0.557328844,
0.551731078,
0.541075675,
0.510703247,
0.45015276,
0.41733,
0.3835,
0.3483,
0.345436887,
0.4151049
  ]);
//var umbralesMaxNDVI = ee.List([0.53,	0.43,	0.474,	0.63,   0.63,    0.54,	0.49,	0.42,	  0.35, 	0.43,	0.43,   0.453]); // Valor máximo de NBR actual


// Obtener el mes de 'fechaFin' (1-12) y calcular el índice (0-11)
var mes = today.get('month');
var index = mes.subtract(1);

// Obtener los umbrales como números de Earth Engine
var thresholdAbs = ee.Number(umbralesNdviAbsolutos.get(index));
var thresholdAbs2 = ee.Number(umbralesNdviAbsolutos2.get(index));

var thresholdPct = ee.Number(umbralesNdviPorcentuales.get(index));
var minNDVI = ee.Number(umbralesMinNDVI.get(index));
var maxNDVI = ee.Number(umbralesMaxNDVI.get(index));
print(minNDVI,maxNDVI)


// Calcular el cambio absoluto de NDVI
var change = updateMaskedNdviM.subtract(updateMaskedNdviT);
var lostAbsoluto = change.gte(thresholdAbs).and(change.lt(0.319325042)); // Umbral absoluto dinámico
var lostNDVImasked = lostAbsoluto;

// Calcular el cambio porcentual con umbral dinámico
var changePorcentual = updateMaskedNdviM.expression(
  '(NDVI_M > 0.15) ? ((NDVI_M - NDVI_T) / NDVI_M) : 0', {
    'NDVI_M': updateMaskedNdviM,
    'NDVI_T': updateMaskedNdviT
}).gt(thresholdPct); // Umbral porcentual dinámico

// 3. Condición: NBR actual entre rango mensual
var condRangoNDVI = updateMaskedNdviT.lte(maxNDVI).and(updateMaskedNdviT.gte(0.06));
Map.addLayer(condRangoNDVI.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'black']}, 'condRangoNDVI', false);


// Combinar ambos criterios
var lostNDVIMixto = lostNDVImasked.and(condRangoNDVI)

// Añadir capas al mapa (opcional)
Map.addLayer(change.clip(santiagoDelEsteroFeature), 
 {min: -0.5, max: 0.5, palette: ['blue', 'white', 'red']}, 'dNDVI', false);
Map.addLayer(lostNDVImasked.clip(santiagoDelEsteroFeature), { min: 0, max: 1, palette: ['white','green']}, 'LOST NDVI', false);
//Map.addLayer(changePorcentual.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'LOST NDVI PERCENT', false);
//Map.addLayer(lostNDVIMixto.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'yellow']}, 'lostNDVIMixto', false);





//-->mascara NBR

/*
      // Calcular dNBR
      var dNBR = updateMaskedNbrM.subtract(updateMaskedNbrT).rename('dNBR'); 
      // Visualizar el dNBR
     Map.addLayer(dNBR.clip(santiagoDelEsteroFeature), {min: 0, max: 0.3, palette: ['blue', 'white', 'red']}, 'dNBR',false);
      var lostNBR = dNBR.gt(0.1)
      Map.addLayer(lostNBR.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'BURNED LOST',false);
*/




// Listas de umbrales dinámicos por mes (enero a diciembre)
var umbralesDeltaNBR = ee.List([
0.079010773,
0.192482209,
0.147639575,
0.166837022,
0.131631191,
0.094666912,
0.14610,//fix
0.07577,//fix
0.04488,//fix
0.09800,//0.05895,//fix
0.08733,//0.03933,//fix
0.08296//fix

]); // Ej: valores de dNBRt

var umbralesDeltaNBR2 = ee.List([
0.257919859,
0.353613902,
0.301473213,
0.352748404,
0.29572224,
0.263759461,
0.243097411,
0.169029059,
0.100959506,
0.117457557,
0.08776633,
0.1630573
]);

// Obtener umbrales para el mes actual
var thresholdDeltaNBR = ee.Number(umbralesDeltaNBR.get(index));
var thresholdDeltaNBR2 = ee.Number(umbralesDeltaNBR2.get(index));

print(thresholdDeltaNBR)
var dNBR = updateMaskedNbrM.subtract(updateMaskedNbrT).rename('dNBR');

// 1. Condición: dNBR > umbral mensual
var condDelta = dNBR.gte(thresholdDeltaNBR).and(dNBR.lte(0.4));
//Map.addLayer(condDelta.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'blue']}, 'dNBR > umbral mensual', false);

var condDelta=maskingAgro(condDelta)

// Combinar todas las condiciones
var lostNBR = condDelta;

// Visualizar resultados
Map.addLayer(dNBR.clip(santiagoDelEsteroFeature), 
 {min: -0.5, max: 0.5, palette: ['blue', 'white', 'red']}, 'dNBR', false);
Map.addLayer(lostNBR.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'BURNED LOST Dynamic', false);




//============================================================
//        INCENDIOS
//============================================================
// 4. Condición: NBR actual > máximo mensual (sobrepasa el rango normal)
var condDeltaFire = dNBR.gte(thresholdDeltaNBR2).and(dNBR.lte(0.40));
var condNbrFire=updateMaskedNbrT.lte(minNBR).and(updateMaskedNbrT.gte(-0.40))
//Map.addLayer(condDeltaFire,{},'firesTest')
var condSobreMaximo = condNbrFire.and(condDeltaFire);





//RESULTS----------------------------------------------------------------------------------------------
    // Asignar los pesos a cada capa
    var ponderada1 = condRangoNBR.multiply(1); // Peso = 8
    var ponderada2 = p25BrokenConfiable.multiply(1); // Peso = 0
    var ponderada3 = lostNBR.multiply(1); // Peso = 2
    var ponderada4 = lostNDVIMixto.unmask().multiply(1); // Peso = 3
    var ponderada5 = hansenValue.multiply(1);
    var ponderada6 = pastizales_mask.unmask().select('NDVI_std').not().multiply(2)// Peso = 0
    
Map.addLayer(ponderada1.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'PONDERADA PRUEBA1', false);
Map.addLayer(ponderada2.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'PONDERADA PRUEBA2', false);
Map.addLayer(ponderada3.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'PONDERADA PRUEBA3', false);
Map.addLayer(ponderada4.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'yellow']}, 'PONDERADA PRUEBA4', false);
Map.addLayer(ponderada5.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'PONDERADA PRUEBA5', false);
Map.addLayer(ponderada6.clip(santiagoDelEsteroFeature), {min: 0, max: 1, palette: ['white', 'red']}, 'PONDERADA PRUEBA6', false);


    /*minBroken es muy importante, pero su valor real en realidad es 7, si bien minBroken siempre es p25Broken, p25Broken
    no siempre es minBroken por lo que debe ir acompañado de otros tres para qu signifique algo. 
    */

    // Calcular la suma ponderada
    var sumaPonderada = ponderada1.add(ponderada2.unmask()).add(ponderada3).add(ponderada4).add(ponderada5);
    var sumaPonderada = sumaPonderada.subtract(ponderada6)
    var sumaPonderada = sumaPonderada.updateMask(exclusionMask)
    // var sumaPonderada = sumaPonderada.updateMask(exclusionMask).updateMask(condSobreMaximo.not())

    // Visualizar la capa resultante


        //umbral minimo (confirmado)
        var minUmbral = sumaPonderada.select('nbr').lt(3);
        var minUmbralMask=minUmbral.updateMask(minUmbral.eq(1));
        //umbral medio (confimado)
        var maxUmbral = sumaPonderada.select('nbr').eq(4);
        var maxUmbralMask=maxUmbral.updateMask(maxUmbral.eq(1));
        //umbral medio (confimado)
        var maxUmbral2 = sumaPonderada.select('nbr').gt(4);
        var maxUmbralMask2=maxUmbral2.updateMask(maxUmbral2.eq(1));
        
        //umbral medio y maximo (confimado)
        var maxUmbral_1and2 = sumaPonderada.select('nbr').gte(4);
        var maxUmbralMask_1and2=maxUmbral_1and2.updateMask(maxUmbral_1and2.eq(1));

        //fire
        var condSobreMaximo = condSobreMaximo.and(maxUmbralMask_1and2)

        


//LAYERS

   Map.addLayer(updateMaskedNbrM.clip(santiagoDelEsteroFeature),  {min: -0.5, max: 0.5, palette: ['blue', 'white', 'red']}, 'ndviToday',false);
    Map.addLayer(updateMaskedNbrT.clip(santiagoDelEsteroFeature),   {min: -0.5, max: 0.5, palette: ['blue', 'white', 'red']}, 'nbrToday',false);

    
    //statics
   // Map.addLayer(minNDVISentinelY.clip(santiagoDelEsteroFeature), {min: 0, max: 0.5, palette: NDVIpalette}, 'Min NDVI Y',false);

    //deforestation points
      Map.addLayer(sumaPonderada.clip(santiagoDelEsteroFeature), {min: 0, max: 5, palette: palette2}, 'Suma Ponderada',true);
      Map.addLayer(condSobreMaximo.clip(santiagoDelEsteroFeature).selfMask(), {min:0, max:1, palette: ['#82de7e']}, 'INCENDIO', false);

      //Map.addLayer(minUmbralMask.focal_max(2).clip(santiagoDelEsteroFeature), { palette: ['blue']}, 'Píxeles 10',false);
      //Map.addLayer(maxUmbralMask.focal_max(2).clip(santiagoDelEsteroFeature), {palette: ['orange']}, 'Píxeles 12',false);
      //Map.addLayer(maxUmbralMask2.focal_max(2).clip(santiagoDelEsteroFeature), {palette: ['red']}, 'Píxeles >12',false);
      //Map.addLayer(maxUmbralMask_1and2.focal_max(2).clip(santiagoDelEsteroFeature), {palette: ['black']}, 'Píxeles =>12',false);







Export.image.toAsset({ 
  image: maxUmbralMask_1and2.clip(santiagoDelEsteroFeature),
  description: 'data_monitor_v2_may_02',
  scale: 10, 
  region: santiagoDelEsteroFeature,
  maxPixels: 1e13
})




Map.addLayer(table2,{},'ALERTAS',false)
Map.addLayer(pastizales_mask, {}, "pastizales", false)
