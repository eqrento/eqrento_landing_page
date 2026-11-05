#!/usr/bin/env bash
# The plan prices are written in two pages, because the site has no build step:
#   - index.html   – the pricing teaser (yearly prices, <b data-price="…">),
#   - pricing.html – the plan cards and the comparison table's header (data-price="…" data-yearly="…" data-monthly="…").
# The lowest price also appears in pricing.html's title and descriptions ("from $199/month") and in the home page FAQ
# ("Plans start at $199 a month").
# This check runs before the GitHub preview and before the publish to eqrento.com and stops both when the pages
# disagree, so a price changed in one place only never goes out. Run it locally too:  bash .github/scripts/check-prices.sh
set -u
cd "$(dirname "$0")/../.."

fail=0
bad() { echo "  ✗ $*"; fail=1; }
norm() { sed 's#/mo$##' | sort -u; }   # "$199/mo" in the table header = "$199" on the card

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
for t in $(grep -o 'from \$[0-9,]*/month' pricing.html | sort -u | sed 's/ /_/g'); do
  [ "${t//_/ }" = "from $low/month" ] || bad "pricing.html says \"${t//_/ }\" in its title or descriptions, the Essential price is $low"
done
faq=$(grep -o 'Plans start at \$[0-9,]*' index.html | sed 's/Plans start at //' | head -1)
[ "$faq" = "$low" ] || bad "the home page FAQ says \"Plans start at ${faq:-?}\", the Essential price is $low"

if [ "$fail" -ne 0 ]; then
  echo "Prices differ between index.html and pricing.html – fix them in both files (see the lines above)."
  exit 1
fi
echo "Prices match on both pages."
