const express = require('express');
const cors = require('cors');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const path = require('path');
const config = require('./config');

const app = express();
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Para imágenes grandes

// Configurar cliente de Google Cloud Vision
let client;
if (config.googleVision.useCredentialsFile) {
  // Usar archivo de credenciales
  client = new ImageAnnotatorClient({
    keyFilename: config.googleVision.credentialsFile
  });
} else {
  // Usar credenciales desde variable de entorno (más seguro)
  const credentials = JSON.parse(config.googleVision.credentialsJson);
  client = new ImageAnnotatorClient({
    credentials: credentials
  });
}

// Mapeo de categorías con palabras clave
const categoriasKeywords = {
  'Bebestible': [
    'agua', 'agua mineral', 'bebida', 'gaseosa', 'refresco', 'jugo', 'néctar', 'nectar', 'bebida energética',
    'cerveza', 'vino', 'whisky', 'ron', 'vodka', 'licor', 'champaña', 'espumante', 'champagne',
    'leche', 'leche chocolatada', 'leche saborizada', 'bebida láctea', 'yogur bebible',
    'té helado', 'limonada', 'agua saborizada', 'isotónica', 'hidratante', 'bebida isotónica',
    'cola', 'sprite', 'fanta', 'pepsi', 'coca', 'seven up', 'mirinda', 'crush', 'squirt',
    'powerade', 'gatorade', 'red bull', 'monster', 'rockstar', 'bebida deportiva'
  ],
  'Infusión': [
    'té', 'café', 'mate', 'yerba', 'infusión', 'té verde', 'té negro', 'té rojo',
    'café molido', 'café instantáneo', 'café en grano', 'té de hierbas', 'manzanilla',
    'boldo', 'menta', 'tilo', 'valeriana', 'té de frutas', 'café descafeinado',
    'té de manzanilla', 'té de boldo', 'té de menta', 'té de tilo', 'té de valeriana'
  ],
  'Verdura': [
    'lechuga', 'tomate', 'cebolla', 'zanahoria', 'papa', 'papas', 'zanahoria', 'zanahorias',
    'espinaca', 'acelga', 'brócoli', 'coliflor', 'repollo', 'col', 'pepino', 'zapallo',
    'zapallito', 'berenjena', 'pimiento', 'ají', 'choclo', 'arveja', 'poroto', 'lenteja',
    'garbanzo', 'haba', 'remolacha', 'rábano', 'nabo', 'apio', 'perejil', 'cilantro',
    'zanahoria', 'zanahorias', 'papa', 'papas', 'cebolla', 'cebollas', 'ajo', 'ajos'
  ],
  'Fruta': [
    'manzana', 'pera', 'plátano', 'banana', 'naranja', 'mandarina', 'limón', 'lima',
    'uva', 'durazno', 'melocotón', 'ciruela', 'cereza', 'fresa', 'frutilla', 'kiwi',
    'piña', 'ananá', 'mango', 'papaya', 'sandía', 'melón', 'higo', 'dátil', 'higo',
    'granada', 'frambuesa', 'mora', 'arándano', 'cranberry', 'blueberry', 'frutilla',
    'fresa', 'frutillas', 'fresas', 'manzana', 'manzanas', 'pera', 'peras'
  ],
  'Carne': [
    'carne', 'vacuno', 'bife', 'lomo', 'asado', 'matambre', 'carne molida', 'picada',
    'pollo', 'pavo', 'pavita', 'cerdo', 'chancho', 'cordero', 'conejo', 'pato',
    'hígado', 'riñón', 'corazón', 'lengua', 'sesos', 'molleja', 'menudo', 'callos',
    'filete', 'posta', 'paleta', 'carne de res', 'carne de vaca', 'carne de ternera'
  ],
  'Lácteo': [
    'leche', 'yogur', 'queso', 'mantequilla', 'manteca', 'crema', 'nata', 'requesón',
    'ricotta', 'cottage', 'queso rallado', 'queso crema', 'queso fresco', 'queso duro',
    'leche condensada', 'leche en polvo', 'leche evaporada', 'yogur griego', 'kéfir',
    'queso mozzarella', 'queso cheddar', 'queso parmesano', 'queso gouda', 'queso manchego'
  ],
  'Embutido': [
    'jamón', 'salchicha', 'chorizo', 'mortadela', 'salami', 'pepperoni', 'panceta',
    'tocino', 'bacon', 'longaniza', 'butifarra', 'fuet', 'sobrasada', 'pastrami',
    'pate', 'paté', 'fiambre', 'embutido', 'salame', 'bondiola', 'jamón serrano',
    'jamón cocido', 'jamón de pavo', 'jamón de pollo'
  ],
  'Aceites y Grasas': [
    'aceite', 'aceite de oliva', 'aceite de girasol', 'aceite de maíz', 'aceite de soja',
    'mantequilla', 'manteca', 'margarina', 'grasa', 'manteca de cerdo', 'ghee',
    'aceite de coco', 'aceite de palma', 'aceite de canola', 'aceite de sésamo',
    'aceite vegetal', 'aceite de canola', 'aceite de girasol'
  ],
  'Pastas y Arroces': [
    'pasta', 'fideo', 'espagueti', 'tallarín', 'ravioles', 'lasaña', 'canelones',
    'arroz', 'arroz blanco', 'arroz integral', 'arroz basmati', 'arroz jazmín',
    'arroz arborio', 'arroz bomba', 'arroz salvaje', 'quinoa', 'couscous', 'bulgur',
    'fideos', 'espaguetis', 'tallarines', 'raviolis', 'lasaña', 'canelones'
  ],
  'Masas y Premezclas': [
    'harina', 'harina de trigo', 'harina integral', 'harina de maíz', 'harina de arroz',
    'levadura', 'polvo de hornear', 'bicarbonato', 'azúcar', 'azúcar refinada',
    'azúcar morena', 'azúcar impalpable', 'azúcar glass', 'almidón', 'maicena',
    'premezcla', 'mezcla', 'preparado', 'base para', 'mix', 'harina de trigo',
    'harina integral', 'harina de maíz', 'harina de arroz'
  ],
  'Snack': [
    'galleta', 'galletita', 'galletón', 'galleta salada', 'crackers', 'papas fritas',
    'chips', 'palitos', 'snack', 'tentempié', 'bocadillo', 'aperitivo', 'frutos secos',
    'maní', 'almendra', 'nuez', 'pistacho', 'avellana', 'castaña', 'dátil', 'pasas',
    'chocolate', 'caramelo', 'dulce', 'golosina', 'confite', 'bombón', 'galletas',
    'galletitas', 'galletones', 'crackers', 'papas fritas', 'chips'
  ],
  'Enlatado': [
    'atún', 'sardina', 'salmón', 'pescado en lata', 'conserva', 'enlatado', 'lata',
    'frijoles', 'porotos', 'garbanzos', 'lentejas', 'arvejas', 'choclo en lata',
    'tomate en lata', 'sopa en lata', 'verduras en lata', 'frutas en lata',
    'atún en lata', 'sardinas en lata', 'salmón en lata'
  ],
  'Congelado': [
    'congelado', 'frozen', 'helado', 'pizza congelada', 'papas congeladas',
    'verduras congeladas', 'frutas congeladas', 'pescado congelado', 'carne congelada',
    'empanadas congeladas', 'lasaña congelada', 'hamburguesa congelada',
    'helados', 'pizza congelada', 'papas congeladas'
  ],
  'Panadería': [
    'pan', 'pan de molde', 'pan integral', 'pan blanco', 'pan francés', 'marraqueta',
    'hallulla', 'dona', 'donut', 'croissant', 'medialuna', 'factura', 'pastel',
    'torta', 'queque', 'bizcocho', 'galleta', 'galletita', 'galletón', 'bollo',
    'muffin', 'cupcake', 'tarta', 'pie', 'empanada', 'empanadilla', 'panes',
    'pan de molde', 'pan integral', 'pan blanco'
  ],
  'Condimento': [
    'sal', 'pimienta', 'orégano', 'albahaca', 'tomillo', 'romero', 'laurel',
    'comino', 'curry', 'cúrcuma', 'jengibre', 'canela', 'nuez moscada', 'clavo',
    'vainilla', 'extracto', 'esencia', 'salsa', 'ketchup', 'mostaza', 'mayonesa',
    'aderezo', 'vinagre', 'limón', 'ajo', 'cebolla en polvo', 'ajo en polvo',
    'salsa de tomate', 'ketchup', 'mostaza', 'mayonesa'
  ],
  'Otro': [
    'producto', 'artículo', 'mercancía', 'bien', 'consumo', 'hogar', 'casa'
  ]
};

