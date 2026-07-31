// Registry for the Country > Issuer > Ruling authority hierarchy.
//
// COUNTRY_FLAGS  : the top-level grid. ISO2 -> flagcdn; null -> badge treatment.
// ISSUER_FLAGS   : an issuer gets its own flag when it is a distinct modern
//                  jurisdiction (Gibraltar, Hong Kong, Isle of Man...). Historical
//                  issuers (Chola dynasty, princely states, Soviet Union) get a badge.
// DISPLAY        : Numista's sort-order names ("Hyderabad, Princely state of")
//                  rewritten as they'd actually be read.

const COUNTRY_FLAGS = {
  'Afghanistan': 'af', 'Algeria': 'dz', 'Andorra': 'ad', 'Armenia': 'am',
  'Australia': 'au', 'Austria': 'at', 'Azerbaijan': 'az', 'Bahrain': 'bh',
  'Bangladesh': 'bd', 'Barbados': 'bb', 'Belarus': 'by', 'Belgium': 'be',
  'Belize': 'bz', 'Bhutan': 'bt', 'Brazil': 'br', 'Bulgaria': 'bg',
  'Burundi': 'bi', 'Canada': 'ca', 'Chile': 'cl', 'China': 'cn',
  'Colombia': 'co', 'Cuba': 'cu', 'Cyprus': 'cy', 'Denmark': 'dk',
  'Egypt': 'eg', 'Eritrea': 'er', 'Estonia': 'ee', 'Eswatini': 'sz',
  'Fiji': 'fj', 'Finland': 'fi', 'France': 'fr', 'Gambia, The': 'gm',
  'Georgia': 'ge', 'Germany': 'de', 'Greece': 'gr', 'Guatemala': 'gt',
  'Guinea': 'gn', 'Hungary': 'hu', 'India': 'in', 'Indonesia': 'id',
  'Iraq': 'iq', 'Ireland': 'ie', 'Israel': 'il', 'Italy': 'it',
  'Jamaica': 'jm', 'Japan': 'jp', 'Jordan': 'jo', 'Kuwait': 'kw',
  'Liberia': 'lr', 'Lithuania': 'lt', 'Luxembourg': 'lu', 'Madagascar': 'mg',
  'Malawi': 'mw', 'Mauritania': 'mr', 'Mauritius': 'mu', 'Namibia': 'na',
  'Nepal': 'np', 'Netherlands': 'nl', 'New Zealand': 'nz', 'North Macedonia': 'mk',
  'Norway': 'no', 'Pakistan': 'pk', 'Panama': 'pa', 'Papua New Guinea': 'pg',
  'Philippines': 'ph', 'Poland': 'pl', 'Portugal': 'pt', 'Russia': 'ru',
  'Rwanda': 'rw', 'San Marino': 'sm', 'Saudi Arabia': 'sa', 'Serbia': 'rs',
  'Sierra Leone': 'sl', 'Singapore': 'sg', 'Somalia': 'so', 'South Africa': 'za',
  'South Korea': 'kr', 'Spain': 'es', 'Sri Lanka': 'lk', 'Sweden': 'se',
  'Switzerland': 'ch', 'Syria': 'sy', 'Taiwan': 'tw', 'Thailand': 'th',
  'Timor-Leste': 'tl', 'Tunisia': 'tn', 'Turkey': 'tr', 'United Arab Emirates': 'ae',
  'United Kingdom': 'gb', 'United States': 'us', 'Uzbekistan': 'uz',
  'Yemen': 'ye', 'Zambia': 'zm', 'Zimbabwe': 'zw',
  // Currency unions, colonial boards and dissolved states — badge, not flag.
  'British Crown dependencies': null, 'British West Africa': null,
  'Central African States': null, 'East Africa': null, 'French Indochina': null,
  'French West Africa': null, 'Western African States': null, 'Yugoslavia': null,
};

const COUNTRY_SLUGS = {
  'British Crown dependencies': 'british-crown-dependencies',
  'British West Africa': 'british-west-africa',
  'Central African States': 'central-african-states',
  'East Africa': 'east-africa',
  'French Indochina': 'french-indochina',
  'French West Africa': 'french-west-africa',
  'Western African States': 'west-african-states',
  'Yugoslavia': 'yugoslavia',
};

const COUNTRY_LABELS = {
  'Gambia, The': 'The Gambia',
  'British Crown dependencies': 'British Crown Dependencies',
  'Central African States': 'Central African States',
  'Western African States': 'West African States',
};

