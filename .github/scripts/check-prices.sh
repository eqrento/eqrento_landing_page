#!/usr/bin/env bash
# The plan prices are written in two pages, because the site has no build step:
#   - index.html   – the pricing teaser (yearly prices, <b data-price="…">),
#   - pricing.html – the plan cards and the comparison table's header (data-price="…" data-yearly="…" data-monthly="…").
# The lowest price also appears in pricing.html's title and descriptions ("from €199/month") and in the home page FAQ
# ("Plans start at €199 a month").
# Other pages can quote the Essential price as <span data-price-quote="essential">€199</span> (the new GPS & Telematics page);
# those quotes are compared too.
# The GPS module's prices (€4 per machine a month, minimum €100, device €69) come from assets/js/gps.js (the GPS page's
# calculator uses them) and are marked wherever a page shows them: <span data-price-quote="gps-month">€4</span>,
# "gps-minimum", "gps-device" (the GPS page and pricing.html, also the device in the Connected and Enterprise plans –
# the same device). See "The GPS module" below for everything that is checked.
# The site's currency is the euro (Łukasz, 24 Nov 2026): a dollar amount or "USD" left in a page stops the check
# (see "The currency" at the end). Client offers (offer/<slug>/) are not checked: each has the currency agreed with the client.
# This check runs before the GitHub preview and before the publish to eqrento.com and stops both when the pages
# disagree, so a price changed in one place only never goes out. Run it locally too:  bash .github/scripts/check-prices.sh
set -u
cd "$(dirname "$0")/../.."

fail=0
bad() { echo "  ✗ $*"; fail=1; }
norm() { sed 's#/mo$##' | sort -u; }   # "€199/mo" in the table header = "€199" on the card

for plan in essential complete connected; do
  teaser=$(grep -o "data-price=\"$plan\">[^<]*" index.html | sed 's/.*>//' | sort -u)
  yearly=$(grep -o "data-price=\"$plan\" data-yearly=\"[^\"]*\"" pricing.html | sed 's/.*data-yearly="//; s/"$//' | norm)
  monthly=$(grep -o "data-price=\"$plan\" data-yearly=\"[^\"]*\" data-monthly=\"[^\"]*\"" pricing.html | sed 's/.*data-monthly="//; s/"$//' | norm)
  shown=$(grep -o "data-price=\"$plan\"[^>]*>[^<]*" pricing.html | sed 's/.*>//' | norm)   # the text shown before any switch = yearly
  places=$(grep -c "data-price=\"$plan\"" pricing.html)
  echo "$plan: home teaser ${teaser:-–} | pricing.html yearly ${yearly:-–}, monthly ${monthly:-–} (in $places places)"
  [ -n "$teaser" ] || bad "$plan: no price in the home page teaser"
  [ "$places" -ge 2 ] || bad "$plan: expected the price on the card and in the table header of pricing.html"
  [ "$(printf '%s\n' "$yearly" | grep -c .)" -eq 1 ] || bad "$plan: the yearly prices in pricing.html differ: $(echo $yearly)"
  [ "$(printf '%s\n' "$monthly" | grep -c .)" -eq 1 ] || bad "$plan: the monthly prices in pricing.html differ: $(echo $monthly)"
  [ "$shown" = "$yearly" ] || bad "$plan: the price shown in pricing.html ($(echo $shown)) is not the yearly one ($yearly)"
  [ "$teaser" = "$yearly" ] || bad "$plan: the home page teaser says $teaser, pricing.html says $yearly"
done

# the lowest (Essential, yearly) price in the texts
low=$(grep -o 'data-price="essential">[^<]*' index.html | sed 's/.*>//' | head -1)
for t in $(grep -o 'from €[0-9,]*/month' pricing.html | sort -u | sed 's/ /_/g'); do
  [ "${t//_/ }" = "from $low/month" ] || bad "pricing.html says \"${t//_/ }\" in its title or descriptions, the Essential price is $low"
done
faq=$(grep -o 'Plans start at €[0-9,]*' index.html | sed 's/Plans start at //' | head -1)
[ "$faq" = "$low" ] || bad "the home page FAQ says \"Plans start at ${faq:-?}\", the Essential price is $low"

# the Essential price quoted on other pages (data-price-quote="essential")
for f in *.html; do
  for q in $(grep -o 'data-price-quote="essential">[^<]*' "$f" | sed 's/.*>//' | sort -u); do
    [ "$q" = "$low" ] || bad "$f quotes the Essential price as $q, the Essential price is $low"
  done