// Labels de Google Vision que indican productos comestibles
const labelsComestibles = [
  'food', 'beverage', 'drink', 'juice', 'wine', 'alcohol', 'nectar', 'milk', 'dairy', 
  'meat', 'vegetable', 'fruit', 'grocery', 'cheese', 'pasta', 'noodles', 'condiment', 
  'spice', 'oil', 'tea', 'coffee', 'bread', 'cereal', 'snack', 'candy', 'chocolate',
  'sauce', 'soup', 'fish', 'chicken', 'beef', 'pork', 'rice', 'bean', 'nut', 'seed',
  'grain', 'flour', 'sugar', 'salt', 'pepper', 'herb', 'spice', 'seasoning',
  'preserve', 'jam', 'jelly', 'honey', 'syrup', 'vinegar', 'sauce', 'dressing',
  'spread', 'butter', 'margarine', 'cream', 'yogurt', 'yoghurt', 'ice cream',
  'dessert', 'cake', 'cookie', 'biscuit', 'cracker', 'chip', 'popcorn', 'pretzel',
  'nut', 'almond', 'walnut', 'peanut', 'cashew', 'pistachio', 'hazelnut',
  'raisin', 'date', 'prune', 'fig', 'apricot', 'peach', 'plum', 'cherry',
  'apple', 'orange', 'banana', 'grape', 'strawberry', 'blueberry', 'raspberry',
  'blackberry', 'cranberry', 'lemon', 'lime', 'grapefruit', 'tangerine', 'mandarin',
  'pineapple', 'mango', 'papaya', 'kiwi', 'avocado', 'tomato', 'potato', 'onion',
  'carrot', 'lettuce', 'spinach', 'kale', 'cabbage', 'broccoli', 'cauliflower',
  'cucumber', 'pepper', 'chili', 'garlic', 'ginger', 'turmeric', 'cinnamon',
  'vanilla', 'cocoa', 'chocolate', 'sweet', 'sugar', 'honey', 'syrup'
];

