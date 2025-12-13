/**
 * BIST (Borsa İstanbul) Hisse Senedi Listesi
 * Güncel liste - Aralık 2024
 */

// BIST 30 - En likit 30 hisse
export const BIST30_STOCKS = [
  'AKBNK', 'ARCLK', 'ASELS', 'BIMAS', 'EKGYO', 'EREGL', 'FROTO', 'GARAN',
  'GUBRF', 'HEKTS', 'ISCTR', 'KCHOL', 'KOZAA', 'KOZAL', 'KRDMD', 'PGSUS',
  'PETKM', 'SAHOL', 'SASA', 'SISE', 'SOKM', 'TAVHL', 'TCELL', 'THYAO',
  'TOASO', 'TTKOM', 'TUPRS', 'VAKBN', 'VESTL', 'YKBNK'
];

// BIST 50 - En likit 50 hisse
export const BIST50_STOCKS = [
  ...BIST30_STOCKS,
  'AEFES', 'AKSA', 'ALGYO', 'ALARK', 'AYGAZ', 'BRYAT', 'CCOLA', 'DOHOL',
  'ENKAI', 'ENJSA', 'GESAN', 'GLYHO', 'HALKB', 'ISGYO', 'KORDS', 'MGROS',
  'ODAS', 'OTKAR', 'PRKAB', 'TSKB'
];

// BIST 100 - En likit 100 hisse
export const BIST100_STOCKS = [
  ...BIST50_STOCKS,
  'AGHOL', 'AKENR', 'ANACM', 'ANELE', 'AYDEM', 'BAGFS', 'BANVT', 'BFREN',
  'BIOEN', 'BRSAN', 'BTCIM', 'BUCIM', 'CIMSA', 'CLEBI', 'CRFSA', 'CWENE',
  'DEVA', 'DOAS', 'DURDO', 'ECILC', 'EGEEN', 'EMKEL', 'ENERY', 'ERBOS',
  'GOODY', 'IHLAS', 'IPEKE', 'ISDMR', 'ISGSY', 'IZMDC', 'JANTS', 'KARTN',
  'KARSN', 'KLMSN', 'KONTR', 'LOGO', 'MAVI', 'MNDRS', 'MPARK', 'NETAS',
  'OYAKC', 'PENTA', 'SKBNK', 'SODA', 'TKFEN', 'TRGYO', 'TRKCM', 'TTRAK',
  'ULKER', 'VERUS', 'VESBE'
];

