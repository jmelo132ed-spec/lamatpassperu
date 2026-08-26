import citiesJson from './cities.json';

export const siteConfig = {
  name: 'LATAM Airlines',
  country: 'Perú',
  locale: 'es-PE',
  currency: 'USD',
  currencySymbol: '$',
  title: 'Cotiza Vuelos, Paquetes, Hoteles y Carros | LATAM en Perú',
  description:
    'Cotiza y compra vuelos, paquetes, hoteles y autos con LATAM Airlines Perú. Acumula Millas LATAM Pass.',
};

export type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  icon?: string;
};

export type NavGroup = {
  label: string;
  href?: string;
  items?: NavLink[];
};

export const discoverMenu: NavLink[] = [
  { label: 'Ofertas', href: '/ofertas' },
  { label: 'Destinos', href: '/destinos' },
  { label: 'Paquetes turísticos', href: '/paquetes' },
  { label: 'Alojamientos', href: '/alojamientos' },
  { label: 'Alquiler de autos', href: '/autos' },
  { label: 'Universal', href: '/universal' },
  { label: 'Actividades', href: '/actividades' },
  { label: 'eSIM', href: '/esim' },
  { label: 'Traslados', href: '/traslados' },
  { label: 'Asistencia en viaje', href: '/asistencia' },
  { label: 'Más servicios', href: '/servicios' },
];

export const tripsMenu: NavLink[] = [
  { label: 'Administrar tus viajes', href: '/mis-viajes' },
  { label: 'Check-in', href: '/check-in' },
];

export const headerLinks = {
  help: { label: 'Centro de ayuda', href: '/ayuda' },
  flightStatus: { label: 'Estado de vuelo', href: '/estado-de-vuelo' },
  pass: { label: 'LATAM Pass', href: 'https://www.latamairlines.com/pe/es/latam-pass', external: true },
  login: { label: 'Iniciar sesión', href: '/login' },
};

export const currencies = [
  { code: 'USD', symbol: '$', name: 'Dólares americanos', country: 'PE' },
  { code: 'COP', symbol: '$', name: 'Pesos colombianos', country: 'CO' },
  { code: 'EUR', symbol: '€', name: 'Euros', country: 'ES' },
  { code: 'BRL', symbol: 'R$', name: 'Reales brasileños', country: 'BR' },
];

export type City = {
  code: string;
  city: string;
  country: string;
  airport: string;
  type?: 'AIRPORT' | 'CITY' | 'RAILWAY_STATION';
};

export const cities: City[] = citiesJson as City[];

export const bookingTabs = [
  { id: 'para-tu-viaje', label: 'Arma tu viaje' },
  { id: 'vuelos', label: 'Vuelos' },
  { id: 'paquetes', label: 'Paquetes' },
  { id: 'alojamientos', label: 'Alojamientos' },
  { id: 'carros', label: 'Carros' },
  { id: 'asistencia', label: 'Asistencia en viaje' },
  { id: 'upgrade', label: 'Upgrade' },
  { id: 'esim', label: 'eSIM' },
  { id: 'universal', label: 'Universal' },
];

export const cabins = ['Economy', 'Premium Economy', 'Premium Business'];

export const loginInvite = {
  title: 'Inicia sesión en LATAM y podrás:',
  items: [
    'Acumular y canjear Millas LATAM Pass por pasajes y más.',
    'Administrar tus viajes.',
    'Pagar con tu LATAM Wallet.',
  ],
};

export const promoBanner = {
  badge: '¡CYBER LATAM!',
  title: 'Hasta 42% dcto. 🚨 ¡Ofertas Cyber activas!',
  text: 'Perú y el mundo se recorren mejor en avión. ✈️ Compra pasajes hoy y vuela con el servicio que mereces.',
  cta: 'Comprar pasajes',
  href: '/ofertas',
  image: '/images/promo-cyber.png',
};

export const serviceLinks = [
  { id: 'esim', label: 'eSIM', href: '/esim', icon: 'esim' },
  { id: 'traslados', label: 'Traslados', href: '/traslados', icon: 'transfer' },
  { id: 'actividades', label: 'Actividades', href: '/actividades', icon: 'activity' },
  { id: 'millas', label: 'Canje de millas', href: '/canje-millas', icon: 'miles' },
];

export type Offer = {
  id: string;
  city: string;
  image: string;
  badge: string;
  trip: string;
  date: string;
  cabin: string;
  price: number;
  miles: number;
  discount: number;
  direct: boolean;
  category: string;
  from: string;
};