done

# ---------- The GPS module ----------
# Source: the line "const PER_MACHINE = 4, MINIMUM = 100, DEVICE = 69;" in assets/js/gps.js. Checked:
#   1. every <span data-price-quote="gps-month|gps-minimum|gps-device"> on every page shows that price;
#   2. each of the three is marked at least once on gps-telematics.html and on pricing.html;
#   3. no current GPS price is written there without its mark (HTML comments, the values beside the calculator's
#      sliders, the examples and the calculator's result are left out – 4 and 5 check the last two);
#   4. the euro amounts in the GPS page's title and descriptions are current prices ("from €4 per machine per month");
#   5. the four examples under the GPS page's price cards ("10 machines €100 / month" = max(minimum, 10 × €4)) and the
#      calculator's result written in that page for the default slider values (the formula of gps.js, repeated below).
eur() { awk -v n="$1" 'BEGIN { s = sprintf("%d", n); r = ""; while (length(s) > 3) { r = "," substr(s, length(s) - 2) r; s = substr(s, 1, length(s) - 3) } print "€" s r }'; }
gps=gps-telematics.html
consts=$(grep -o 'const PER_MACHINE = [0-9]*, MINIMUM = [0-9]*, DEVICE = [0-9]*' assets/js/gps.js)
if [ -z "$consts" ]; then
  bad "assets/js/gps.js: no line \"const PER_MACHINE = …, MINIMUM = …, DEVICE = …\" (the source of the GPS prices)"
