var otbnSDE = ee.FeatureCollection("projects/ee-carbono1/assets/santotbn_250"),
    noWaternoCities = ee.Image("projects/ee-christopheracosta2626/assets/noWaterNoCities"),
    noWater = ee.Image("projects/ee-christopheracosta2626/assets/noWaterNoCities"),
    pastizales_mask = ee.Image("projects/ee-christopheracosta2626/assets/pastizale_arbustales_mask"),
    AGRO = ee.FeatureCollection("projects/ee-christopheracosta2626/assets/menor_2024");



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
    

//Seleccionar los valores mínimos de NDVI y NBR de cada pixel en la colección / o obtener la mediana de cada pixel en la colección
    //LASTYEAR----------------------------------------------------------------------
    var minNDVISentinelY = indicesNDVILastYear.min();
    var minNBRSentinelY = indicesNbrLastYear.min();
    var medianNDVISentinelY = indicesNDVILastYear.median();

    //LAST 3 MONTHS----------------------------------------------------------------
    var minNDVISentinelM = indicesNDVILast3Mon.min();
    var medianNDVISentinelM = indicesNDVILast3Mon.mosaic();
    var medianNBRSentinelM = indicesNbrLast3Mon.mosaic();
    

    //TODAY------------------------------------------------------------------------
    var medianNDVISentinelT = indicesNDVILastWeek;
    var medianNBRSentinelT = indicesNbrLastWeek;





//============================================================
//        MASCARAS
//============================================================

      //enmascarar zonas urbanas
      var urbanMask = landcover.select('Map').eq(50);
      var noUrbanMask = urbanMask.not();

      //enmascarar zonas con agua
      var indicesNDWILastWeek = indicesLastWeek.select('ndwi');
      var ndwiMask = indicesNDWILastWeek.gt(0.05);
      var noWaterMask = ndwiMask.not();

      //máscara que incluye todas las zonas =/= de centros urbanos y cuerpos de agua
      var exclusionMask = noUrbanMask.and(noWaterMask);
    
  
      //AOI: OTBN DE SANTIAGO DEL ESTERO (shape)
        var combinedMask = otbnSDE;
        

//RECORTE DE LAS COLECCIONES (DATOS DE ÍNDICES DE NDVI Y NBR) AL ÁREA DEL OTBN      

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
          var updateMaskedRgbW = imageLastWeek.clip(combinedMask);
        


//============================================================
//        HANSEN FOREST MASK
//============================================================


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
//var hansenForest2=hansenForest.updateMask(hansenForest)
var hansenValue=hansenForest.select('treecover2000')
         





//============================================================
//        GENERACIÓN DE LOS PARÁMETROS
//============================================================


//-->¿ÉL VALOR ACTUAL DE NBR DEL PIXEL CORRESPONDE A UN RANGO ASOCIADO A DEFORESTACIÓN?----------------------------------------

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
            -0.059118182,
            -0.1807,
            -0.2089,
            -0.1845,
            -0.136496279,
            -0.11921
        ]); // Valor máximo de NBR actual
      
      
      var mes = today.get('month');
      var index = mes.subtract(1);
      
      var minNBR = ee.Number(umbralesMinNBR.get(index));
      var maxNBR = ee.Number(umbralesMaxNBR.get(index));
      
      //verificar si los valores actuales ingresan dentro del rango
      var condRangoNBR = updateMaskedNbrT.lte(maxNBR).and(updateMaskedNbrT.gte(-0.40));
      
      





