/* EQrento – 404 page only. Addresses of the previous site's language versions that no longer exist (/pl/kontakt,
   /en/contact, /de/… – any page under /en/, /pl/, /de/, /es/, /fr/, /it/, /nl/, /sv/, /pt/) send the visitor straight
   to the home page (Łukasz, 9 Nov 2026). The folders themselves (/pl/ …) have their own index.html redirect.
   The server could do the same with a real 301 – the old-language rule in ../eqrento-ovh/nginx-eqrento.conf – but the
   site's nginx is not reachable from the publishing account, so until the server administrator adds that rule, this
   page does it. An external file, not an inline script, so a strict CSP (script-src 'self') still allows it.
   document.baseURI is the site root set by the <base> above it: https://eqrento.com/ or …/eqrento_landing_page/. */
(() => {
  const root = document.baseURI;
  const path = location.href.startsWith(root) ? location.href.slice(root.length) : location.pathname.replace(/^\//, '');
  if (/^(en|pl|de|es|fr|it|nl|sv|pt)(\/|$)/.test(path)) location.replace(root);
})();