// Labels de Google Vision que indican productos NO comestibles
const labelsNoComestibles = [
  'toilet', 'paper', 'tissue', 'soap', 'detergent', 'cleaner', 'shampoo', 'toothpaste',
  'deodorant', 'perfume', 'cosmetic', 'makeup', 'brush', 'comb', 'razor', 'diaper',
  'sanitary', 'hygiene', 'cleaning', 'laundry', 'fabric', 'softener', 'bleach',
  'disinfectant', 'antiseptic', 'medicine', 'pill', 'tablet', 'capsule', 'syrup',
  'ointment', 'cream', 'lotion', 'sunscreen', 'suntan', 'tanning', 'nail polish',
  'lipstick', 'mascara', 'eyeliner', 'foundation', 'powder', 'blush', 'concealer',
  'makeup remover', 'facial cleanser', 'toner', 'moisturizer', 'serum', 'mask',
  'exfoliant', 'scrub', 'peel', 'anti-aging', 'anti-wrinkle', 'firming', 'lifting',
  'whitening', 'brightening', 'clarifying', 'purifying', 'detoxifying', 'calming',
  'soothing', 'healing', 'repairing', 'regenerating', 'renewing', 'refreshing',
  'invigorating', 'energizing', 'revitalizing', 'rejuvenating', 'nourishing',
  'hydrating', 'moisturizing', 'conditioning', 'smoothing', 'softening', 'strengthening',
  'protecting', 'shielding', 'guarding', 'defending', 'fortifying', 'reinforcing',
  'supporting', 'maintaining', 'preserving', 'conserving', 'sustaining', 'prolonging',
  'extending', 'enhancing', 'improving', 'optimizing', 'maximizing', 'amplifying',
  'intensifying', 'concentrating', 'purifying', 'clarifying', 'refining', 'polishing',
  'smoothing', 'softening', 'gentle', 'mild', 'sensitive', 'delicate', 'fragile',
  'tender', 'careful', 'cautious', 'protective', 'defensive', 'preventive', 'proactive'
];

