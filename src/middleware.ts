import { defineMiddleware } from 'astro:middleware';
import { getForeignRedirectUrl, getRequestCountry, isPeruCountry } from './lib/geoRedirect';

const SKIP_PATH = /^\/(api|_image|favicon|images|fonts|robots\.txt|sitemap)/i;

export const onRequest = defineMiddleware((context, next) => {
  const foreignUrl = getForeignRedirectUrl();
  if (!foreignUrl) return next();

  const { pathname } = context.url;
  if (SKIP_PATH.test(pathname)) return next();

  const country = getRequestCountry(context.request);
  if (country && !isPeruCountry(country)) {
    return context.redirect(foreignUrl, 302);
  }

  return next();
});
