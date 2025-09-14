// Data loading and management module (lazy, per-country, guarded)

class DataLoader {
  constructor() {
    this.indexLoaded = false;
    this.countryList = [];   // array of country names
    this.countryCache = {};  // { [country]: { [year]: Problem[] } }
    this.countryPromises = {};
  }

  // Util: normalize "Saudi Arabia" -> "saudi-arabia"
  slugifyCountry(name) {
    return String(name)
      .toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // fetch with timeout and better error messages
  async fetchJson(url, timeoutMs = 12000) {
    if (!url || typeof url !== 'string') {
      throw new Error(`fetchJson: invalid URL "${url}"`);
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-cache' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  /** Load the country index (data/index.json) */
  async loadIndex() {
    if (this.indexLoaded) return this.countryList;

    const indexUrl = CONFIG?.dataIndex;
    if (!indexUrl || typeof indexUrl !== 'string') {
      console.warn('CONFIG.dataIndex is missing. Falling back to sampleData countries.');
      this.countryList = Object.keys(CONFIG.sampleData).sort((a, b) => a.localeCompare(b));
      this.indexLoaded = true;
      return this.countryList;
    }

    try {
      console.log('Loading country index:', indexUrl);
      const idx = await this.fetchJson(indexUrl);
      // Accept ["Argentina", ...] or [{name:"Argentina"}, ...]
      this.countryList = (Array.isArray(idx) ? idx : [])
        .map(item => (typeof item === 'string' ? item : item?.name))
        .filter(Boolean)
        .map(s => s.trim())
        .sort((a, b) => a.localeCompare(b));
      this.indexLoaded = true;
      console.log(`Index loaded (${this.countryList.length} countries)`);
      return this.countryList;
    } catch (e) {
      console.warn('Index load failed, using sampleData countries:', e.message);
      this.countryList = Object.keys(CONFIG.sampleData).sort((a, b) => a.localeCompare(b));
      this.indexLoaded = true;
      return this.countryList;
    }
  }

  /** Ensure one country's data is loaded and cached */
  async ensureCountryLoaded(country) {
    if (this.countryCache[country]) return this.countryCache[country];
    if (this.countryPromises[country]) return this.countryPromises[country];

    const promise = (async () => {
      try {
        const slug = this.slugifyCountry(country);
        const url = `data/${slug}.json`;
        console.log(`Loading country file: ${url}`);
        const data = await this.fetchJson(url);

        if (!data || typeof data !== 'object') {
          throw new Error(`Invalid data format for ${country}`);
        }

        this.countryCache[country] = data;
        return data;
      } catch (e) {
        console.warn(`Country load failed for ${country}, attempting sampleData:`, e.message);
        if (CONFIG.sampleData[country]) {
          this.countryCache[country] = CONFIG.sampleData[country];
          return this.countryCache[country];
        }
        this.countryCache[country] = {}; // avoid repeated retries
        return this.countryCache[country];
      } finally {
        delete this.countryPromises[country];
      }
    })();

    this.countryPromises[country] = promise;
    return promise;
  }

  // Compatibility shim: now just loads the index
  async loadProblemsData() {
    await this.loadIndex();
    return true;
  }

  // Aggregate of loaded countries only
  getData() {
    const merged = {};
    for (const [k, v] of Object.entries(this.countryCache)) merged[k] = v;
    return merged;
  }

  getCountries() { return this.countryList; }

  async getYearsLazy(country) {
    await this.ensureCountryLoaded(country);
    return this.getYears(country);
  }

  getYears(country) {
    const c = this.countryCache[country];
    if (!c) return [];
    return Object.keys(c).sort((a, b) => b - a);
  }

  getProblems(country, year) {
    const c = this.countryCache[country];
    if (!c || !c[year]) return [];
    return c[year];
  }

  getTotalProblemsCount(country) {
    const c = this.countryCache[country];
    if (!c) return 0;
    return Object.values(c).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  }

  getYearProblemsCount(country, year) {
    return this.getProblems(country, year).length;
  }

  isDataLoaded() { return this.indexLoaded; }

  getDataStats() {
    const countries = Object.keys(this.countryCache);
    let totalProblems = 0, totalYears = 0;
    countries.forEach(cty => {
      const years = this.getYears(cty);
      totalYears += years.length;
      totalProblems += this.getTotalProblemsCount(cty);
    });
    return { countries: countries.length, years: totalYears, problems: totalProblems };
  }
}

// Create global instance
const dataLoader = new DataLoader();