// TÜM BIST HİSSELERİ - Borsa İstanbul'da işlem gören tüm hisseler (500+)
export const ALL_BIST_STOCKS = [
  // === A ===
  'ACSEL', 'ADEL', 'ADESE', 'AEFES', 'AFYON', 'AGESA', 'AGHOL', 'AGROT', 'AGYO',
  'AHGAZ', 'AKBNK', 'AKCNS', 'AKENR', 'AKFGY', 'AKFYE', 'AKGRT', 'AKMGY', 'AKSA',
  'AKSEN', 'AKSGY', 'AKSUE', 'AKYHO', 'ALARK', 'ALBRK', 'ALCAR', 'ALCTL', 'ALFAS',
  'ALGYO', 'ALKA', 'ALKIM', 'ALMAD', 'ALTNY', 'ALVES', 'ANACM', 'ANELE', 'ANGEN',
  'ANHYT', 'ANSGR', 'ARASE', 'ARCLK', 'ARDYZ', 'ARENA', 'ARSAN', 'ARTMS', 'ARZUM',
  'ASELS', 'ASGYO', 'ASTOR', 'ASUZU', 'ATAGY', 'ATAKP', 'ATATP', 'ATEKS', 'ATLAS',
  'ATSYH', 'AVGYO', 'AVHOL', 'AVOD', 'AVPGY', 'AVTUR', 'AYCES', 'AYDEM', 'AYEN',
  'AYES', 'AYGAZ', 'AZTEK',

  // === B ===
  'BAGFS', 'BAKAB', 'BALAT', 'BANVT', 'BARMA', 'BASCM', 'BASGZ', 'BAYRK', 'BEGYO',
  'BERA', 'BEYAZ', 'BFREN', 'BIENY', 'BIGCH', 'BIMAS', 'BINHO', 'BIOEN', 'BIZIM',
  'BJKAS', 'BLCYT', 'BMSCH', 'BMSTL', 'BNTAS', 'BOBET', 'BOSSA', 'BRISA', 'BRKO',
  'BRKSN', 'BRKVY', 'BRLSM', 'BRMEN', 'BRSAN', 'BRYAT', 'BSOKE', 'BTCIM', 'BUCIM',
  'BURCE', 'BURVA', 'BVSAN', 'BYDNR',

  // === C ===
  'CANTE', 'CASA', 'CATES', 'CCOLA', 'CELHA', 'CEMAS', 'CEMTS', 'CEOEM', 'CIMSA',
  'CLEBI', 'CMBTN', 'CMENT', 'CONSE', 'COSMO', 'CRDFA', 'CRFSA', 'CUSAN', 'CVKMD',
  'CWENE', 'CYGER',

  // === D ===
  'DAGHL', 'DAGI', 'DAPGM', 'DARDL', 'DCTTR', 'DENGE', 'DERHL', 'DERIM', 'DESA',
  'DESPC', 'DEVA', 'DGATE', 'DGGYO', 'DGNMO', 'DIRIT', 'DITAS', 'DMRGD', 'DMSAS',
  'DNISI', 'DOAS', 'DOBUR', 'DOCO', 'DOGUB', 'DOHOL', 'DOKTA', 'DURDO', 'DYOBY',

  // === E ===
  'ECILC', 'ECZYT', 'EDIP', 'EFORC', 'EGEEN', 'EGEPO', 'EGGUB', 'EGPRO', 'EGSER',
  'EKGYO', 'EKIZ', 'EKOS', 'EKSUN', 'ELITE', 'EMKEL', 'EMNIS', 'ENERY', 'ENJSA',
  'ENKAI', 'ENSRI', 'EPLAS', 'ERBOS', 'ERCB', 'EREGL', 'ERSU', 'ESCAR', 'ESCOM',
  'ESEN', 'ETILR', 'ETYAT', 'EUHOL', 'EUPWR', 'EUREN', 'EUYO', 'EYGYO', 'EZGYO',

  // === F ===
  'FADE', 'FENER', 'FLAP', 'FMIZP', 'FONET', 'FORMT', 'FORTE', 'FRIGO', 'FROTO',
  'FZLGY',

  // === G ===
  'GALMS', 'GARAN', 'GARFA', 'GEDIK', 'GEDZA', 'GENIL', 'GENTS', 'GEREL', 'GESAN',
  'GIPTA', 'GLBMD', 'GLCVY', 'GLRYH', 'GLYHO', 'GMTAS', 'GOKNR', 'GOLTS', 'GOODY',
  'GOZDE', 'GRSEL', 'GRTRK', 'GSDDE', 'GSDHO', 'GSRAY', 'GUBRF', 'GUNDG', 'GWIND',
  'GZNMI',

  // === H ===
  'HATEK', 'HATSN', 'HDFGS', 'HEDEF', 'HEKTS', 'HKTM', 'HLGYO', 'HTTBT', 'HUBVC',
  'HUNER', 'HURGZ', 'HUZBE',

  // === I-İ ===
  'ICBCT', 'ICUGS', 'IDGYO', 'IEYHO', 'IHAAS', 'IHEVA', 'IHGZT', 'IHLAS', 'IHLGM',
  'IHYAY', 'IMASM', 'INDES', 'INFO', 'INGRM', 'INTEM', 'INVEO', 'INVES', 'IPEKE',
  'ISATR', 'ISBIR', 'ISBTR', 'ISCTR', 'ISDMR', 'ISFIN', 'ISGSY', 'ISGYO', 'ISKPL',
  'ISKUR', 'ISMEN', 'ISSEN', 'IZMDC', 'IZTAR',

  // === J-K ===
  'JANTS', 'KAPLM', 'KAREL', 'KARSN', 'KARTN', 'KARYE', 'KATMR', 'KAYSE', 'KBORU',
  'KCAER', 'KCHOL', 'KENT', 'KERVN', 'KERVT', 'KFEIN', 'KGYO', 'KIMMR', 'KLGYO',
  'KLKIM', 'KLMSN', 'KLNMA', 'KLRHO', 'KLSER', 'KLSYN', 'KMPUR', 'KNFRT', 'KONKA',
  'KONTR', 'KONYA', 'KOPOL', 'KORDS', 'KOZAA', 'KOZAL', 'KRDMA', 'KRDMB', 'KRDMD',
  'KRGYO', 'KRONT', 'KRPLS', 'KRSTL', 'KRTEK', 'KRVGD', 'KTLEV', 'KTSKR', 'KUTPO',
  'KUYAS', 'KZBGY', 'KZGYO',

  // === L ===
  'LIDER', 'LIDFA', 'LILAK', 'LINK', 'LKMNH', 'LMKDC', 'LOGO', 'LOGOG', 'LRSHO',
  'LUKSK',

  // === M ===
  'MAALT', 'MACKO', 'MAGEN', 'MAKIM', 'MAKTK', 'MANAS', 'MARKA', 'MARTI', 'MAVI',
  'MEDTR', 'MEGAP', 'MEGMT', 'MEKAG', 'MERCN', 'MERIT', 'MERKO', 'MESA', 'METUR',
  'MGROS', 'MHRGY', 'MIATK', 'MIPAZ', 'MMCAS', 'MNDRS', 'MNDTR', 'MOBTL', 'MOGAN',
  'MPARK', 'MRGYO', 'MRSHL', 'MSGYO', 'MTRKS', 'MTRYO', 'MZHLD',

  // === N ===
  'NATEN', 'NETAS', 'NIBAS', 'NTGAZ', 'NTHOL', 'NUGYO', 'NUHCM', 'NUROL', 'NRBNK',

  // === O-Ö ===
  'OBASE', 'OBAMS', 'ODAS', 'ODINE', 'OFSYM', 'ONCSM', 'ORCAY', 'ORGE', 'ORMA',
  'OSMEN', 'OSTIM', 'OTKAR', 'OTTO', 'OYAKC', 'OYLUM', 'OZGYO', 'OZKGY', 'OZRDN',
  'OZSUB', 'OZYSR',

  // === P ===
  'PAGYO', 'PAMEL', 'PAPIL', 'PARSN', 'PASEU', 'PCILT', 'PEKGY', 'PENGD', 'PENTA',
  'PETKM', 'PETUN', 'PGSUS', 'PINSU', 'PKART', 'PKENT', 'PLTUR', 'PNLSN', 'PNSUT',
  'POLHO', 'POLTK', 'PRDGS', 'PRKAB', 'PRKME', 'PRZMA', 'PSDTC', 'PSGYO', 'QUAGR',

  // === R ===
  'RALYH', 'RAYSG', 'REEDR', 'RGYAS', 'RNPOL', 'RODRG', 'ROYAL', 'RTALB', 'RUBNS', 'RYGYO', 'RYSAS',

  // === S-Ş ===
  'SAFKR', 'SAHOL', 'SAMAT', 'SANEL', 'SANFM', 'SANKO', 'SARKY', 'SASA', 'SAYAS',
  'SDTTR', 'SEGMN', 'SEKFK', 'SEKUR', 'SELEC', 'SELGD', 'SELVA', 'SEYKM', 'SILVR',
  'SISE', 'SKBNK', 'SKTAS', 'SKYLP', 'SMART', 'SMRTG', 'SNGYO', 'SNICA', 'SNKRN',
  'SNPAM', 'SODSN', 'SOKE', 'SOKM', 'SONME', 'SRVGY', 'SUMAS', 'SUNTK', 'SURGY',
  'SUWEN',

  // === T ===
  'TABGD', 'TARKM', 'TATEN', 'TATGD', 'TAVHL', 'TBORG', 'TCELL', 'TDGYO', 'TEKTU',
  'TERA', 'TEZOL', 'TGSAS', 'THYAO', 'TIRE', 'TKFEN', 'TKNSA', 'TLMAN', 'TMPOL',
  'TMSN', 'TOASO', 'TRCAS', 'TRGYO', 'TRILC', 'TRKCM', 'TSGYO', 'TSKB', 'TTKOM',
  'TTRAK', 'TUCLK', 'TUKAS', 'TUPRS', 'TUREX', 'TURGG', 'TURSG', 'UFUK', 'ULAS',
  'ULKER', 'ULUFA', 'ULUSE', 'ULUUN', 'UNLU', 'USAK', 'UZERB', 'UZEYM',

  // === V ===
  'VAKBN', 'VAKFN', 'VAKKO', 'VANGD', 'VBTYZ', 'VERTU', 'VERUS', 'VESBE', 'VESTL',
  'VKFYO', 'VKGYO', 'VKING', 'VRGYO',

  // === W-Y-Z ===
  'YATAS', 'YAYLA', 'YEOTK', 'YESIL', 'YGGYO', 'YGYO', 'YKBNK', 'YKSLN', 'YONGA',
  'YUNSA', 'YYAPI', 'ZEDUR', 'ZELOT', 'ZOREN', 'ZRGYO'
];

