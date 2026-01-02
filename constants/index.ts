import { DataItemsType } from "@/types";

export const usersAuth = ['santiago', 'ana'];
export const passwordsAuth = ['159753', '654987'];

export const DATA_ITEMS: DataItemsType = {
  '00 General': [
      '00-00 Varios',
      '00-01 Auxilio'
  ],
  
  '01 Motor': [
      '01-00 Motor, conjunto',
      '01-01 Culata',
      '01-05 Bloque motor',
      '01-10 Tren alternativo',
      '01-15 Distribución',
      '01-20 Sistema de lubricación',
      '01-25 Colector de escape',
      '01-30 Turbocompresor',
      '01-35 Unidad de turbocompound',
      '01-40 Colector de admisión',
      '01-45 Toma de aire',
      '01-50 Suspensión del motor',
      '01-55 Toma de fuerza',
      '01-65 Circuito EGR',
      '01-95 Localizac averías y sintomas',
      '01-96 Conversión'
    ],
    '02 Sistema de refrigeración': [
      '02-00 Sistema de refrigeración, conj',
      '02-01 Radiador',
      '02-05 Intercooler',
      '02-06 Ventilador',
      '02-15 Carcasa del termostato',
      '02-25 Bomba de refrígerante',
      '02-30 Tuberías y tubos flexibles',
      '02-33 Sist refr, bat prp electr pot',
      '02-40 Calefactor aux, circuito refrg',
      '02-96 Conversión'
    ],
    '03 Sistema combustible y escape': [
      '03-00 Sist combustib y escape, conj',
      '03-01 Bomba inyección e inyectores',
      '03-05 Unidad filtrado combustible',
      '03-15 Turbos de combustible',
      '03-20 Depósito de combustible',
      '03-25 Sistema de escape',
      '03-26 Postratamiento gases de esc.',
      '03-40 Panel de gas',
      '03-95 Localizac averias y síntomas',
      '03-96 Conversión',
      '03-98 Sistema control electrónico'
    ],
    '04 Embrague': [
      '04-00 Embrague, conjunto'
      , '04-01 Mecan accionamiento embrague',
      '04-10 Disco de embrague'
    ],
    '05 Caja de cambios': [
      '05-00 Caja de cambios, conjunto',
      '05-01 Cárter de la caja de cambios',
      '05-10 Ejes y engranajes',
      '05-12 Máquina elétrica',
      '05-15 Engranaje planetario',
      '05-20 Mecanismo del cambio',
      '05-25 Suspensión de caja de cambios',
      '05-30 Sistema de refrigeración',
      '05-35 Toma de fuerza',
      '05-35 Ralentizador integrado',
      '05-52 Ralentizador',
      '05-98 Sistema control electrónico'
    ],
    '06 Arbol de transmisión': [
      '06-00 Arbol de transmisión, conjunto',
      '06-01 Arbol de transmisión',
      '06-05 Arbol transmisión intermedio'
    ],
    '07 Eje delantero': [
      '07-00 Localizac averías y sintomas',
      '07-10 Grupo conico',
      '07-15 Accionam. bloqueo diferencial'
    ],
    '08 Puente trasero': [
      '08-01 Cuerpo del eje trasero',
      '08-05 Grupo cónico',
      '08-10 Accionam bloqueo diferencial',
      '08-15 Eje portador',
      '08-20 Eje portador dirigido',
      '08-96 Conversión'
    ],
    '09 Cubos y ruedas': [
      '09-00 Cubos y ruedas, conjunto',
      '09-01 Cubo de rueda delantera',
      '09-05 Cubo de rueda trasera',
      '09-10 Cubo del eje portador',
      '09-20 Rueda'
    ],
    '10 Frenos': [
      '10-00 Sistema de frenos, conjunto',
      '10-01 Freno de rueda',
      '10-05 Cilindro de freno',
      '10-15 Compresor',
      '10-25 Circuito de alimentación',
      '10-30 Circuito freno estacionamiento',
      '10-35 Circuito de freno de servicio',
      '10-40 Circuito frenos del remolque',
      '10-45 Freno de escape',
      '10-75 Diagrama neumatico',
      '10-98 Sistema control electrónico'
    ],
    '12 Suspensión': [
      '12-00 Suspensión, conjunto',
      '12-01 Muelle de diafragma',
      '12-05 Fuelle neumatico',
      '12-15 Circuito suspensión neumatica',
      '12-25 Amortiguador',
      '12-30 Barra estabilizadora',
      '12-35 Elevador del eje portador',
      '12-40 Suspensión del bogie',
      '12-75 Diagrama neumático',
      '12-98 Sistema control electrónico'
    ],
    '13 Dirección': ['13-00 Dirección, conjunto',
      '13-01 Volante y columna de dirección',
      '13-05 Mecanismo de la servodirección',
      '13-10 Barra de articulación',
      '13-15 Bomba hidráulica',
      '13-20 Tuberias y tubos flexibles'
    ],
    '16 Sistema eléctrico': [
      '16-00 Sistema elétrico, conjunto',
      '16-01 Caja de fusibles y relés',
      '16-05 Alernador',
      '16-08 Sistema de encendido',
      '16-10 Motor de arranque',
      '16-15 Equipo eléctrico',
      '16-20 Iluminación',
      '16-25 Bateria',
      '16-26 Bater prop y electrón potencia',
      '16-27 Bateria de propulsion',
      '16-45 Mazo de cables, motor',
      '16-70 Componentes eléctricos',
      '16-75 Diagrama elétrico',
      '16-95 Localizac averias y sintomas',
      '16-96 Conversión',
      '16-97 Mazo cables, electrón potencia'
    ]
}
  
export const BRAND_TRUCK = [
  'Iveco',
  'Mercedes-Benz',
  'Scania',
  'Volvo',
  'Ford'
];

export const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  
  if (isNaN(num)) return '0,00';

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

export const parseInputToNumber = (value: string): number => {
  const cleaned = value.replace(/[^\d,.-]/g, '');
  const numericString = cleaned.replace(/\./g, '').replace(',', '.');
  return parseFloat(numericString) || 0;
};

// export const formatBudgetId = (idString: string): string => {
//   // Validar que sea string de 12 dígitos
//   if (!/^\d{12}$/.test(idString)) {
//     throw new Error('El ID debe contener exactamente 12 dígitos');
//   }

//   // Encontrar la posición del primer dígito no cero
//   const firstNonZero = idString.search(/[1-9]/);
  
//   // Caso especial para cuando todos son ceros
//   if (firstNonZero === -1) {
//     return '000000000000-0';
//   }

//   // Dividir el string en ceros iniciales y el número
//   const zeros = idString.substring(0, firstNonZero);
//   const numberPart = idString.substring(firstNonZero);

//   // Formatear con guión
//   return `${zeros}-${numberPart}`;
// };