//-->EL VALOR ACTUAL DE NBR Y NDVI DEL PIXEL ¿ES MENOR AL  VALOR MÍNIMO PARA EL MISMO PIXEL EN EL MISMO MES CORRESPONDIENTE A LOS AÑOS PREVIOS?----------------------------------------

    // Funcion para calcular los valores minimos correspondientes a los meses de años anteriores ( incluyendo el mes posterior y previo en casos de ausencia de datos)
    function getP25Estacional(ndviCollection, targetMonth) {
              var coleccionFiltrada = ndviCollection.filter(ee.Filter.calendarRange(targetMonth, targetMonth, 'month'));
              
              // Para meses con pocos datos, expandir ligeramente el rango
              var count = coleccionFiltrada.size();
              var coleccionFinal = ee.Algorithms.If({
                condition: count.lt(10),
                trueCase: ndviCollection.filter(ee.Filter.calendarRange(targetMonth.subtract(1), targetMonth.add(1), 'month')),
                falseCase: coleccionFiltrada
              });
              print("coleccion estacional" ,ee.ImageCollection(coleccionFinal))
              
              //obtener los valores mínimos y del p_25
              var reducerCompuesto = ee.Reducer
              .percentile([25])
              .combine({
                reducer2: ee.Reducer.min(),
                sharedInputs: true
              })
              
              return ee.ImageCollection(coleccionFinal).reduce(reducerCompuesto);
    }
    
    //Obtener el mes actual y aplicar la funcion a los indices de NDVI y NBR
      var mesActual = today.get('month');
      var p25EstacionalNBR = getP25Estacional(indicesNbrLastYear, mesActual).select('nbr_min');
      var p25EstacionalNDVI = getP25Estacional(indicesNDVILastYear, mesActual).select('ndvi_min');
    
    
    //Comparar con los valores de la imagen más reciente
        var  p25BrokenNBR= updateMaskedNbrT.lt(p25EstacionalNBR);
        var p25BrokenNDVI =updateMaskedNdviT.lt(p25EstacionalNDVI)
      
    
    //verificar si se cumplen las condiciones para ambos índices
        var p25BrokenConfiable = p25BrokenNBR.and(p25BrokenNDVI)
        var p25BrokenConfiable = maskingAgro(p25BrokenConfiable)





