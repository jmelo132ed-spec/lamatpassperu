export function getTicketsUrl(): string {
  const value = import.meta.env.PUBLIC_TICKETS_URL;
  return typeof value === 'string' && value.trim() ? value.trim() : '/reservar';
}

export function getForeignRedirectUrl(): string {
  const value = import.meta.env.PUBLIC_FOREIGN_REDIRECT_URL;
  return typeof value === 'string' ? value.trim() : '';
}

export function getRequestCountry(request: Request): string {
  const forced = import.meta.env.PUBLIC_FORCE_COUNTRY;
  if (typeof forced === 'string' && forced.trim()) {
    return forced.trim().toUpperCase();
  }

  const header =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    '';

  return header.trim().toUpperCase();
}

export function isPeruCountry(country: string): boolean {
  return country === 'PE';
}
