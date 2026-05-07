/*
//ASSETS
var noWaternoCities = ee.Image("projects/ee-christopheracosta2626/assets/noWaterNoCities"),
    agro = ee.Image("projects/ee-christopheracosta2626/assets/CLEAN_AGRO_1"),
    AGRO = ee.FeatureCollection("projects/ee-christopheracosta2626/assets/menor_2024"),
    otbnSDE = ee.FeatureCollection("projects/ee-christopheracosta2626/assets/santotbn_250"),
    pastizales_mask = ee.Image("projects/ee-christopheracosta2626/assets/pastizale_arbustales_mask");
*/



// ====================================================
// 0. VARIABLES GLOBALES para manejar las capas creadas
// ====================================================
var rectanguloUsuario = null;
var capasImagenesGeneradas = [];
var panelResultadosAnterior = null;
var capas = {};
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
var csPlus = ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED")
var landcover = ee.ImageCollection('ESA/WorldCover/v200').first();

var administrativeUnits = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level1");
var santiagoDelEsteroFeature = administrativeUnits.filter(ee.Filter.eq('ADM1_NAME', 'Santiago Del Estero'));

// ============================================================
//1. INTERFAZ CORRECTA PARA WEBAPP GEE
// ============================================================

var btnStyle={
  backgroundColor: '#00000000',      // Gris medio
  color: 'black',                  // Texto blanco
  border: '0px none #424242',     // Borde gris oscuro
  padding: '8px 0px',             // Espaciado interno
  margin: '4px',                   // Margen exterior
  fontWeight: '500',               // Peso de la fuente              // Cursor mano
  fontSize: '13px'
}

var layoutStyle={
  backgroundColor:'rgba(255, 255, 255, 0.85)',
  borderRadius:'5px' ,
  padding:'5px',
  margin:'5px 0px',
  Width:'300px'
}

var layoutDarkStyle={
  backgroundColor:'#454546',
  borderRadius:'5px' ,
  padding:'5px',
  margin:'5px 0px',
  Width:'300px'
}

// Limpiar interfaz existente
ui.root.clear();

// 1. CREAR EL MAPA COMO WIDGET
var mapPanel = ui.Map();  // Esto SÍ es un widget

// 2. PANEL DE CONTROLES
var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical','5px'),
  style: {
    position: 'top-left',
    width: '320px',
    padding: '10px',
    backgroundColor: 'rgba(69, 69, 70, 0.7)',
    border: '1px solid #454546',
    fontSize: '12px'
  }
});

// Título
controlPanel.add(ui.Label( {
  value:'ALERTAS DE DEFORESTACIÓN',
  style: {backgroundColor:'#00000000',color:'white', textAlign:'center', fontSize: '32px', fontWeight: 'bold', margin: '0 0 10px 0'}
}));
controlPanel.add(ui.Label( {
  value:'SANTIAGO DEL ESTERO',
  style: {backgroundColor:'#00000000',color:'white', textAlign:'center', fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0'}
}));

// 3. SELECTOR DE FECHA
var datePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical',true),
  style:layoutDarkStyle
});

      var fechaInput = ui.Textbox({
        value: '2024-02-28',
        placeholder: 'YYYY-MM-DD',
        onChange: function(fecha) {
          print('Fecha seleccionada:', fecha);
        }
      });
      
      
      // 4. BOTONES RÁPIDOS
      var quickPanel = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal',5),
        style:{
          backgroundColor:'#00000000',
          textAlign:'center'
          
        }
      });
          quickPanel.add(ui.Button({
            label:'HOY', 
            style:btnStyle,
            onClick: function() {
            var hoy = ee.Date(Date.now()).format('YYYY-MM-dd').getInfo();
            fechaInput.setValue(hoy, true)
            }
          }));
          quickPanel.add(ui.Button({
            label:'-15 DÍAS MENOS', 
            style:btnStyle,
            onClick: function() {
            var fecha = ee.Date(fechaInput.getValue()).advance(-15, 'day');
            fechaInput.setValue(fecha.format('YYYY-MM-dd').getInfo(), true)}
          }));
          
controlPanel.add(datePanel);
datePanel.add(ui.Label({value: 'Fecha análisis:',style:{fontSize: '16px', fontWeight: 'bold', backgroundColor:'#00000000', color:'white'}}));
datePanel.add(fechaInput);
datePanel.add(quickPanel);