export const offers: Offer[] = [
  {
    id: 'cuz',
    city: 'Cusco',
    image: '/images/landing/cuenca.png',
    badge: '¡CYBER LATAM!',
    trip: 'Solo ida',
    date: '03/09/26',
    cabin: 'Economy',
    price: 64.14,
    miles: 12800,
    discount: 31,
    direct: true,
    category: 'en-oferta',
    from: 'LIM',
  },
  {
    id: 'piu',
    city: 'Piura',
    image: '/images/landing/manta.png',
    badge: '¡CYBER LATAM!',
    trip: 'Solo ida',
    date: '03/09/26',
    cabin: 'Economy',
    price: 48.04,
    miles: 9600,
    discount: 13,
    direct: true,
    category: 'destinos-playeros',
    from: 'LIM',
  },
  {
    id: 'aqp',
    city: 'Arequipa',
    image: '/images/landing/guayaquil.png',
    badge: '¡CYBER LATAM!',
    trip: 'Solo ida',
    date: '03/09/26',
    cabin: 'Economy',
    price: 64.14,
    miles: 12800,
    discount: 16,
    direct: true,
    category: 'aventuras-urbanas',
    from: 'LIM',
  },
  {
    id: 'bog',
    city: 'Bogotá',
    image: '/images/landing/bogota.png',
    badge: '¡CYBER LATAM!',
    trip: 'Solo ida',
    date: '03/09/26',
    cabin: 'Economy',
    price: 152.19,
    miles: 30400,
    discount: 18,
    direct: true,
    category: 'vida-nocturna',
    from: 'LIM',
  },
  {
    id: 'mia',
    city: 'Miami',
    image: '/images/landing/miami.png',
    badge: '¡CYBER LATAM!',
    trip: 'Ida 23/09/26 · Vuelta 01/10/26',
    date: '23/09/26',
    cabin: 'Economy',
    price: 451.12,
    miles: 90200,
    discount: 23,
    direct: true,
    category: 'en-oferta',
    from: 'LIM',
  },
];

export const offerCategories = [
  { id: 'en-oferta', label: 'En oferta', icon: 'tag' },
  { id: 'destinos-playeros', label: 'Destinos playeros', icon: 'palm' },
  { id: 'aventuras-urbanas', label: 'Aventuras urbanas', icon: 'city' },
  { id: 'vida-nocturna', label: 'Vida nocturna', icon: 'night' },
  { id: 'retiros-naturales', label: 'Retiros naturales', icon: 'nature' },
  { id: 'joyas-sudamericanas', label: 'Joyas Sudamericanas', icon: 'gem' },
];

export const hotels = [
  {
    city: 'Río de Janeiro, Brasil',
    image: '/images/hotels/rio.jpg',
    price: 109.28,
    unit: 'Por noche',
    people: '2 adultos',
    href: '/alojamientos?destino=RIO',
  },
  {
    city: 'Miami, Estados Unidos',
    image: '/images/offers/miami.jpg',
    price: 627.57,
    unit: 'Por 3 noches',
    people: '2 adultos',
    href: '/alojamientos?destino=MIA',
  },
];

export const campaigns = [
  {
    kicker: 'Arma tu paquete ideal: Vuelo + Hotel ✨',
    title: '¿Y si mejor ahorras con un paquete de viaje? ✈️🏨',
    cta: '¡Arma tu paquete!',
    image: '/images/campaigns/paquete.jpg',
    href: '/paquetes',
  },
  {
    kicker: '¿Ya tienes el pasaje? ✈️',
    title: 'Reserva tu alojamiento en el único lugar donde sumas Millas LATAM Pass para seguir viajando. ✨',
    cta: '¡Reservar!',
    image: '/images/campaigns/hotel.jpg',
    href: '/alojamientos',
  },
  {
    kicker: '¿Ya aseguraste tu viaje? 🤔',
    title: 'Contrata Assist Card y obtén telemedicina 24/7 y mucho más. Además, acumulas Millas LATAM Pass. ✨',
    cta: 'Asegura tu viaje aquí',
    image: '/images/campaigns/assist.jpg',
    href: '/asistencia',
  },
];

export const moreOptions = [
  {
    title: 'Compra tu paquete ideal y acumula 3 millas por dólar gastado',
    badge: 'Acumula millas y puntos calificables',
    cta: 'Comprar un paquete',
    href: '/paquetes',
    image: '/images/more/packages.svg',
  },
  {
    title: '¡Aprovecha desde 15% de descuento! Acumula Millas LATAM y puntos calificables',
    badge: 'Acumula Millas',
    cta: 'Reservar alojamiento',
    href: '/alojamientos',
    image: '/images/more/hotels.svg',
  },
  {
    title: 'Ten un auto esperando en tu próximo destino y acumula millas',
    badge: 'Acumula Millas',
    cta: 'Arrendar un auto',
    href: '/autos',
    image: '/images/more/cars.svg',
  },
  {
    title: '¡Viaja sin preocupaciones! Compra tu asistencia en viajes y acumula 3 millas por dólar gastado.',
    badge: 'Acumula millas y puntos calificables',
    cta: 'Cotizar asistencia',
    href: '/asistencia',
    image: '/images/more/insurance.svg',
  },
];