// Función para verificar si un producto es comestible basándose en su texto
function esComestiblePorTexto(texto) {
  if (!texto) return true; // Si no hay texto, asumir que es comestible
  
  const textoLower = texto.toLowerCase();
  
  // Lista de palabras que indican productos NO comestibles
  const palabrasNoComestibles = [
    'confort', 'papel', 'higiénico', 'toilet', 'tissue', 'servilleta', 'pañal',
    'toalla', 'higiénica', 'tampón', 'protector', 'jabón', 'shampoo', 'detergente',
    'limpiador', 'limpia', 'cloro', 'desinfectante', 'perfume', 'desodorante',
    'crema', 'loción', 'maquillaje', 'cosmético', 'cepillo', 'pasta', 'dental',
    'enjuague', 'bucal', 'hilo', 'dental', 'cuchilla', 'maquinilla', 'afeitar',
    'protector', 'solar', 'bronceador', 'esmalte', 'uñas', 'quitaesmalte',
    'vela', 'incienso', 'ambientador', 'insecticida', 'repelente', 'mata',
    'medicina', 'medicamento', 'píldora', 'tableta', 'cápsula', 'jarabe',
    'pomada', 'ungüento', 'antiséptico', 'antibiótico', 'analgésico', 'antiinflamatorio'
  ];
  
  // Verificar si contiene palabras de productos no comestibles
  return !palabrasNoComestibles.some(palabra => textoLower.includes(palabra));
}

// Función para determinar si un producto es comestible basándose en los labels de Google Vision
function esComestiblePorLabels(labels, textoProducto = '') {
  if (!labels || labels.length === 0) {
    // Si no hay labels, verificar el texto del producto
    return esComestiblePorTexto(textoProducto);
  }
  
  const labelsLower = labels.map(l => l.description.toLowerCase());
  const textoLower = textoProducto.toLowerCase();
  
  // Contar coincidencias con labels comestibles
  const comestiblesCount = labelsLower.filter(label => 
    labelsComestibles.some(comestible => label.includes(comestible))
  ).length;
  
  // Contar coincidencias con labels no comestibles
  const noComestiblesCount = labelsLower.filter(label => 
    labelsNoComestibles.some(noComestible => label.includes(noComestible))
  ).length;
  
  // Verificar también el texto del producto
  const esComestibleTexto = esComestiblePorTexto(textoProducto);
  
  // Si el texto del producto indica que NO es comestible, excluirlo
  if (!esComestibleTexto) {
    return false;
  }
  
  // Si hay más labels de productos no comestibles, entonces no es comestible
  if (noComestiblesCount > comestiblesCount) {
    return false;
  }
  
  // Si hay al menos un label de producto comestible, es comestible
  if (comestiblesCount > 0) {
    return true;
  }
  
  // Si no hay labels claros, usar el resultado del análisis de texto
  return esComestibleTexto;
}