const REGIONS = {
  'Afghanistan': 'Asia', 'Algeria': 'Africa', 'Andorra': 'Europe', 'Armenia': 'Asia',
  'Australia': 'Oceania', 'Austria': 'Europe', 'Azerbaijan': 'Asia', 'Bahrain': 'Asia',
  'Bangladesh': 'Asia', 'Barbados': 'Americas', 'Belarus': 'Europe', 'Belgium': 'Europe',
  'Belize': 'Americas', 'Bhutan': 'Asia', 'Brazil': 'Americas', 'Bulgaria': 'Europe',
  'Burundi': 'Africa', 'Canada': 'Americas', 'Chile': 'Americas', 'China': 'Asia',
  'Colombia': 'Americas', 'Cuba': 'Americas', 'Cyprus': 'Europe', 'Denmark': 'Europe',
  'Egypt': 'Africa', 'Eritrea': 'Africa', 'Estonia': 'Europe', 'Eswatini': 'Africa',
  'Fiji': 'Oceania', 'Finland': 'Europe', 'France': 'Europe', 'Gambia, The': 'Africa',
  'Georgia': 'Asia', 'Germany': 'Europe', 'Greece': 'Europe', 'Guatemala': 'Americas',
  'Guinea': 'Africa', 'Hungary': 'Europe', 'India': 'Asia', 'Indonesia': 'Asia',
  'Iraq': 'Asia', 'Ireland': 'Europe', 'Israel': 'Asia', 'Italy': 'Europe',
  'Jamaica': 'Americas', 'Japan': 'Asia', 'Jordan': 'Asia', 'Kuwait': 'Asia',
  'Liberia': 'Africa', 'Lithuania': 'Europe', 'Luxembourg': 'Europe', 'Madagascar': 'Africa',
  'Malawi': 'Africa', 'Mauritania': 'Africa', 'Mauritius': 'Africa', 'Namibia': 'Africa',
  'Nepal': 'Asia', 'Netherlands': 'Europe', 'New Zealand': 'Oceania', 'North Macedonia': 'Europe',
  'Norway': 'Europe', 'Pakistan': 'Asia', 'Panama': 'Americas', 'Papua New Guinea': 'Oceania',
  'Philippines': 'Asia', 'Poland': 'Europe', 'Portugal': 'Europe', 'Russia': 'Europe',
  'Rwanda': 'Africa', 'San Marino': 'Europe', 'Saudi Arabia': 'Asia', 'Serbia': 'Europe',
  'Sierra Leone': 'Africa', 'Singapore': 'Asia', 'Somalia': 'Africa', 'South Africa': 'Africa',
  'South Korea': 'Asia', 'Spain': 'Europe', 'Sri Lanka': 'Asia', 'Sweden': 'Europe',
  'Switzerland': 'Europe', 'Syria': 'Asia', 'Taiwan': 'Asia', 'Thailand': 'Asia',
  'Timor-Leste': 'Asia', 'Tunisia': 'Africa', 'Turkey': 'Asia', 'United Arab Emirates': 'Asia',
  'United Kingdom': 'Europe', 'United States': 'Americas', 'Uzbekistan': 'Asia',
  'Yemen': 'Asia', 'Zambia': 'Africa', 'Zimbabwe': 'Africa',
  'British Crown dependencies': 'Historical & Regional',
  'British West Africa': 'Historical & Regional',
  'Central African States': 'Historical & Regional',
  'East Africa': 'Historical & Regional',
  'French Indochina': 'Historical & Regional',
  'French West Africa': 'Historical & Regional',
  'Western African States': 'Historical & Regional',
  'Yugoslavia': 'Historical & Regional',
};

// Issuers that are distinct living jurisdictions get their own flag.
const ISSUER_FLAGS = {
  'Isle of Man': 'im',
  'Gibraltar': 'gi',
  'Hong Kong': 'hk',
  'Macau': 'mo',
  'French Polynesia': 'pf',
  'Sint Maarten': 'sx',
  'Russian Federation': 'ru',
  'Sri Lanka': 'lk',
  'Yemen': 'ye',
  'Chile': 'cl',
  'France': 'fr',
  'Netherlands': 'nl',
  'India': 'in',
  'China, People’s Republic of': 'cn',
  'China, People\'s Republic of': 'cn',
  'Germany, Federal Republic of': 'de',
  'United Kingdom': 'gb',
  'Swaziland, Kingdom of': 'sz',
};