// 5. SELECTOR DE DEPARTAMENTO
/*controlPanel.add(ui.Label('Departamento:'));
var deptoSelect = ui.Select({
  items: ['Santiago Del Estero', 'Aguirre', 'Alberdi', 'Atamisqui', 'Avellaneda', 'Banda'],
  onChange: function(depto) {
    print('Departamento:', depto);
  }
});
controlPanel.add(deptoSelect);*/

// 6. CHECKBOXES DE CAPAS
var analisysPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical',true),
  style:layoutStyle
});


    capas.rgb = ui.Checkbox({label: 'Imagen más reciente de la superficie', value: 'true',style:{
      backgroundColor:'#00000000'
    }});
    capas.alertas = ui.Checkbox({label:'Alertas Deforestación', value: 'false',style:{
      backgroundColor:'#00000000'
    }});
    capas.incendios = ui.Checkbox({label:'Incendios', value: 'false',style:{
      backgroundColor:'#00000000'
    }});
    
    var statsPanel = ui.Panel({
      style: {backgroundColor: '#00000000', padding: '8px', margin: '10px 10px',borderRadius:'5px' }
    });
    
    var runButton = ui.Button({
      label: '🚀 EJECUTAR ANÁLISIS',
      onClick: function() {
        ejecutarAnalisisCompleto(fechaInput.getValue());
      },
      style: {
          backgroundColor: '#00000000',      // Gris medio
          color: 'black',                  // Texto blanco
          border: '0px none #424242',     // Borde gris oscuro
          padding: '8px 8px',             // Espaciado interno
          margin: '4px',                   // Margen exterior
          fontWeight: '500',               // Peso de la fuente              // Cursor mano
          fontSize: '20px'
      }
    });
    
controlPanel.add(analisysPanel);
  analisysPanel.add(ui.Label({value:'Capas:',style:{
    fontWeight: 'bold',
    backgroundColor: '#00000000',
    fontSize:'16px'
  }}));
  analisysPanel.add(capas.rgb);
  analisysPanel.add(capas.alertas);
  analisysPanel.add(capas.incendios);
  analisysPanel.add(statsPanel)
    statsPanel.add(ui.Label( {value:'📊 Estadísticas:', style: {fontWeight: 'bold', backgroundColor:'#00000000'}}));
    statsPanel.add(ui.Label({value:'Ejecute análisis para ver datos y visualizar las capas', style: {fontWeight: 'bold', backgroundColor:'#00000000'}}));
  analisysPanel.add(runButton);



// 8. PANEL DE DIBUJO
var drawingPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical',true),
  style:layoutDarkStyle
});

      drawingPanel.add(ui.Label({value:'Comprobación Visual:',style:{
        fontWeight: 'bold',
        color:'white',
        backgroundColor: '#00000000',
        fontSize:'16px'
      }}));
      
      drawingPanel.add(ui.Label({value:'Verifica que se trata de deforestación revisando las ultimas 5 imagenes disponibles del área que te interesa verificar',style:{
        color:'white',
        backgroundColor: '#00000000'
      }}));
      
      var btnDibujarRectangulo = ui.Button({
        label: '⬜ Dibujar Área de Análisis',
        onClick: function() {
          activarModoDibujoRectangulo();
        },
        style: { backgroundColor:'#454546', color: '#454546', padding: '8px', margin: '5px 0' }
      });
      
controlPanel.add(drawingPanel);
drawingPanel.add(btnDibujarRectangulo);





//10. INDICACIONES
var advicePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical',true),
  style:layoutDarkStyle
});
controlPanel.add(advicePanel);
advicePanel.add(ui.Label({value:'RECOMENDACIONES:', style: {fontWeight: 'bold',color:'white',backgroundColor:'#00000000'}}));
advicePanel.add(ui.Label({
  value:'Los casos de deforestación real suelen detectarse por poseer una forma usualmente geométrica formada por agrupaciones puntos, que simular ser agrupados formas como cuadrados o rectángulos. Queda siempre a criterio del usuario evaluar cuales alertas de deforestación corresponde efectivamente a casos de deforestación y cuales no lo son.',
  style: {color:'white', backgroundColor:'#00000000'}
}));






// 9. CONFIGURAR EL MAPA
// Centrar en Santiago del Estero
mapPanel.centerObject(santiagoDelEsteroFeature, 8);










