import { FLIGHTAPI_KEY } from 'astro:env/server';
import {
  siteConfig,
  discoverMenu,
  tripsMenu,
  headerLinks,
  currencies,
  cities,
  bookingTabs,
  cabins,
  loginInvite,
  promoBanner,
  serviceLinks,
  offers,
  offerCategories,
  hotels,
  campaigns,
  moreOptions,
  popularDestinations,
  passCta,
  experienceSlides,
  creditCard,
  footerColumns,
  socials,
  cookieBanner,
  type City,
} from '../data/mockData';
import { buildFareOptions } from '../data/fareBrands';
import { fetchFlightApi, isoDate, parseFlightApi, sortRecommended, type FlightResult } from './flightApi';
import { buildFlightCodeResolver } from './flightCodes';

const USE_MOCK = import.meta.env.USE_MOCK !== 'false';
const flightCodes = buildFlightCodeResolver(cities);

export async function getHomePageData() {
  if (USE_MOCK) {
    return {
      config: siteConfig,
      discoverMenu,
      tripsMenu,
      headerLinks,
      currencies,
      cities,
      bookingTabs,
      cabins,
      loginInvite,
      promoBanner,
      serviceLinks,
      offers,
      offerCategories,
      hotels,
      campaigns,
      moreOptions,
      popularDestinations,
      passCta,
      experienceSlides,
      creditCard,
      footerColumns,
      socials,
      cookieBanner,
    };
  }

  const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/homepage`);
  if (!res.ok) throw new Error('Failed to fetch homepage data');
  return res.json();
}

function cityByCode(code: string): City {
  return cities.find((c) => c.code === code) ?? { code, city: code, country: '', airport: '' };
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function isIsoDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function isEcuador(country?: string) {
  return /ecuador/i.test(country || '');
}

async function fetchResolvedFlights(params: {
  origin: string;
  destination: string;
  depart: string;
  adults: string;
  children: string;
  infants: string;
  cabin: string;
  domesticEcuador: boolean;
}) {
  const originCodes = flightCodes.resolve(params.origin);
  const destCodes = flightCodes.resolve(params.destination);
  const pairs: [string, string][] = [[originCodes[0], destCodes[0]]];

  if (originCodes.length > 1 || destCodes.length > 1) {
    for (const origin of originCodes) {
      for (const destination of destCodes) {
        if (origin !== originCodes[0] || destination !== destCodes[0]) {
          pairs.push([origin, destination]);
        }
      }
    }
  }

  const merged: FlightResult[] = [];
  const seen = new Set<string>();

  for (const [origin, destination] of pairs) {
    const payload = await fetchFlightApi({
      origin,
      destination,
      depart: params.depart,
      trip: 'oneway',
      adults: params.adults,
      children: params.children,
      infants: params.infants,
      cabin: params.cabin,
    });
    const rows = parseFlightApi(payload, params.cabin, { domesticEcuador: params.domesticEcuador });
    for (const row of rows) {
      const key = row.outboundLegId || row.id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
    if (merged.length && originCodes.length === 1 && destCodes.length === 1) break;
  }

  return merged.sort(sortRecommended).slice(0, 40);
}

function mockFlight(
  id: string,
  flightNumber: string,
  depart: string,
  arrive: string,
  price: number,
  cabin: string,
): FlightResult {
  const hour = Number(depart.slice(0, 2));
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return {
    id,
    outboundLegId: id,
    airline: 'LATAM Airlines',
    flightNumber,
    depart,
    arrive,
    duration: '0 h 55 min',
    durationMinutes: 55,
    stops: 'Directo',
    stopCount: 0,
    period,
    date: '',
    price,
    fare: '',
    latam: true,
    arriveNextDay: false,
    operators: [{ name: 'LATAM Airlines Ecuador', code: 'XL' }],
    itinerary: [{
      flightNumber,
      operator: 'LATAM Airlines Ecuador',
      operatorCode: 'XL',
      depart,
      arrive,
      duration: '0 h 55 min',
      durationMinutes: 55,
      originCode: '',
      originCity: '',
      originAirport: '',
      destCode: '',
      destCity: '',
      destAirport: '',
    }],
    fareOptions: buildFareOptions(price, cabin),
  };
}

function mockResults(cabin: string): FlightResult[] {
  return [
    mockFlight('1', 'LA 1402', '06:15', '07:10', 64.14, cabin),
    mockFlight('2', 'LA 1406', '10:40', '11:35', 78.9, cabin),
    mockFlight('3', 'LA 1410', '16:20', '17:15', 92.5, cabin),
    mockFlight('4', 'LA 1414', '20:05', '21:00', 54.0, cabin),
  ];
}

export async function searchFlights(params: Record<string, string>) {
  const origin = (params.origin || '').toUpperCase();
  const destination = (params.destination || '').toUpperCase();
  const trip = params.trip || 'roundtrip';
  const cabin = params.cabin || 'Economy';
  const adults = params.adults || '1';
  const children = params.children || '0';
  const infants = params.infants || '0';
  const from = cityByCode(origin);
  const to = cityByCode(destination);
  const today = isoDate(new Date());
  const depart = isIsoDate(params.depart) ? params.depart : addDays(today, 14);
  const returnDate = isIsoDate(params.return)
    ? params.return
    : trip === 'oneway'
      ? undefined
      : addDays(depart, 7);

  const base = {
    from,
    to,
    trip,
    cabin,
    passengers: Number(adults),
    children: Number(children),
    infants: Number(infants),
    depart,
    returnDate,
  };

  const key = FLIGHTAPI_KEY;
  if (key) {
    const bound = params.bound === 'return' ? 'return' : 'outbound';
    const quoteOrigin = bound === 'return' ? destination : origin;
    const quoteDest = bound === 'return' ? origin : destination;
    const quoteDate = bound === 'return' ? (returnDate || depart) : depart;
    try {
      const results = await fetchResolvedFlights({
        origin: quoteOrigin,
        destination: quoteDest,
        depart: quoteDate,
        adults,
        children,
        infants,
        cabin,
        domesticEcuador: isEcuador(from.country) && isEcuador(to.country),
      });
      return {
        ...base,
        bound,
        source: 'flightapi' as const,
        results,
      };
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'No se pudieron consultar las tarifas.';
      const message = /<\s*!doctype|FlightAPI \d{3}/i.test(raw)
        ? 'Tuvimos un problema con los resultados. Inténtalo nuevamente.'
        : raw;
      return { ...base, bound, source: 'flightapi' as const, results: [] as FlightResult[], error: message };
    }
  }

  if (USE_MOCK) {
    return { ...base, source: 'mock' as const, results: mockResults(cabin) };
  }

  const qs = new URLSearchParams(params);
  const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/flights?${qs}`);
  if (!res.ok) throw new Error('Failed to search flights');
  return res.json();
}

export { cities };
