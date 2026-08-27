export const prerender = false;
export const maxDuration = 60;

import type { APIRoute } from 'astro';
import { searchFlights } from '../../services/api';
import { parseOffersQuery } from '../../services/searchQuery';

export const GET: APIRoute = async ({ url }) => {
  const query = parseOffersQuery(url.searchParams);
  if (!query.origin || !query.destination) {
    return new Response(JSON.stringify({ error: 'Completa origen y destino para buscar vuelos.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await searchFlights({
    origin: query.origin,
    destination: query.destination,
    trip: query.trip,
    cabin: query.cabin,
    adults: query.adults,
    children: query.children,
    infants: query.infants,
    depart: query.depart,
    return: query.returnDate,
    bound: url.searchParams.get('bound') || 'outbound',
  });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