// ====================================================
// 3. FUNCIÓN para activar el dibujo de rectángulo
// ====================================================
function activarModoDibujoRectangulo() {
  // Obtener las herramientas de dibujo del mapa
  var drawingTools = mapPanel.drawingTools();
  
  // Limpiar cualquier dibujo anterior
  drawingTools.clear();
  
  // Configurar solo para dibujar rectángulos
  drawingTools.setShape('rectangle');
  
  // Desactivar otras herramientas de dibujo
  drawingTools.setLinked(false);
  
  print('🔷 Dibuja un RECTÁNGULO en el mapa. Haz clic, arrastra y suelta.');
  
  // Configurar el evento cuando se termina de dibujar
  drawingTools.onDraw(function(rect) {
    // 1. Obtener la geometría del rectángulo
var coords = rect.bounds().coordinates();
var geometry = ee.Geometry.Polygon(coords);
rectanguloUsuario = geometry;
    
    // 2. Desactivar el modo de dibujo
    drawingTools.setShape(null);
    
    // 3. Procesar el rectángulo para obtener imágenes
    procesarRectanguloUsuario(geometry);
  });
}

// ====================================================
// 4. FUNCIÓN PRINCIPAL para procesar el rectángulo
// ====================================================
function procesarRectanguloUsuario(geometry) {
  print('⏳ Buscando imágenes para el área seleccionada...');
  
  // Limpiar capas anteriores de imágenes
  limpiarCapasAnteriores();
  
  // A. Definir la colección y filtrar
  var coleccionFiltrada = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geometry)  // Solo imágenes que intersecten el rectángulo
    .filterDate(ee.Date(fechaInput.getValue()).advance(-90, 'day'), ee.Date(fechaInput.getValue())) // Últimos 90 días
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))  // Pocas nubes
    .sort('system:time_start', false); // Ordenar de más reciente a más antigua
  
  // B. Tomar las 5 imágenes más recientes
  var ultimas5Imagenes = coleccionFiltrada.limit(5);
  var conteo = ultimas5Imagenes.size();
  
  print('📊 Imágenes encontradas:', conteo.getInfo());
  
  // Si no hay imágenes, mostrar mensaje
  if (conteo.getInfo() === 0) {
    print('❌ No se encontraron imágenes con <30% nubes en los últimos 90 días.');
    return;
  }
  
  // C. Convertir a lista para procesar
  var listaImagenes = ultimas5Imagenes.toList(5);
  
  // D. Obtener el número REAL de imágenes
  var conteoReal = conteo.getInfo();
  print('📊 Imágenes REALES encontradas:', conteoReal);
  
  // E. Si hay imágenes, crear panel de resultados
  if (conteoReal > 0) {
    // Usar el conteo REAL, no siempre 5
    var listaImagenes = ultimas5Imagenes.toList(conteoReal);
    
    // Crear panel con el número REAL de imágenes
    crearPanelResultados(listaImagenes, geometry, conteoReal);
    
    // F. Dibujar el rectángulo en el mapa
    dibujarRectanguloEnMapa(geometry);
    
      // 5. LIMPIAR EL RECTÁNGULO DE GEOMETRY IMPORTS
  var drawingTools = mapPanel.drawingTools();
  drawingTools.clear(); 
    
  } else {
    print('❌ No se encontraron imágenes.');
    return;
  }
}

// ====================================================
// 5. FUNCIÓN para limpiar capas anteriores
// ====================================================
function limpiarCapasAnteriores() {
  // Eliminar capas de imágenes anteriores
  capasImagenesGeneradas.forEach(function(capa) {
    mapPanel.remove(capa);
  });
  capasImagenesGeneradas = [];
  
  // Eliminar rectángulo anterior si existe
  if (rectanguloUsuario) {
    var layers = mapPanel.layers();
    for (var i = layers.length() - 1; i >= 0; i--) {
      var layer = layers.get(i);
      if (layer.getName() === 'Área Seleccionada') {
        mapPanel.remove(layer);
        break;
      }
    }
  }
  
  // Eliminar panel anterior de resultados
  if (panelResultadosAnterior) {
    controlPanel.remove(panelResultadosAnterior);
  }
}