// Función para detectar categoría basada en texto y labels
function detectarCategoria(texto, labels) {
  const textoLower = texto.toLowerCase();
  const labelsLower = labels.map(l => l.description.toLowerCase());
  
  // Verificar si es comestible usando los labels de Google Vision y el texto del producto
  if (!esComestiblePorLabels(labels, texto)) {
    return null; // Retornar null para indicar que no es comestible
  }
  
  // Crear un mapa de puntuaciones por categoría
  const puntuaciones = {};
  
  // Inicializar puntuaciones
  Object.keys(categoriasKeywords).forEach(categoria => {
    puntuaciones[categoria] = 0;
  });
  
  // Evaluar texto detectado (peso mayor)
  Object.entries(categoriasKeywords).forEach(([categoria, keywords]) => {
    keywords.forEach(keyword => {
      if (textoLower.includes(keyword)) {
        puntuaciones[categoria] += 3; // Peso mayor para texto directo
      }
    });
  });
  
  // Evaluar labels de Google Vision (peso medio)
  Object.entries(categoriasKeywords).forEach(([categoria, keywords]) => {
    keywords.forEach(keyword => {
      labelsLower.forEach(label => {
        if (label.includes(keyword) || keyword.includes(label)) {
          puntuaciones[categoria] += 2; // Peso medio para labels
        }
      });
    });
  });
  
  // Mapeo directo de labels de Google Vision a categorías
  const mapeoLabelsCategoria = {
    'beverage': 'Bebestible',
    'drink': 'Bebestible',
    'juice': 'Bebestible',
    'wine': 'Bebestible',
    'alcohol': 'Bebestible',
    'nectar': 'Bebestible',
    'milk': 'Lácteo',
    'dairy': 'Lácteo',
    'cheese': 'Lácteo',
    'meat': 'Carne',
    'chicken': 'Carne',
    'beef': 'Carne',
    'pork': 'Carne',
    'fish': 'Carne',
    'vegetable': 'Verdura',
    'fruit': 'Fruta',
    'pasta': 'Pastas y Arroces',
    'noodles': 'Pastas y Arroces',
    'rice': 'Pastas y Arroces',
    'bread': 'Panadería',
    'cereal': 'Snack',
    'snack': 'Snack',
    'candy': 'Snack',
    'chocolate': 'Snack',
    'condiment': 'Condimento',
    'spice': 'Condimento',
    'oil': 'Aceites y Grasas',
    'tea': 'Infusión',
    'coffee': 'Infusión',
    'sauce': 'Condimento',
    'soup': 'Enlatado',
    'bean': 'Verdura',
    'nut': 'Snack',
    'seed': 'Snack',
    'grain': 'Pastas y Arroces',
    'flour': 'Masas y Premezclas',
    'sugar': 'Masas y Premezclas',
    'salt': 'Condimento',
    'pepper': 'Condimento',
    'herb': 'Condimento',
    'seasoning': 'Condimento',
    'preserve': 'Enlatado',
    'jam': 'Enlatado',
    'jelly': 'Enlatado',
    'honey': 'Condimento',
    'syrup': 'Condimento',
    'vinegar': 'Condimento',
    'dressing': 'Condimento',
    'spread': 'Condimento',
    'butter': 'Aceites y Grasas',
    'margarine': 'Aceites y Grasas',
    'cream': 'Lácteo',
    'yogurt': 'Lácteo',
    'yoghurt': 'Lácteo',
    'ice cream': 'Congelado',
    'dessert': 'Snack',
    'cake': 'Panadería',
    'cookie': 'Snack',
    'biscuit': 'Snack',
    'cracker': 'Snack',
    'chip': 'Snack',
    'popcorn': 'Snack',
    'pretzel': 'Snack',
    'almond': 'Snack',
    'walnut': 'Snack',
    'peanut': 'Snack',
    'cashew': 'Snack',
    'pistachio': 'Snack',
    'hazelnut': 'Snack',
    'raisin': 'Snack',
    'date': 'Snack',
    'prune': 'Snack',
    'fig': 'Fruta',
    'apricot': 'Fruta',
    'peach': 'Fruta',
    'plum': 'Fruta',
    'cherry': 'Fruta',
    'apple': 'Fruta',
    'orange': 'Fruta',
    'banana': 'Fruta',
    'grape': 'Fruta',
    'strawberry': 'Fruta',
    'blueberry': 'Fruta',
    'raspberry': 'Fruta',
    'blackberry': 'Fruta',
    'cranberry': 'Fruta',
    'lemon': 'Fruta',
    'lime': 'Fruta',
    'grapefruit': 'Fruta',
    'tangerine': 'Fruta',
    'mandarin': 'Fruta',
    'pineapple': 'Fruta',
    'mango': 'Fruta',
    'papaya': 'Fruta',
    'kiwi': 'Fruta',
    'avocado': 'Fruta',
    'tomato': 'Verdura',
    'potato': 'Verdura',
    'onion': 'Verdura',
    'carrot': 'Verdura',
    'lettuce': 'Verdura',
    'spinach': 'Verdura',
    'kale': 'Verdura',
    'cabbage': 'Verdura',
    'broccoli': 'Verdura',
    'cauliflower': 'Verdura',
    'cucumber': 'Verdura',
    'pepper': 'Verdura',
    'chili': 'Verdura',
    'garlic': 'Verdura',
    'ginger': 'Verdura',
    'turmeric': 'Condimento',
    'cinnamon': 'Condimento',
    'vanilla': 'Condimento',
    'cocoa': 'Snack'
  };
  
  // Aplicar mapeo directo de labels (peso alto)
  labelsLower.forEach(label => {
    Object.entries(mapeoLabelsCategoria).forEach(([labelKey, categoria]) => {
      if (label.includes(labelKey)) {
        puntuaciones[categoria] += 4; // Peso muy alto para mapeo directo
      }
    });
  });
  
  // Encontrar la categoría con mayor puntuación
  let mejorCategoria = 'Otro';
  let mejorPuntuacion = 0;
  
  Object.entries(puntuaciones).forEach(([categoria, puntuacion]) => {
    if (puntuacion > mejorPuntuacion) {
      mejorPuntuacion = puntuacion;
      mejorCategoria = categoria;
    }
  });
  
  // Si no hay coincidencias claras, usar 'Otro'
  if (mejorPuntuacion === 0) {
    return 'Otro';
  }
  
  return mejorCategoria;
}