// Unique list (duplicate kontrolü)
export const ALL_BIST_UNIQUE = Array.from(new Set(ALL_BIST_STOCKS)).sort();

// İndeks bilgileri
export const BIST_INDEXES = {
  'BIST30': {
    name: 'BIST 30',
    description: 'En likit 30 hisse',
    stocks: BIST30_STOCKS,
    count: BIST30_STOCKS.length
  },
  'BIST50': {
    name: 'BIST 50',
    description: 'En likit 50 hisse',
    stocks: [...new Set(BIST50_STOCKS)],
    count: new Set(BIST50_STOCKS).size
  },
  'BIST100': {
    name: 'BIST 100',
    description: 'En likit 100 hisse',
    stocks: [...new Set(BIST100_STOCKS)],
    count: new Set(BIST100_STOCKS).size
  },
  'ALL': {
    name: 'Tüm BIST',
    description: 'Borsa İstanbul\'da işlem gören tüm hisseler',
    stocks: ALL_BIST_UNIQUE,
    count: ALL_BIST_UNIQUE.length
  }
};

// Default export
export default {
  BIST30_STOCKS,
  BIST50_STOCKS,
  BIST100_STOCKS,
  ALL_BIST_STOCKS: ALL_BIST_UNIQUE,
  BIST_INDEXES
};