// ====================================================
// 6. FUNCIÓN para crear el panel de resultados
// ====================================================
function crearPanelResultados(listaImagenes, geometry,numeroRealImagenes) {
  var panelResultados = ui.Panel({
    layout: ui.Panel.Layout.Flow('vertical'),
    style: layoutDarkStyle
  });
  
  panelResultados.add(ui.Label( {
    value:'📅 ÚLTIMAS 5 IMÁGENES DISPONIBLES',
    style: { fontWeight: 'bold', fontSize: '14px', color: 'white', backgroundColor:'#00000000'}
  }));
  
  print('nro img:',numeroRealImagenes)
  
  // Procesar cada imagen
  for (var i = 0; i < numeroRealImagenes; i++) {
    
  try{
      print("Entró una vez")
      
      var imagen = ee.Image(listaImagenes.get(i));
      var fecha = imagen.date().format('YYYY-MM-dd').getInfo();
      
      // Crear fila para cada imagen
      var filaPanel = ui.Panel({
        layout: ui.Panel.Layout.Flow('horizontal'),
        style: { margin: '5px 0', padding: '5px', backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: '5px' }
      });
      
      var checkbox = ui.Checkbox({
        label: ' ' + fecha,
        value: false,
        style:{fontWeight:'bold', backgroundColor:'#00000000'},
        onChange: (function(indiceCapa) {
          return function(checked) {
            if (indiceCapa !== undefined && capasImagenesGeneradas[indiceCapa]) {
              capasImagenesGeneradas[indiceCapa].setShown(checked);
            }
          };
        }
        
        )(capasImagenesGeneradas.length - 1)
      });
      
      // Crear capa RGB recortada al rectángulo
      var capaVisual = imagen.visualize({
        bands: ['B4', 'B3', 'B2'],
        min: 0,
        max: 3000
      });
      
      var capaRecortada = capaVisual.clip(geometry);
      
      // Añadir capa al mapa (invisible por defecto)
      var nombreCapa = 'Imagen ' + (i+1) + ' - ' + fecha;
      mapPanel.addLayer(capaRecortada, {}, nombreCapa, true);
      
      // Guardar referencia a la capa
      var numCapas = mapPanel.layers().length();
      var capa = mapPanel.layers().get(numCapas - 1);
      capasImagenesGeneradas.push(capa);
      
      // Asociar índice de capa al checkbox
     // checkbox.setUserData('capaIndex', capasImagenesGeneradas.length - 1);
      
      // Botón para centrar en esta área
      var btnCentrar = ui.Button({
        label: '📍',
        style:{backgroundColor:'#00000000'},
        onClick: function() {
          mapPanel.centerObject(geometry, 10);
        },
        style: { margin: '8px', padding: '3px 6px' }
      });
      
      // Botón para mostrar SOLO esta imagen
      var btnSoloEsta = ui.Button({
        label: '👁️',
        style:{backgroundColor:'#00000000'},
        onClick: (function(indiceCapa) {
          return function() {
            // Ocultar todas las capas
            capasImagenesGeneradas.forEach(function(capa, index) {
              capa.setShown(false);
            });
            // Mostrar solo ESTA capa (usando indiceCapa capturado)
            if (indiceCapa !== undefined && capasImagenesGeneradas[indiceCapa]) {
              capasImagenesGeneradas[indiceCapa].setShown(true);
            }
          };
        })(capasImagenesGeneradas.length - 1) // ← Captura el índice actual
      });
      
      filaPanel.add(checkbox);
      filaPanel.add(btnCentrar);
      filaPanel.add(btnSoloEsta);
      panelResultados.add(filaPanel);
      
  }catch(e){
    alert('error')
    break;
  }
      
    
  }
  
  // Añadir panel a la interfaz
  controlPanel.add(panelResultados);
  panelResultadosAnterior = panelResultados;
}

// ====================================================
// 7. FUNCIÓN para dibujar el rectángulo en el mapa
// ====================================================
function dibujarRectanguloEnMapa(geometry) {
  // Centrar el mapa en el rectángulo
  mapPanel.centerObject(geometry, 10);
  
  print('✅ Listo. Usa los checkboxes para mostrar/ocultar cada imagen.');
}


// ====================================================
var btnFlotanteZoom = ui.Button({
  label: '🗺️ Vista General',
  onClick: function() {
    mapPanel.centerObject(santiagoDelEsteroFeature.geometry(), 8);
  },
  style: {
    position: 'bottom-center',
    backgroundColor: 'rgba(69, 69, 70, 0.8)',  // Marrón terroso (para app forestal)
    color: 'black',
    borderRadius: '5px',
    padding: '12px 20px',
    margin: '20px',
    border: '0px none #3E2723',
    fontWeight: 'bold',
    fontSize: '14px',
  }
});

