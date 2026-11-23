/* GPS landing page (gps-telematics-new.html): the savings calculator and the pilot request.
   A file of its own, not an inline script: the server's Content-Security-Policy allows only the two inline scripts
   it knows by hash. Loaded after main.js, which runs the header, menus, FAQ, demo dialog and cookie banner. */
(() => {
  const $ = id => document.getElementById(id);

  /* ---------- the calculator: Wojtek's formula, in US dollars ----------
     today  = machines with telematics today × what is paid per machine
     ours   = $4 per machine for the whole fleet, at least $100 a month
     found  = unbilled extra days per 10 machines × (fleet / 10) × the daily rate
     result = today − ours + found; the devices ($69 each) are shown apart, with the months they take to pay back.
     The numbers written in the page are this result for the default values: change them together. */
  const PER_MACHINE = 4, MINIMUM = 100, DEVICE = 69;
  const inputs = ['gl-fleet', 'gl-tel', 'gl-price', 'gl-rate', 'gl-extra'].map($);
  if (inputs.every(Boolean)) {
    const [fleetEl, telEl, priceEl, rateEl, extraEl] = inputs;
    const usd = (n, cents) => {
      const v = cents ? Math.round(n * 100) / 100 : Math.round(n);
      const digits = cents ? 2 : 0;
      return (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    };
    const set = (id, text) => { $(id).textContent = text; };

    const calc = () => {
      const fleet = +fleetEl.value;
      if (+telEl.value > fleet) telEl.value = fleet;   // no more machines with telematics than in the fleet
      const tel = +telEl.value, price = +priceEl.value, rate = +rateEl.value, per10 = +extraEl.value;
      // the filled part of each slider's track (gps.css)
      inputs.forEach(el => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)).toFixed(4)));

      // the values beside the sliders, with their units (Łukasz, 23 Nov 2026: “80 units”, “2 days”)
      const count = (n, one, many) => `${n % 1 ? n.toFixed(1) : n} ${n === 1 ? one : many}`;
      set('gl-o-fleet', count(fleet, 'unit', 'units'));
      set('gl-o-tel', count(tel, 'unit', 'units'));
      set('gl-o-price', usd(price, price % 1 !== 0));
      set('gl-o-rate', usd(rate));
      set('gl-o-extra', count(per10, 'day', 'days'));

      const today = tel * price,
            ours = Math.max(MINIMUM, PER_MACHINE * fleet),
            devices = DEVICE * fleet,
            found = fleet / 10 * per10 * rate,
            gain = today - ours + found;

      set('gl-r-today', `${usd(today)} / month`);
      set('gl-r-ours', `${usd(ours)} / month`);
      set('gl-r-devices', usd(devices));
      set('gl-r-found', `${usd(found)} / month`);

      const big = $('gl-r-big');
      if (gain > 0) {
        big.classList.remove('is-msg');
        const small = document.createElement('small');
        small.textContent = 'more per month';
        big.replaceChildren(`${usd(gain)} `, small);
        const parts = [];
        if (today > ours) parts.push('lower telematics cost');
        if (found > 0) parts.push('extra days on the invoice');
        const sub = parts.join(' and ');
        set('gl-r-sub', `${sub.charAt(0).toUpperCase()}${sub.slice(1)}, for the whole fleet.`);
        const months = Math.max(1, Math.ceil(devices / gain));
        set('gl-r-payback', `${months} ${months === 1 ? 'month' : 'months'}`);
      } else {
        big.classList.add('is-msg');
        big.textContent = 'Every machine tracked, every hour on record';
        set('gl-r-sub', 'The whole fleet on one map, with engine hours ready for billing.');
        set('gl-r-payback', '–');
      }
    };
    inputs.forEach(el => el.addEventListener('input', calc));
    calc();
  }

  /* ---------- the pilot request: opens the visitor's own e-mail program with a ready-made message to Wojtek
     (nothing is sent from the page). The address is put together here, so it is not written out in this public
     repository; the mail goes to the address in his page. ---------- */
  const send = $('gl-send');
  if (send) {
    send.addEventListener('click', () => {
      const email = $('gl-email');
      if (!email.checkValidity()) { email.reportValidity(); return; }   // a mistyped address (the field may stay empty)
      const v = id => $(id).value.trim();
      const company = v('gl-company');
      const lines = [
        `Company: ${company}`,
        `Name: ${v('gl-name')}`,
        `Email: ${v('gl-email')}`,
        `Phone: ${v('gl-phone')}`,
        `Fleet size: ${v('gl-fleet-size')}`,
        `Telematics today: ${v('gl-telematics')}`,
      ];
      const to = ['wojciech', 'equirento.eu'].join('@');
      const subject = `GPS pilot request – ${company || 'rental company'}`;
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`;
    });
  }
})();
