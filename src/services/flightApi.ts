import { FLIGHTAPI_KEY } from 'astro:env/server';
import { buildFareOptions, type FareOption } from '../data/fareBrands';

export type FlightLegInfo = {
  depart: string;
  arrive: string;
  duration: string;
  durationMinutes: number;
  stops: string;
  stopCount: number;
  flightNumber: string;
  period: 'morning' | 'afternoon' | 'evening';
};

export type FlightOperator = {
  name: string;
  code: string;
};

export type FlightSegmentDetail = {
  flightNumber: string;
  operator: string;
  operatorCode: string;
  depart: string;
  arrive: string;
  duration: string;
  durationMinutes: number;
  originCode: string;
  originCity: string;
  originAirport: string;
  destCode: string;
  destCity: string;
  destAirport: string;
  layover?: string;
};

export type FlightResult = {
  id: string;
  outboundLegId: string;
  inboundLegId?: string;
  airline: string;
  flightNumber: string;
  depart: string;
  arrive: string;
  duration: string;
  durationMinutes: number;
  stops: string;
  stopCount: number;
  period: 'morning' | 'afternoon' | 'evening';
  date: string;
  price: number;
  fare: string;
  latam: boolean;
  arriveNextDay: boolean;
  operators: FlightOperator[];
  inbound?: FlightLegInfo;
  itinerary: FlightSegmentDetail[];
  fareOptions: FareOption[];
};

type FlightApiPayload = {
  itineraries?: Itinerary[];
  legs?: Leg[];
  segments?: Segment[];
  carriers?: Carrier[];
  places?: Place[];
};

type Itinerary = {
  id: string;
  leg_ids?: string[];
  pricing_options?: {
    agent_ids?: string[];
    price?: { amount?: number };
    items?: {
      agent_id?: string;
      price?: { amount?: number };
      fares?: { fare_family?: string; fare_basis_code?: string }[];
    }[];
  }[];
};

type Leg = {
  id: string;
  origin_place_id?: number;
  destination_place_id?: number;
  departure?: string;
  arrival?: string;
  duration?: number;
  stop_count?: number;
  segment_ids?: string[];
  marketing_carrier_ids?: number[];
  operating_carrier_ids?: number[];
};

type Segment = {
  id: string;
  origin_place_id?: number;
  destination_place_id?: number;
  departure?: string;
  arrival?: string;
  duration?: number;
  marketing_flight_number?: string;
  marketing_carrier_id?: number;
  operating_carrier_id?: number;
};

type Carrier = {
  id: number;
  name?: string;
  display_code?: string;
  alt_id?: string;
};

