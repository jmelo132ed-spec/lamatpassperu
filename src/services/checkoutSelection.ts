export type CheckoutLeg = {
  legId: string;
  fareId: string;
  fareName: string;
  price: number;
  flight: {
    id: string;
    outboundLegId: string;
    depart: string;
    arrive: string;
    duration: string;
    stops: string;
    stopCount: number;
    price: number;
    arriveNextDay: boolean;
    airline: string;
    flightNumber: string;
    operators?: { name?: string; code?: string }[] | string[];
  } | null;
};

export type CheckoutSelection = {
  search: string;
  trip: 'roundtrip' | 'oneway';
  from: { code: string; city: string; country?: string; airport?: string };
  to: { code: string; city: string; country?: string; airport?: string };
  depart: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: string;
  outbound: CheckoutLeg;
  inbound?: CheckoutLeg | null;
};

export const CHECKOUT_STORAGE_KEY = 'latam-checkout-selection';

export function totalCheckoutPrice(selection: CheckoutSelection) {
  const out = Number(selection.outbound?.price || 0);
  const back = Number(selection.inbound?.price || 0);
  const pax = selection.adults + selection.children + selection.infants;
  return (out + back) * (pax || 1);
}