else
  per=$(echo "$consts" | sed 's/.*PER_MACHINE = \([0-9]*\).*/\1/')
  min=$(echo "$consts" | sed 's/.*MINIMUM = \([0-9]*\).*/\1/')
  dev=$(echo "$consts" | sed 's/.*DEVICE = \([0-9]*\).*/\1/')
  echo "gps module: $(eur "$per") per machine a month, minimum $(eur "$min"), device $(eur "$dev") (assets/js/gps.js)"

  # 1 and 2: the marked prices
  for key in month minimum device; do
    case $key in month) want=$(eur "$per");; minimum) want=$(eur "$min");; device) want=$(eur "$dev");; esac
    for f in *.html; do
      for q in $(grep -o "data-price-quote=\"gps-$key\"[^>]*>[^<]*" "$f" | sed 's/.*>//'); do
        [ "$q" = "$want" ] || bad "$f shows the GPS $key price as $q, assets/js/gps.js says $want"
      done
    done
    for f in $gps pricing.html; do
      grep -q "data-price-quote=\"gps-$key\"" "$f" || bad "$f: no price marked data-price-quote=\"gps-$key\""
    done
  done

  # 3: a current GPS price written without its mark
  for f in $gps pricing.html; do
    left=$(PRICES="$per $min $dev" perl -0ne '
      s/<!--.*?-->//gs;                                        # comments
      s/<title>.*?<\/title>|<meta[^>]*>//gs;                   # the title and descriptions (4)
      s/<span data-price-quote="gps-[a-z]+">[^<]*<\/span>//g;  # the marked prices (1)
      s/<b>€[0-9,]+ \/ month<\/b>//g;                         # the examples (5)
      s/id="gl-r-[a-z]+"[^>]*>[^<]*//g;                        # the calculator result (5)
      s/id="gl-o-[a-z]+"[^>]*>[^<]*//g;                        # the values beside its sliders (not GPS prices)
      for my $p (split " ", $ENV{PRICES}) {
        (my $t = $p) =~ s/(\d)(?=(\d{3})+$)/$1,/g;
        my $n = () = /€\Q$t\E(?![\d,]|\.\d)/g;
        print "€$t ($n×) " if $n;
      }' "$f")
    [ -z "$left" ] || bad "$f: ${left}without data-price-quote – mark each GPS price: <span data-price-quote=\"gps-month|gps-minimum|gps-device\">"
  done

  # 4: the GPS page's title and descriptions
  for q in $(perl -0ne 'print "$1\n" while /(?:<title>([^<]*)<\/title>)/g; print "$1\n" while /<meta[^>]*content="([^"]*)"/g' "$gps" | grep -oE '€[0-9]+(,[0-9]{3})*' | sort -u); do
    case "$q" in "$(eur "$per")"|"$(eur "$min")"|"$(eur "$dev")") ;;
      *) bad "$gps: the title or a description says $q, not a current GPS price ($(eur "$per"), $(eur "$min"), $(eur "$dev"))";;
    esac
  done

  # 5a: the examples under the price cards
  examples=$(grep -oE '<li>[0-9]+ machines <b>€[0-9,]+ / month</b></li>' "$gps")
  [ -n "$examples" ] || bad "$gps: the examples under the price cards (<li>10 machines <b>€100 / month</b></li>) were not found"
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    n=$(echo "$line" | sed -E 's/<li>([0-9]+) machines.*/\1/')
    shown=$(echo "$line" | sed -E 's/.*<b>(€[0-9,]+) \/ month.*/\1/')
    cost=$(( n * per > min ? n * per : min ))
    [ "$shown" = "$(eur "$cost")" ] || bad "$gps: the example \"$n machines\" says $shown / month, the prices give $(eur "$cost") / month"
  done <<< "$examples"

  # 5b: the calculator's result for the default slider values (the same formula as gps.js)
  val() { grep -o "id=\"$1\"[^>]*value=\"[0-9.]*\"" "$gps" | sed 's/.*value="\([0-9.]*\)"/\1/'; }
  txt() { grep -o "id=\"$1\"[^>]*>[^<]*" "$gps" | sed 's/^[^>]*>//; s/ *$//'; }
  fleet=$(val gl-fleet) tel=$(val gl-tel) price=$(val gl-price) rate=$(val gl-rate) per10=$(val gl-extra)
  if [ -z "$fleet" ] || [ -z "$tel" ] || [ -z "$price" ] || [ -z "$rate" ] || [ -z "$per10" ]; then
    bad "$gps: the calculator's default values (value=\"…\" of #gl-fleet, #gl-tel, #gl-price, #gl-rate, #gl-extra) were not found"
  else
    expected=$(awk -v fleet="$fleet" -v tel="$tel" -v price="$price" -v rate="$rate" -v per10="$per10" -v per="$per" -v min="$min" -v dev="$dev" '
      function eur(n,   s, r) { s = sprintf("%d", int(n + 0.5)); r = ""; while (length(s) > 3) { r = "," substr(s, length(s) - 2) r; s = substr(s, 1, length(s) - 3) } return "€" s r }
      BEGIN {
        if (tel > fleet) tel = fleet
        today = tel * price; ours = per * fleet; if (ours < min) ours = min
        devices = dev * fleet; found = fleet / 10 * per10 * rate; gain = today - ours + found
        print "gl-r-today\t" eur(today) " / month"
        print "gl-r-ours\t" eur(ours) " / month"
        print "gl-r-devices\t" eur(devices)
        print "gl-r-found\t" eur(found) " / month"
        if (gain > 0) {
          m = devices / gain; mc = int(m); if (mc < m) mc++; if (mc < 1) mc = 1
          s = ""; if (today > ours) s = "lower telematics cost"
          if (found > 0) s = s (s != "" ? " and " : "") "extra days on the invoice"
          print "gl-r-big\t" eur(gain)
          print "gl-r-sub\t" toupper(substr(s, 1, 1)) substr(s, 2) ", for the whole fleet."
          print "gl-r-payback\t" mc (mc == 1 ? " month" : " months")
        } else {
          print "gl-r-big\tEvery machine tracked, every hour on record"
          print "gl-r-sub\tThe whole fleet on one map, with engine hours ready for billing."
          print "gl-r-payback\t–"
        }
      }')
    while IFS=$'\t' read -r id want; do
      shown=$(txt "$id")
      [ "$shown" = "$want" ] || bad "$gps: the calculator shows \"$shown\" in #$id for the default values, the prices give \"$want\""
    done <<< "$expected"
  fi
fi

# ---------- The currency ----------
# The site's prices are in euros (Łukasz, 24 Nov 2026: „zmień walutę z dolarów na euro”). A dollar amount ($199, $ 199,
# US$) or "USD" left in a page of the site stops the check; HTML comments are left out (they may tell the history).
# Client offers (offer/<slug>/index.html) are not checked: each offer's currency is agreed with the client.
for f in *.html; do
  left=$(perl -0ne 's/<!--.*?-->//gs; my @m = /US\$|\$\s?\d[\d,.]*|\bUSD\b/g; print join(" ", @m)' "$f")
  [ -z "$left" ] || bad "$f: dollar amounts or USD left ($left) – the site's prices are in euros (€)"
done

if [ "$fail" -ne 0 ]; then
  echo "Prices differ between the pages – fix them in every place (see the lines above)."
  exit 1
fi
echo "Prices match on all pages."