//-->¿EL PIXEL SE ENCUENTRA EN UN RANGO DE VALORES DE NDVI ASOCIADO A DEFORESTACIÓN? 
//-->¿EL PIXÉL EXPERIMENTÓ UNA CAIDA DE NDVI ASOCIADA A DEFORESTACIÓN EN LAS ÚLTIMAS DOS SEMANAS?

  //Rangos de CAIDA O PÉRDIDA de NDVI asociados a deforestación para cada mes  
    var umbralesNdviAbsolutos = ee.List([
        0.105470012, //ene
        0.179117315,  //feb
        0.152816731,  //mar....
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
        
// Listas de VALORES DE NDVI DE PIXELES asociados a deforestación para cada mes        
    var umbralesMinNDVI = ee.List([
        0.314508813,// ene
        0.313943217,// feb
        0.369190026,// mar
        0.314631271,// abr...
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


    // Obtener el mes de 'fechaFin' (1-12) y calcular el índice (0-11)
    var mes = today.get('month');
    var index = mes.subtract(1);
    // Obtener los umbrales como números de Earth Engine
    var thresholdAbs = ee.Number(umbralesNdviAbsolutos.get(index));
    var thresholdAbs2 = ee.Number(umbralesNdviAbsolutos2.get(index));
    var minNDVI = ee.Number(umbralesMinNDVI.get(index));
    var maxNDVI = ee.Number(umbralesMaxNDVI.get(index));
    
    
    
    // Calcular el cambio absoluto de NDVI en las ultimas dos semanas
    var change = updateMaskedNdviM.subtract(updateMaskedNdviT);
    //Condición: Verificar si la caida de ndvi se asocia al rango de caida de NDVI asociado a deforestación
    var lostAbsoluto = change.gte(thresholdAbs).and(change.lt(0.319325042)); // Umbral absoluto dinámico
    var lostNDVImasked = lostAbsoluto;
    
    
    // Condición: NDVI actual entre rango mensual
    var condRangoNDVI = updateMaskedNdviT.lte(maxNDVI).and(updateMaskedNdviT.gte(0.06));

    
    // Combinar ambos criterios
    var lostNDVIMixto = lostNDVImasked.and(condRangoNDVI)







//-->¿EXISTI+O UNA CAIDA DEL NBR ASOCIADA A DEFORESTACIÓN EN LA ÚLTIMAS DOS SEMANAS?----------------------------------------

// Listas de umbrales dinámicos por mes (enero a diciembre)
    var umbralesDeltaNBR = ee.List([
        0.079010773,
        0.192482209,
        0.147639575,
        0.166837022,
        0.131631191,
        0.094666912,
        0.14610,
        0.07577,
        0.04488,
        0.09800,
        0.08733,
        0.08296
    ]); 
    
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
    
    //Obtener la diferencia de NBR en las últimas dos semanas (dNBR)
    var dNBR = updateMaskedNbrM.subtract(updateMaskedNbrT).rename('dNBR');
    
    //Condición: dNBR está dentro del umbral de caida de NBR asociado a deforestación
    var condDelta = dNBR.gte(thresholdDeltaNBR).and(dNBR.lte(0.4));
    var condDelta=maskingAgro(condDelta)
    var lostNBR = condDelta;






//============================================================
//        INCENDIOS
//============================================================

    // Condición: NBR actual > máximo mensual (sobrepasa el rango normal)
    var condDeltaFire = dNBR.gte(thresholdDeltaNBR2).and(dNBR.lte(0.40));
    var condNbrFire=updateMaskedNbrT.lte(minNBR).and(updateMaskedNbrT.gte(-0.40))
    var condSobreMaximo = condNbrFire.and(condDeltaFire);





//============================================================
//        RESULTADOS
//============================================================

// ASIGNAR EL PESO A CADA CAPA ASOCIADA AL CUMPLIMIENTO DE CADA CONDICIÓN O PARÁMETRO
    var ponderada1 = condRangoNBR.multiply(1); // Peso = 1
    var ponderada2 = p25BrokenConfiable.multiply(1); // Peso = 1
    var ponderada3 = lostNBR.multiply(1); // Peso = 1
    var ponderada4 = lostNDVIMixto.unmask().multiply(1); // Peso = 1
    var ponderada5 = hansenValue.multiply(1);   // Peso = 1
    var ponderada6 = pastizales_mask.unmask().select('NDVI_std').not().multiply(2)// Peso = 2 (PERO SERÁ NEGATIVO)
    

//CALCULO DEL VALOR DE CADA PIXEL EN BASE DEL NUMERO DE CONDICIONES CUMPLLIDAS (TOMA VALORES DE 0 A 5)
    var sumaPonderada = ponderada1.add(ponderada2.unmask()).add(ponderada3).add(ponderada4).add(ponderada5);
    var sumaPonderada = sumaPonderada.subtract(ponderada6)
    var sumaPonderada = sumaPonderada.updateMask(exclusionMask)

    // CAPAS RESULTANTES
        //ALERTA DE DEFORESTACIÓN
        var maxUmbral_1and2 = sumaPonderada.select('nbr').gte(4);
        var maxUmbralMask_1and2=maxUmbral_1and2.updateMask(maxUmbral_1and2.eq(1));
        //INCENDIO
        var condSobreMaximo = condSobreMaximo.and(maxUmbralMask_1and2)

        

//============================================================
//        VISUALIZACIÓN DE LAS CAPAS
//============================================================
      Map.addLayer(imageLastWeek.clip(santiagoDelEsteroFeature),rgbVis,'Fondo',true)
      Map.addLayer(sumaPonderada.clip(santiagoDelEsteroFeature), {min: 0, max: 5, palette: palette2}, 'Suma Ponderada',true);
      Map.addLayer(sumaPonderada.updateMask(maxUmbralMask_1and2).focalMax(3), {min: 4, max: 5, palette:['#b50b0b', '#fc0303'] }, 'ALERTAS DE DEFORESTACIÓN',true);
      Map.addLayer(condSobreMaximo.clip(santiagoDelEsteroFeature).selfMask(), {min:0, max:1, palette: ['#82de7e']}, 'INCENDIO', false);



/*Export.image.toAsset({ 
  image: maxUmbralMask_1and2.clip(santiagoDelEsteroFeature),
  description: 'data_monitor_v2_may_02',
  scale: 10, 
  region: santiagoDelEsteroFeature,
  maxPixels: 1e13
})*/