export const popularDestinations = [
  { rank: 1, city: 'Cusco', image: '/images/landing/cuenca.png', href: '/destinos/cusco' },
  { rank: 2, city: 'Piura', image: '/images/landing/manta.png', href: '/destinos/piura' },
  { rank: 3, city: 'Buenos Aires', image: '/images/landing/buenos-aires.png', href: '/destinos/buenos-aires' },
  {
    rank: 4,
    city: 'Iquitos',
    image: '/images/landing/galapagos.png',
    href: '/destinos/iquitos',
  },
];

export const passCta = {
  title: 'Crea tu cuenta y obtén beneficios LATAM Pass',
  items: [
    'Acumula Millas LATAM Pass en todas tus compras.',
    'Obtén beneficios exclusivos en equipaje, Upgrade de cabina y más.',
    'Canjea pasajes y productos con tus Millas LATAM Pass.',
  ],
  login: 'Iniciar sesión',
  signup: 'Crear cuenta',
};

export const experienceSlides = [
  {
    title: 'Prepara tu viaje',
    text: 'Conoce más sobre lo que necesitas saber con anticipación al preparar tu viaje.',
    image: '/images/experience/prepare.jpg',
    href: '/experiencia/prepara-tu-viaje',
  },
  {
    title: 'Embarque',
    text: 'Conoce más sobre el embarque, información relevante si tienes que hacer una conexión, y más.',
    image: '/images/experience/board.jpg',
    href: '/experiencia/embarque',
  },
  {
    title: 'A bordo',
    text: 'Conoce más sobre nuestros servicios a bordo durante el vuelo.',
    image: '/images/experience/inflight.jpg',
    href: '/experiencia/a-bordo',
  },
  {
    title: 'Experiencia LATAM',
    text: 'Conoce toda la experiencia LATAM',
    image: '/images/experience/prepare.jpg',
    href: '/experiencia',
  },
];

export const creditCard = {
  title: 'Pide tu Tarjeta LATAM Pass Banco de Crédito y obtén hasta 6.000 millas.',
  cta: 'Solicitar tarjeta',
  image: '/images/latam-pass-card.svg',
  href: '/tarjeta-latam-pass',
};

export const footerColumns = [
  {
    title: 'LATAM Airlines',
    links: [
      { label: 'Inicio', href: '/' },
      { label: 'Acerca de LATAM', href: '/acerca-de' },
      { label: 'Experiencia LATAM', href: '/experiencia' },
      { label: 'Prepara tu viaje', href: '/prepara-tu-viaje' },
      { label: 'Mis viajes', href: '/mis-viajes' },
      { label: 'Estado de vuelo', href: '/estado-de-vuelo' },
      { label: 'Check-in', href: '/check-in' },
      { label: 'Destinos', href: '/destinos' },
      { label: 'LATAM Wallet', href: '/wallet' },
      { label: 'Crea tu cuenta', href: '/login' },
      { label: 'Centro de ayuda', href: '/ayuda' },
      { label: 'Sala de prensa', href: '/prensa' },
      { label: 'Sostenibilidad', href: '/sostenibilidad' },
    ],
  },
  {
    title: 'Información legal',
    links: [
      { label: 'Condiciones de contrato de transporte', href: '/legal/contrato' },
      { label: 'Cargos por servicio', href: '/legal/cargos' },
      { label: 'Políticas de privacidad y seguridad', href: '/legal/privacidad' },
      { label: 'Términos y condiciones generales', href: '/legal/terminos' },
      { label: 'Política sobre cookies', href: '/legal/cookies' },
      { label: 'Términos de uso', href: '/legal/uso' },
      { label: 'Conoce tus derechos', href: '/legal/derechos' },
      { label: 'Reorganización financiera / Capítulo 11', href: '/legal/capitulo-11' },
    ],
  },
  {
    title: 'Portales asociados',
    links: [
      { label: 'LATAM Pass', href: 'https://www.latamairlines.com/pe/es/latam-pass', external: true },
      { label: 'Paquetes, hoteles y más', href: '/paquetes' },
      { label: 'LATAM Cargo', href: 'https://www.latamcargo.com', external: true },
      { label: 'LATAM Corporate', href: '/corporate' },
      { label: 'Trabaja con nosotros', href: '/empleos' },
      { label: 'Relación con inversionistas', href: '/inversionistas' },
    ],
  },
];

export const socials = [
  { label: 'Facebook', href: 'https://www.facebook.com/LATAMPeru', color: '#3A5795' },
  { label: 'Twitter', href: 'https://twitter.com/LATAMAirlines', color: '#5EA9DD' },
  { label: 'Youtube', href: 'https://www.youtube.com/user/lanairlines', color: '#CC181E' },
  { label: 'Instagram', href: 'https://www.instagram.com/latamairlines/', color: '#DC3175' },
];

export const cookieBanner = {
  text: 'Usamos cookies propias y de terceros para mejorar tu experiencia, analizar el tráfico y personalizar contenido. Al continuar, aceptas nuestra política de cookies.',
  accept: 'Aceptar',
  more: 'Política sobre cookies',
};