// Añadir al mapa DESPUÉS de todos los otros elementos
mapPanel.add(btnFlotanteZoom);































// 10. ENSAMBLAR LA INTERFAZ FINAL
// Opción A: Dividir pantalla (recomendado)
var splitPanel = ui.SplitPanel({
  firstPanel: controlPanel,
  secondPanel: mapPanel,
  orientation: 'horizontal',
  wipe: true,
  style: {stretch: 'both'}
});

ui.root.add(splitPanel);





///////////////////////////////////////////
//MAPA BORDE SANTIAGO DEL ESTERO 
/////////////////////////////////////////

// 1. Fondo satelital
// SOLO borde - esto SÍ funciona
mapPanel.setOptions({'mapTypeId': 'hybrid'});

// 2. Convertir la FeatureCollection a una sola geometría
var santiagoGeometry = santiagoDelEsteroFeature.geometry(); // Esto SÍ funciona

// 3. Crear un Feature simple con esa geometría
var santiagoSimple = ee.FeatureCollection(santiagoGeometry, {name: 'Santiago'})
.style({fillColor: '00000000', width: 5, color:'white'});


// 4. Añadir AL MAPA usando addLayer (no add)
mapPanel.addLayer(
  santiagoSimple,  // Feature individual, NO FeatureCollection
  {},
  'Santiago del Estero',
  true
);

var departamentos = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level2").filter(ee.Filter.eq('ADM1_NAME', 'Santiago Del Estero')); 
var departamentosStyle= departamentos.style({fillColor: '00000000', width: 1, color:'white'})

mapPanel.addLayer(departamentosStyle,{},'Departamentos',false);

mapPanel.centerObject(santiagoDelEsteroFeature.geometry(), 8);



////////////////////////////////////////////
//LEYENDA PALETAS COLORES
////////////////////////////////////////////
    var palette4 = ['#454546', '#666666', '#8c8c8c','#ff0000', '#e00000'];
     var palette5 = ['#b50b0b', '#fc0303'];

function crearLeyenda(paleta, valores, titulo) {
  
  // 1. Crear el panel contenedor de la leyenda
  var leyendaPanel = ui.Panel({
    style: {
      position: 'bottom-right',      // Posición en la esquina inferior izquierda
      padding: '10px 15px',         // Espaciado interno
      backgroundColor: 'rgba(255, 255, 255, 0.85)', // Fondo blanco semitransparente
      border: '1px solid #ccc',     // Borde gris claro
      borderRadius: '5px',          // Esquinas redondeadas
      fontSize: '12px',             // Tamaño de fuente
      fontFamily: 'Arial, sans-serif'
    }
  });

  // 2. Añadir título a la leyenda
  if (titulo) {
    leyendaPanel.add(ui.Label( {
      value:titulo,
      style: {
        fontWeight: 'bold',
        fontSize: '13px',
        margin: '0 0 8px 0',
        textAlign: 'center',
        color: '#333'
      }
    }));
  }

  // 3. Crear un ítem por cada color en la paleta
  for (var i = 0; i < paleta.length; i++) {
    var itemPanel = ui.Panel({
      layout: ui.Panel.Layout.Flow('horizontal'),
      style: { margin: '3px 0'}
    });

    // 3a. Cuadro de color
    var colorBox = ui.Label({
      style: {
        backgroundColor: paleta[i],
        padding: '10px 15px',
        margin: '0 10px 0 0',
        border: '1px solid #555'
      }
    });

    // 3b. Etiqueta de texto para el valor
    var valorTexto = valores ? valores[i] : 'Valor ' + (i+1);
    var label = ui.Label( {
      value:valorTexto,
      style: { color: '#333' }
    });

    // 3c. Ensamblar y añadir al panel
    itemPanel.add(colorBox).add(label);
    leyendaPanel.add(itemPanel);
  }

  // 4. Añadir nota explicativa (opcional)
  var notaPanel = ui.Panel({
    layout: ui.Panel.Layout.Flow('horizontal'),
    style: { 
      margin: '8px 0 0 0',
      padding: '8px 0 0 0',
      fontSize: '11px',
      color: '#666',
      fontStyle: 'italic'
    }
  });
  
  notaPanel.add(ui.Label( {
    value:'Áreas de mayor alerta',
    style: { color: paleta[paleta.length-1], fontWeight: 'bold' }
  }));
  
  // 5. Añadir la leyenda al mapa
  mapPanel.add(leyendaPanel);
  
  return leyendaPanel;
}

