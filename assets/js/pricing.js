/* EQrento – pricing page (pricing.html): yearly / monthly prices, "Show only differences", the plan shown on phones.
   main.js runs here too (header, menu, FAQ accordion, cookie banner, demo dialog). No dependencies. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- yearly / monthly: one state for the cards and the table header ----------
     every price carries both texts (data-yearly / data-monthly), so a switch rewrites them all at once */
  const billingOpts = $$('.billing__opt');
  billingOpts.forEach(opt => opt.addEventListener('click', () => {
    const mode = opt.dataset.billing;   // "yearly" | "monthly"
    billingOpts.forEach(o => o.setAttribute('aria-pressed', String(o === opt)));
    $$('[data-yearly][data-monthly]').forEach(el => { el.textContent = el.dataset[mode]; });
  }));

  const table = $('.cmp__table');
  if (!table) return;

  /* ---------- "Show only differences" ----------
     a row goes when all four plans have the same value (worked out from the cells: included / not included / the text),
     and a category goes when none of its rows is left */
  const value = td => td.classList.contains('y') ? 'yes' : td.classList.contains('n') ? 'no' : td.textContent.trim();
  const rows = $$('tbody tr:not(.cmp__group)', table);
  const alike = rows.filter(tr => new Set($$('td', tr).map(value)).size === 1);
  const diff = $('.compare__diff');
  if (diff) diff.addEventListener('click', () => {
    const on = diff.getAttribute('aria-pressed') !== 'true';
    diff.setAttribute('aria-pressed', String(on));
    alike.forEach(tr => { tr.hidden = on; });
    $$('tbody', table).forEach(tb => { tb.hidden = on && $$('tr:not(.cmp__group)', tb).every(tr => tr.hidden); });
  });

  /* ---------- phones: the features and one plan (Complete to start with); CSS shows the column in data-plan ---------- */
  const planOpts = $$('.compare__plans .seg__opt');
  planOpts.forEach(opt => opt.addEventListener('click', () => {
    planOpts.forEach(o => o.setAttribute('aria-pressed', String(o === opt)));
    table.dataset.plan = opt.dataset.plan;
  }));
})();