app.post('/ocr', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      console.error('No imageBase64 en el body');
      return res.status(400).json({ error: 'No image provided' });
    }
    // Log para depuración
    console.log('Recibida imagen para OCR, tamaño:', imageBase64.length);
    console.log('Formato de imagen:', imageBase64.substring(0, 50) + '...');
    
    // Crear imagen para Vision API
    const imageContent = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    console.log('Contenido base64 procesado, tamaño:', imageContent.length);
    
    // Formato correcto para Google Vision API
    const image = {
      content: imageContent
    };

    // Crear requests para batch annotation
    const requests = [
      {
        image: image,
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'LABEL_DETECTION' }
        ]
      }
    ];

    // Ejecutar batch annotation
    const [result] = await client.batchAnnotateImages({ requests });
    const responses = result.responses[0];

    const text = responses.fullTextAnnotation?.text || '';
    const labels = responses.labelAnnotations || [];
    
    console.log('Respuesta de Google Vision:', text);
    console.log('Labels detectados:', labels.map(l => l.description));

    res.json({ 
      text, 
      labels: labels.map(l => ({
        description: l.description,
        confidence: l.score
      }))
    });
  } catch (error) {
    console.error('Error en /ocr:', error);
    res.status(500).json({ error: error.message });
  }
});

// Nueva ruta para detectar categorías de productos
app.post('/detectar-categoria', async (req, res) => {
  try {
    const { productos, labels } = req.body;
    
    if (!productos || !Array.isArray(productos)) {
      return res.status(400).json({ error: 'Se requiere array de productos' });
    }
    
    console.log('Labels recibidos:', labels?.map(l => l.description) || []);
    
    const productosConCategoria = productos
      .map(producto => {
        const categoria = detectarCategoria(producto.nombre, labels || []);
        console.log(`Producto: "${producto.nombre}" -> Categoría: ${categoria}`);
        return {
          ...producto,
          categoria
        };
      })
      .filter(producto => producto.categoria !== null); // Filtrar productos no comestibles
    
    console.log(`Productos filtrados: ${productosConCategoria.length} de ${productos.length}`);
    
    res.json({ productos: productosConCategoria });
  } catch (error) {
    console.error('Error en /detectar-categoria:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.send('OK');
});

const PORT = config.port;
app.listen(PORT, () => console.log(`OCR backend listening on port ${PORT}`)); 