// ============================================
// CÓMO USAR LA FUNCIÓN CON TU PALETA
// ============================================
// Definir tu paleta y los valores que representa
var misValores = ['NIVEL 1 ', 'NIVEL 2'];

// Crear la leyenda en el mapa
var miLeyenda = crearLeyenda(palette5, misValores, 'Nivel de precisión de la Alerta Forestal');

print('✅ Leyenda añadida al mapa. Puede arrastrarse si molesta.');






















function ejecutarAnalisisCompleto(fechaTexto) {
  print('🔍 Iniciando análisis para:', fechaTexto);
  
  // Limpiar capas anteriores (excepto las bases)
  var layers = mapPanel.layers();
  var keepLayers = 3; // Mantener: Elevación, Límites, y quizá otra base
  while (layers.length() > keepLayers) {
    mapPanel.remove(layers.get(layers.length() - 1));
  }


//============================================================
//         COLECCIONES
//============================================================


//============================================================-
//        OTROS
//============================================================
// AOI - Santiago del Estero

function maskingAgro(image){
    var mask= image.clip(AGRO).mask()
    var inverter=mask.not()
    var inverter=image.updateMask(inverter)
    
    return inverter;
}

//============================================================
//        DATES
//============================================================

var today = ee.Date(fechaTexto);
var last2Week = today.advance(-15, 'days');
var startDate = today.advance(-16, 'days');
var lastYear = startDate.advance(-710, 'days');
var last3Months = startDate.advance(-90, 'days');


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
//        SENTINEL COLECTION 
//============================================================
var sentinelFunction = function(start, end) {
  var filtered = sentinel2
    .filterBounds(santiagoDelEsteroFeature)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 85))
    .select(['B2', 'B3', 'B4', 'B8', 'B11']); // Incluir SCL para máscara de nubes

  var csPlusBands = csPlus.first().bandNames();
  var filteredS2WithCs = filtered.linkCollection(csPlus, csPlusBands);

  // Function to mask pixels with low CS+ QA scores con umbrales diferenciados
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


      
  var rangeLastYear = sentinelFunction(lastYear,startDate)
  var rangeLast3Months = sentinelFunction(last3Months,startDate) //no se solapan
  var rangeLastWeek= sentinelFunction(last2Week, today)
  var rangeToVis=sentinelFunction(last3Months, today)
  
  

    

//COMPOSITES RGB

  //var imageLastYear = rangeLastYear.median();//usefully
  var imageToVis = rangeToVis.mosaic();//usefully
  var imageLastWeek = rangeLastWeek.mosaic();//lly

  



//============================================================
//        VISUALES
//============================================================

    //ndvi
    var NDVIpalette = [
      'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
      '74A901', '66A000', '529400', '3E8601', '207401', '056201',
      '004C00', '023B01', '012E01', '011D01', '011301'];
  
    var ndviVis = {
      min:0, 
      max:1, 
      palette: NDVIpalette };

    //rgb
    var rgbVis = {
      min: 0.0,
      max: 3000,
      bands: ['B4', 'B3', 'B2']};
  

    var palette2 = ['#454546', '#666666', '#8c8c8c'];
    var palette3 = ['#ff0000', '#e00000'];

  
  
  
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

//RESULTS----------------------------------------------------------------------------------------------
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

  if (capas.rgb.getValue()) {
    mapPanel.addLayer(imageToVis.clip(santiagoDelEsteroFeature), rgbVis, 'Imagen más reciente de la superficie',true);
  }

  if(capas.alertas.getValue()){
    mapPanel.addLayer(sumaPonderada.updateMask(sumaPonderada.select('nbr').lte(3)).unmask().clip(santiagoDelEsteroFeature), {min: 0, max: 3, palette: palette2}, 'ZONAS SIN RIESGO DE ALERTA DE DEFORESTACIÓN',true);
    mapPanel.addLayer(sumaPonderada.updateMask(maxUmbralMask_1and2).focalMax(3), {min: 4, max: 5, palette: palette3}, 'ALERTAS DE DEFORESTACIÓN',true);
  }
  
  if(capas.incendios.getValue()){
    mapPanel.addLayer(condSobreMaximo.clip(santiagoDelEsteroFeature).selfMask().focalMax(8), {min:0, max:1, palette: ['yellow']}, 'POSIBLES INCENDIOS', true);
  }

}