type Place = {
  id: number;
  name?: string;
  display_code?: string;
  type?: string;
  parent_id?: number;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mapCabin(cabin: string) {
  const value = cabin.toLowerCase();
  if (value.includes('premium') && value.includes('econ')) return 'Premium_Economy';
  if (value.includes('business') || value.includes('premium')) return 'Business';
  if (value.includes('first')) return 'First';
  return 'Economy';
}

function clock(iso?: string) {
  if (!iso) return '--:--';
  const match = String(iso).match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function durationLabel(mins?: number) {
  if (!mins && mins !== 0) return '—';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `0 h ${m} min`;
}

function isoDay(iso?: string) {
  const match = String(iso || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function minutesBetween(fromIso?: string, toIso?: string) {
  if (!fromIso || !toIso) return 0;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 60000));
}

function resolvePlace(id: number | undefined, places: Map<number, Place>) {
  const place = id != null ? places.get(id) : undefined;
  if (!place) return { code: '', city: '', airport: '' };
  const parent = place.parent_id != null ? places.get(place.parent_id) : undefined;
  const isAirport = /AIRPORT/i.test(place.type || '');
  const isCity = /CITY/i.test(place.type || '');
  let airport = isAirport ? (place.name || '') : '';
  if (!airport) {
    for (const child of places.values()) {
      if (child.parent_id === place.id && /AIRPORT/i.test(child.type || '') && child.name) {
        airport = child.name;
        break;
      }
    }
  }
  return {
    code: (place.display_code || parent?.display_code || '').toUpperCase(),
    city: isCity ? (place.name || '') : (parent?.name || place.name || ''),
    airport,
  };
}

function periodFromClock(time: string): FlightLegInfo['period'] {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function legInfo(
  outbound: Leg | undefined,
  segments: Map<string, Segment>,
  carriers: Map<number, Carrier>,
): FlightLegInfo {
  const firstSeg = outbound?.segment_ids?.[0] ? segments.get(outbound.segment_ids[0]) : undefined;
  const carrier = carriers.get(outbound?.marketing_carrier_ids?.[0] ?? firstSeg?.marketing_carrier_id ?? 0);
  const stops = outbound?.stop_count ?? 0;
  const mins = outbound?.duration || minutesBetween(outbound?.departure, outbound?.arrival);
  const depart = clock(outbound?.departure);
  return {
    depart,
    arrive: clock(outbound?.arrival),
    duration: durationLabel(mins),
    durationMinutes: mins,
    stops: stops === 0 ? 'Directo' : `${stops} parada${stops > 1 ? 's' : ''}`,
    stopCount: stops,
    flightNumber: firstSeg?.marketing_flight_number
      ? `${carrier?.display_code || 'LA'} ${firstSeg.marketing_flight_number}`
      : '',
    period: periodFromClock(depart),
  };
}

function buildItinerary(
  leg: Leg | undefined,
  segments: Map<string, Segment>,
  carriers: Map<number, Carrier>,
  places: Map<number, Place>,
  fallbackOperator: string,
): FlightSegmentDetail[] {
  const ids = leg?.segment_ids || [];
  return ids.map((id, index) => {
    const seg = segments.get(id);
    const marketing = carriers.get(seg?.marketing_carrier_id ?? 0);
    const operating = carriers.get(seg?.operating_carrier_id ?? 0);
    const carrier = operating || marketing;
    const origin = resolvePlace(seg?.origin_place_id ?? (index === 0 ? leg?.origin_place_id : undefined), places);
    const dest = resolvePlace(seg?.destination_place_id ?? (index === ids.length - 1 ? leg?.destination_place_id : undefined), places);
    const op = refineLatamOperator(
      operatorFromCarrier(carrier, fallbackOperator),
      origin.code,
      dest.code,
      origin.city,
      dest.city,
    );
    const next = ids[index + 1] ? segments.get(ids[index + 1]) : undefined;
    const wait = minutesBetween(seg?.arrival, next?.departure);
    return {
      flightNumber: seg?.marketing_flight_number
        ? `${marketing?.display_code || operating?.display_code || 'LA'} ${seg.marketing_flight_number}`
        : '',
      operator: op?.name || fallbackOperator,
      operatorCode: op?.code || iataCode(carrier),
      depart: clock(seg?.departure || (index === 0 ? leg?.departure : undefined)),
      arrive: clock(seg?.arrival || (index === ids.length - 1 ? leg?.arrival : undefined)),
      duration: durationLabel(seg?.duration),
      durationMinutes: seg?.duration || 0,
      originCode: origin.code,
      originCity: origin.city,
      originAirport: origin.airport,
      destCode: dest.code,
      destCity: dest.city,
      destAirport: dest.airport,
      layover: wait > 0 ? durationLabel(wait) : undefined,
    };
  });
}

function iataCode(carrier?: Carrier) {
  const alt = (carrier?.alt_id || '').toUpperCase();
  const display = (carrier?.display_code || '').toUpperCase();
  if (/^[A-Z0-9]{2}$/.test(alt)) return alt;
  if (/^[A-Z0-9]{2}$/.test(display)) return display;
  return display || alt;
}

const LATAM_OPERATOR_NAMES: Record<string, string> = {
  LA: 'LATAM Airlines',
  LP: 'LATAM Airlines Perú',
  XL: 'LATAM Airlines Ecuador',
  '4C': 'LATAM Airlines Colombia',
  JJ: 'LATAM Airlines Brasil',
  LU: 'LATAM Airlines Argentina',
  PZ: 'LATAM Airlines Paraguay',
};

function operatorFromCarrier(carrier: Carrier | undefined, fallback: string): FlightOperator | null {
  if (!carrier) return null;
  const code = iataCode(carrier);
  const raw = (carrier.name || '').trim();
  const mapped = LATAM_OPERATOR_NAMES[code];
  const specific = /ecuador|per[uú]|colombia|brasil|argentina|paraguay/i.test(raw);
  const name = (mapped && !specific ? mapped : raw) || mapped || fallback;
  if (!name) return null;
  return { name, code: code || 'LA' };
}

const LATAM_AIRPORT_SUBSIDIARY: Record<string, { name: string; code: string }> = {
  UIO: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  GYE: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  CUE: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  MEC: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  OCC: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  GPS: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  SCY: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  BOG: { name: 'LATAM Airlines Colombia', code: '4C' },
  MDE: { name: 'LATAM Airlines Colombia', code: '4C' },
  CLO: { name: 'LATAM Airlines Colombia', code: '4C' },
  CTG: { name: 'LATAM Airlines Colombia', code: '4C' },
  BAQ: { name: 'LATAM Airlines Colombia', code: '4C' },
  SMR: { name: 'LATAM Airlines Colombia', code: '4C' },
  PEI: { name: 'LATAM Airlines Colombia', code: '4C' },
  ADZ: { name: 'LATAM Airlines Colombia', code: '4C' },
  LIM: { name: 'LATAM Airlines Perú', code: 'LP' },
  CUZ: { name: 'LATAM Airlines Perú', code: 'LP' },
  AQP: { name: 'LATAM Airlines Perú', code: 'LP' },
  IQT: { name: 'LATAM Airlines Perú', code: 'LP' },
  PIU: { name: 'LATAM Airlines Perú', code: 'LP' },
  TRU: { name: 'LATAM Airlines Perú', code: 'LP' },
  TPP: { name: 'LATAM Airlines Perú', code: 'LP' },
  JUL: { name: 'LATAM Airlines Perú', code: 'LP' },
  PEM: { name: 'LATAM Airlines Perú', code: 'LP' },
  TCG: { name: 'LATAM Airlines Perú', code: 'LP' },
  CIX: { name: 'LATAM Airlines Perú', code: 'LP' },
  TCQ: { name: 'LATAM Airlines Perú', code: 'LP' },
  GRU: { name: 'LATAM Airlines Brasil', code: 'JJ' },
  GIG: { name: 'LATAM Airlines Brasil', code: 'JJ' },
  BSB: { name: 'LATAM Airlines Brasil', code: 'JJ' },
  CNF: { name: 'LATAM Airlines Brasil', code: 'JJ' },
};

function isGenericLatamName(name: string) {
  return /^(latam airlines|latam airlines group|latam)$/i.test(name.trim());
}

function subsidiaryFromPlace(code: string, city: string) {
  const iata = (code || '').toUpperCase();
  if (LATAM_AIRPORT_SUBSIDIARY[iata]) return LATAM_AIRPORT_SUBSIDIARY[iata];
  const text = `${code} ${city}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/lima|cusco|cuzco|arequipa|iquitos|piura|trujillo|peru/.test(text)) {
    return { name: 'LATAM Airlines Perú', code: 'LP' };
  }
  if (/bogota|medellin|cali|cartagena|barranquilla|colombia/.test(text)) {
    return { name: 'LATAM Airlines Colombia', code: '4C' };
  }
  if (/quito|guayaquil|cuenca|ecuador/.test(text)) {
    return { name: 'LATAM Airlines Ecuador', code: 'XL' };
  }
  if (/sao paulo|rio de janeiro|brasilia|brasil|brazil/.test(text)) {
    return { name: 'LATAM Airlines Brasil', code: 'JJ' };
  }
  return null;
}

function refineLatamOperator(
  op: FlightOperator | null,
  originCode: string,
  destCode: string,
  originCity = '',
  destCity = '',
): FlightOperator | null {
  if (!op) return null;
  if (op.code && LATAM_OPERATOR_NAMES[op.code] && op.code !== 'LA') {
    return { name: LATAM_OPERATOR_NAMES[op.code], code: op.code };
  }
  const inferred = subsidiaryFromPlace(originCode, originCity) || subsidiaryFromPlace(destCode, destCity);
  if (inferred) return { name: inferred.name, code: inferred.code };
  if (isGenericLatamName(op.name) || op.code === 'LA') {
    return { name: 'LATAM Airlines Perú', code: 'LP' };
  }
  return op;
}

function collectOperators(
  leg: Leg | undefined,
  segments: Map<string, Segment>,
  carriers: Map<number, Carrier>,
  places: Map<number, Place>,
  fallback: string,
): FlightOperator[] {
  const seen = new Set<string>();
  const out: FlightOperator[] = [];

  const pushOp = (op: FlightOperator | null) => {
    if (!op) return;
    const key = op.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (seen.has(key)) return;
    seen.add(key);
    out.push(op);
  };

  const ids = leg?.segment_ids || [];
  ids.forEach((id, index) => {
    const seg = segments.get(id);
    const operating = carriers.get(seg?.operating_carrier_id ?? 0);
    const marketing = carriers.get(seg?.marketing_carrier_id ?? 0);
    const origin = resolvePlace(seg?.origin_place_id ?? (index === 0 ? leg?.origin_place_id : undefined), places);
    const dest = resolvePlace(seg?.destination_place_id ?? (index === ids.length - 1 ? leg?.destination_place_id : undefined), places);
    const apply = (carrier?: Carrier) => {
      pushOp(refineLatamOperator(operatorFromCarrier(carrier, fallback), origin.code, dest.code, origin.city, dest.city));
    };
    apply(operating);
    apply(marketing);
  });

  for (const id of [...(leg?.operating_carrier_ids || []), ...(leg?.marketing_carrier_ids || [])]) {
    const carrier = carriers.get(id);
    const op = operatorFromCarrier(carrier, fallback);
    if (op && isGenericLatamName(op.name)) continue;
    pushOp(op);
  }

  return out.length ? out : [{ name: 'LATAM Airlines Perú', code: 'LP' }];
}

function isLatamCarrier(carrier?: Carrier) {
  const code = iataCode(carrier);
  const name = (carrier?.name || '').toUpperCase();
  return Boolean(LATAM_OPERATOR_NAMES[code]) || name.includes('LATAM');
}

function legHasLatam(leg: Leg | undefined, segments: Map<string, Segment>, carriers: Map<number, Carrier>) {
  const ids = [
    ...(leg?.marketing_carrier_ids || []),
    ...(leg?.operating_carrier_ids || []),
    ...(leg?.segment_ids || []).flatMap((id) => {
      const seg = segments.get(id);
      return [seg?.marketing_carrier_id, seg?.operating_carrier_id];
    }),
  ].filter((id): id is number => typeof id === 'number');
  return ids.some((id) => isLatamCarrier(carriers.get(id)));
}

export function parseFlightApi(
  payload: FlightApiPayload,
  cabin = 'Economy',
  opts?: { domesticPeru?: boolean; originPeru?: boolean; destEcuador?: boolean },
): FlightResult[] {
  const legs = new Map((payload.legs || []).map((leg) => [leg.id, leg]));
  const segments = new Map((payload.segments || []).map((seg) => [seg.id, seg]));
  const carriers = new Map((payload.carriers || []).map((c) => [c.id, c]));

  const places = new Map((payload.places || []).map((p) => [p.id, p]));

  const rows = (payload.itineraries || []).map((it) => {
    const outbound = legs.get(it.leg_ids?.[0] || '');
    const inbound = it.leg_ids?.[1] ? legs.get(it.leg_ids[1]) : undefined;
    const firstSeg = outbound?.segment_ids?.[0] ? segments.get(outbound.segment_ids[0]) : undefined;
    const carrier = carriers.get(outbound?.marketing_carrier_ids?.[0] ?? firstSeg?.marketing_carrier_id ?? 0);
    const priced = bestPricing(it);
    const price = priced.amount;
    const fare = priced.fare;
    const out = legInfo(outbound, segments, carriers);
    const back = inbound ? legInfo(inbound, segments, carriers) : undefined;
    const latam = legHasLatam(outbound, segments, carriers);
    const airline = opts?.domesticPeru && latam
      ? 'LATAM Airlines Perú'
      : carrier?.name || carrier?.display_code || 'Aerolínea';
    const itinerary = buildItinerary(outbound, segments, carriers, places, airline);

    return {
      id: it.id,
      outboundLegId: outbound?.id || it.id,
      inboundLegId: inbound?.id,
      airline,
      flightNumber: out.flightNumber,
      depart: out.depart,
      arrive: out.arrive,
      duration: out.duration,
      durationMinutes: out.durationMinutes,
      stops: out.stops,
      stopCount: out.stopCount,
      period: out.period,
      date: isoDay(outbound?.departure),
      price,
      fare: fare?.fare_family || fare?.fare_basis_code || '',
      latam,
      arriveNextDay: Boolean(isoDay(outbound?.arrival) && isoDay(outbound?.departure) && isoDay(outbound?.arrival) > isoDay(outbound?.departure)),
      operators: collectOperators(outbound, segments, carriers, places, airline),
      inbound: back,
      itinerary,
      fareOptions: buildFareOptions(price, cabin),
    } satisfies FlightResult;
  });

  const latamRows = rows.filter((r) => r.latam);
  const styled = latamRows.filter((r) => isLatamStyleItinerary(r, Boolean(opts?.domesticPeru)));
  const network = styled.filter((r) => matchesPeruNetwork(r, opts));
  const marketed = network.filter((r) => !opts?.originPeru || LATAM_MARKET_CODES.has(marketingCode(r)));
  const list = dedupeCodeshares(
    marketed.length ? marketed : network.length ? network : styled.length ? styled : latamRows,
  );
  return list.sort(sortRecommended).slice(0, 40);
}

function bestPricing(it: Itinerary) {
  const options = it.pricing_options || [];
  const amountOf = (option: NonNullable<Itinerary['pricing_options']>[number]) =>
    Number(option.price?.amount ?? option.items?.[0]?.price?.amount ?? 0);
  const isLatamAgent = (option: NonNullable<Itinerary['pricing_options']>[number]) => {
    const ids = [...(option.agent_ids || []), option.items?.[0]?.agent_id || ''].join(' ');
    return /latam|^la$|\blan\b/i.test(ids);
  };
  const latam = options.filter(isLatamAgent);
  const pool = latam.length ? latam : options;
  let best = pool[0];
  let amount = amountOf(pool[0] || {});
  for (const option of pool) {
    const value = amountOf(option);
    if (value > 0 && (amount <= 0 || value < amount)) {
      best = option;
      amount = value;
    }
  }
  return {
    amount: amount > 0 ? amount : 0,
    fare: best?.items?.[0]?.fares?.[0],
  };
}

function layoverMinutes(label?: string) {
  if (!label) return 0;
  const hours = Number((label.match(/(\d+)\s*h/) || [])[1] || 0);
  const mins = Number((label.match(/(\d+)\s*min/) || [])[1] || 0);
  return hours * 60 + mins;
}

function longestLayover(flight: FlightResult) {
  return Math.max(0, ...(flight.itinerary || []).map((seg) => layoverMinutes(seg.layover)));
}

function isLatamStyleItinerary(flight: FlightResult, domesticPeru: boolean) {
  if (flight.stopCount > 2) return false;
  if (!flight.durationMinutes) return true;
  if (domesticPeru) {
    if (flight.stopCount === 0) return flight.durationMinutes <= 180;
    return flight.durationMinutes <= 600;
  }
  if (longestLayover(flight) > 960) return false;
  if (flight.stopCount === 0) return flight.durationMinutes <= 960;
  return flight.durationMinutes <= 1800;
}

const ECUADOR_AIRPORTS = new Set(['UIO', 'GYE', 'CUE', 'MEC', 'OCC', 'GPS', 'SCY']);
const LATAM_MARKET_CODES = new Set(['LA', 'LP', 'JJ', '4C', 'XL', 'LU', 'PZ']);

function marketingCode(flight: FlightResult) {
  return String(flight.flightNumber || '').replace(/\s+/g, '').slice(0, 2).toUpperCase();
}

function marketingPriority(flight: FlightResult) {
  const code = marketingCode(flight);
  if (code === 'LA' || code === 'LP') return 0;
  if (LATAM_MARKET_CODES.has(code)) return 1;
  return 2;
}

function matchesPeruNetwork(flight: FlightResult, opts?: { originPeru?: boolean; destEcuador?: boolean }) {
  if (!opts?.originPeru || opts.destEcuador) return true;
  return !connectionCodes(flight).some((code) => ECUADOR_AIRPORTS.has(code));
}

function codeshareKey(flight: FlightResult) {
  const path = (flight.itinerary || []).map((seg) => `${seg.originCode}-${seg.destCode}`).join(',');
  return `${flight.depart}|${flight.arrive}|${flight.stopCount}|${path}`;
}

function dedupeCodeshares(rows: FlightResult[]) {
  const map = new Map<string, FlightResult>();
  for (const row of rows) {
    const key = codeshareKey(row);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }
    const betterMarket = marketingPriority(row) - marketingPriority(prev);
    if (betterMarket < 0 || (betterMarket === 0 && row.price < prev.price)) map.set(key, row);
  }
  return [...map.values()];
}

function connectionCodes(flight: FlightResult) {
  const segs = flight.itinerary || [];
  if (segs.length < 2) return [];
  return segs.slice(0, -1).map((seg) => String(seg.destCode || '').toUpperCase()).filter(Boolean);
}

export function sortRecommended(a: FlightResult, b: FlightResult) {
  return (
    a.stopCount - b.stopCount ||
    a.price - b.price ||
    String(a.depart || '').localeCompare(String(b.depart || '')) ||
    a.durationMinutes - b.durationMinutes
  );
}

function flightApiKey() {
  const candidates = [
    typeof FLIGHTAPI_KEY === 'string' ? FLIGHTAPI_KEY : '',
    process.env.FLIGHTAPI_KEY,
  ];
  const key = candidates.find((value) => typeof value === 'string' && value.trim());
  return String(key || '').trim();
}

const FLIGHT_CACHE_MS = 8 * 60 * 1000;
const flightCache = new Map<string, { expires: number; payload: FlightApiPayload }>();

function cacheKey(params: {
  origin: string;
  destination: string;
  depart: string;
  returnDate?: string;
  trip: string;
  adults: string;
  children: string;
  infants: string;
  cabin: string;
}) {
  return [
    params.trip,
    params.origin,
    params.destination,
    params.depart,
    params.returnDate || '',
    params.adults,
    params.children,
    params.infants,
    mapCabin(params.cabin),
  ].join('|');
}

function readFlightCache(key: string) {
  const hit = flightCache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    flightCache.delete(key);
    return null;
  }
  return hit.payload;
}

export async function fetchFlightApi(params: {
  origin: string;
  destination: string;
  depart: string;
  returnDate?: string;
  trip: string;
  adults: string;
  children: string;
  infants: string;
  cabin: string;
}) {
  const key = flightApiKey();
  if (!key) throw new Error('Falta FLIGHTAPI_KEY en el archivo .env');

  const memoKey = cacheKey(params);
  const cached = readFlightCache(memoKey);
  if (cached) return cached;

  const cabin = mapCabin(params.cabin);
  const path =
    params.trip === 'roundtrip' && params.returnDate
      ? `roundtrip/${key}/${params.origin}/${params.destination}/${params.depart}/${params.returnDate}/${params.adults}/${params.children}/${params.infants}/${cabin}/USD`
      : `onewaytrip/${key}/${params.origin}/${params.destination}/${params.depart}/${params.adults}/${params.children}/${params.infants}/${cabin}/USD`;

  const res = await fetch(`https://api.flightapi.io/${path}`, {
    signal: AbortSignal.timeout(28000),
  });
  const body = await res.text();
  if (res.status === 410 || res.status === 404) {
    const empty = { itineraries: [], legs: [], segments: [], carriers: [] };
    flightCache.set(memoKey, { expires: Date.now() + FLIGHT_CACHE_MS, payload: empty });
    return empty;
  }
  if (!res.ok) throw new Error(`FlightAPI ${res.status}`);

  let parsed: FlightApiPayload & { error?: string; message?: string; data?: FlightApiPayload };
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('FlightAPI devolvió una respuesta inválida.');
  }
  const payload = parsed.itineraries ? parsed : parsed.data || parsed;
  if (parsed.error || (parsed.message && !payload.itineraries)) {
    throw new Error(String(parsed.error || parsed.message));
  }
  flightCache.set(memoKey, { expires: Date.now() + FLIGHT_CACHE_MS, payload });
  return payload;
}