// Issuer display name + era + one line on what it actually was.
const ISSUER_META = {
  'India': { label: 'Republic of India', era: '1950–date' },
  'India - British': {
    label: 'British India', era: '1858–1947', badge: 'BI',
    note: 'Coinage of the British Raj, struck for the whole subcontinent under the Crown until Partition in 1947.',
  },
  'Chola dynasty': {
    label: 'Chola Dynasty', era: 'c. 850–1279', badge: 'CD',
    note: 'One of the longest-ruling dynasties in southern India, whose maritime reach extended across the Bay of Bengal to Sumatra.',
  },
  'Hyderabad, Princely state of': {
    label: 'Hyderabad', era: '1724–1948', badge: 'HY',
    note: 'The wealthiest of the princely states, ruled by the Asaf Jahi Nizams, which struck its own coinage in parallel with British India until it acceded in 1948.',
  },
  'Gwalior, Princely state of': {
    label: 'Gwalior', era: '1731–1948', badge: 'GW',
    note: 'A Maratha princely state under the Scindia dynasty, minting its own coinage from its fortress capital until accession.',
  },
  'Indore, Princely state of': {
    label: 'Indore', era: '1818–1948', badge: 'IN',
    note: 'A Maratha state ruled by the Holkar dynasty, one of several princely mints operating alongside British Indian currency.',
  },
  'Jaipur, Princely state of': {
    label: 'Jaipur', era: '1727–1949', badge: 'JP',
    note: 'A Rajput princely state whose later coinage carried the British monarch alongside the local ruler — a hybrid found across the Raj.',
  },
  'Junagadh, Princely state of': {
    label: 'Junagadh', era: '1730–1948', badge: 'JU',
    note: 'A Gujarati princely state whose ruler acceded to Pakistan in 1947 despite a Hindu-majority population, prompting its annexation by India.',
  },
  'China, People\'s Republic of': { label: 'People’s Republic of China', era: '1949–date' },
  'China, Empire of': {
    label: 'Empire of China', era: '221 BCE–1912', badge: 'EC',
    note: 'Imperial cast coinage — round with a square central hole, strung in bundles — a form that persisted for over two thousand years.',
  },
  'Hong Kong': { label: 'Hong Kong', era: '1863–date', note: 'A British colony until 1997, now a Special Administrative Region that still issues its own dollar.' },
  'Macau': { label: 'Macau', era: '1901–date', note: 'A Portuguese territory until 1999, now a Special Administrative Region issuing the pataca.' },
  'Germany, Federal Republic of': { label: 'Federal Republic of Germany', era: '1949–date' },
  'Germany (1871-1948)': {
    label: 'Germany', era: '1871–1948', badge: 'DE',
    note: 'Coinage spanning the German Empire, the Weimar Republic and the years to the postwar currency reform.',
  },
  'Prussia, Kingdom of': {
    label: 'Kingdom of Prussia', era: '1701–1918', badge: 'PR',
    note: 'The dominant German state, which struck its own coinage alongside imperial issues until the monarchy fell in 1918.',
  },
  'Soviet Union': {
    label: 'Soviet Union', era: '1922–1991', badge: 'SU',
    note: 'Coinage of the USSR, whose rouble circulated across fifteen republics until the union dissolved.',
  },
  'Russian Federation': { label: 'Russian Federation', era: '1991–date' },
  'Ceylon': {
    label: 'Ceylon', era: '1802–1972', badge: 'CE',
    note: 'The island’s British colonial and early-independence coinage, before it was renamed Sri Lanka in 1972.',
  },
  'Sri Lanka': { label: 'Sri Lanka', era: '1972–date' },
  'North Yemen': {
    label: 'North Yemen', era: '1918–1990', badge: 'NY',
    note: 'The Yemen Arab Republic, which struck its own rial until unification with the south in 1990.',
  },
  'Yemen': { label: 'Republic of Yemen', era: '1990–date' },
  'Easter Island': {
    label: 'Easter Island', era: 'Rapa Nui', badge: 'RN',
    note: 'A Chilean territory in the south Pacific, honoured on Chilean coinage though it issues no separate currency.',
  },
  'Isle of Man': { label: 'Isle of Man', era: '1709–date', note: 'A self-governing Crown Dependency — not part of the UK — minting its own pound at parity with sterling.' },
  'Gibraltar': { label: 'Gibraltar', era: '1802–date', note: 'A British Overseas Territory at the mouth of the Mediterranean, issuing its own pound pegged to sterling.' },
  'French Polynesia': { label: 'French Polynesia', era: '1949–date', note: 'A French overseas collectivity using the CFP franc, shared with New Caledonia and Wallis & Futuna.' },
  'Sint Maarten': { label: 'Sint Maarten', era: '2010–date', note: 'The Dutch half of a Caribbean island shared with French Saint-Martin, a constituent country of the Kingdom of the Netherlands.' },
  'Swaziland, Kingdom of': { label: 'Kingdom of Swaziland', era: '1968–2018', note: 'Renamed Eswatini in 2018; its lilangeni remains pegged to the South African rand.' },
  // Metropolitan issuers shown beside their territories — give them the same
  // era + context so neither card in the pair reads as an afterthought.
  'United Kingdom': { label: 'United Kingdom', era: '1707–date', note: 'Royal Mint issues for the mainland — the sterling coinage struck for England, Scotland, Wales and Northern Ireland.' },
  'France': { label: 'France', era: '1795–date', note: 'Metropolitan French coinage, from the franc of the Revolution through to the euro.' },
  'Netherlands': { label: 'Netherlands', era: '1815–date', note: 'Coinage of the European Netherlands, guilder then euro, distinct from the Caribbean constituent countries.' },
  'Chile': { label: 'Chile', era: '1817–date', note: 'Mainland Chilean peso coinage, issued from Santiago.' },
  'Gambia, The': { label: 'The Gambia', era: '1965–date' },
  'Central African States': { label: 'Central African States', era: '1973–date' },
  'Western African States': { label: 'West African States', era: '1959–date' },
};

module.exports = { COUNTRY_FLAGS, COUNTRY_SLUGS, COUNTRY_LABELS, REGIONS, ISSUER_FLAGS, ISSUER_META };
