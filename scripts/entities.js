// Maps the 102 distinct "Country" values in Coin_Image_Input.xlsx to either
// a modern ISO2 ("nation") for flagcdn, or a historical/regional badge entity.
// Historical entries render as a badge (not a national flag) — see index build.

const NATIONS = {
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
};

// name -> {slug, label, era, note}
const HISTORICAL = {
  'British Crown dependencies': {
    slug: 'british-crown-dependencies', label: 'British Crown Dependencies', era: 'ongoing',
    note: 'Jersey, Guernsey, Isle of Man and Gibraltar mint their own coinage alongside — not part of — the UK, each pegged 1:1 to sterling.',
  },
  'British West Africa': {
    slug: 'british-west-africa', label: 'British West Africa', era: '1907–1965',
    note: 'A shared colonial currency for Nigeria, Ghana (Gold Coast), Sierra Leone and the Gambia, issued by the West African Currency Board.',
  },
  'Central African States': {
    slug: 'central-african-states', label: 'Central African States (BEAC)', era: 'ongoing',
    note: 'The Central African CFA franc, issued by the Banque des États de l’Afrique Centrale for Cameroon, Chad, Gabon, the Republic of the Congo, Equatorial Guinea and the Central African Republic.',
  },
  'East Africa': {
    slug: 'east-africa', label: 'East Africa', era: '1920–1969',
    note: 'A shared colonial and early-independence currency for Kenya, Uganda, Tanganyika and Zanzibar, issued by the East African Currency Board.',
  },
  'French Indochina': {
    slug: 'french-indochina', label: 'French Indochina', era: '1885–1954',
    note: 'Colonial piastre coinage for present-day Vietnam, Laos and Cambodia, minted under French administration.',
  },
  'French West Africa': {
    slug: 'french-west-africa', label: 'French West Africa', era: '1944–1958',
    note: 'A shared colonial franc for the eight territories of French West Africa, precursor to today’s West African CFA franc.',
  },
  'Western African States': {
    slug: 'western-african-states', label: 'West African States (BCEAO)', era: 'ongoing',
    note: 'The West African CFA franc, issued by the Banque Centrale des États de l’Afrique de l’Ouest for Benin, Burkina Faso, Côte d’Ivoire, Guinea-Bissau, Mali, Niger, Senegal and Togo.',
  },
  'Yugoslavia': {
    slug: 'yugoslavia', label: 'Yugoslavia', era: '1918–1992',
    note: 'Coinage of the former Kingdom and later Socialist Federal Republic, dissolved into its constituent republics in the early 1990s.',
  },
};

module.exports = { NATIONS, HISTORICAL, REGIONS };
