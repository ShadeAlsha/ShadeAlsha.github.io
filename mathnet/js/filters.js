// Filter and search functionality

class FilterManager {
  constructor() {
    this.currentFilter = CONFIG.defaultFilters.type;
    this.currentLangFilter = CONFIG.defaultFilters.language;
    this.currentSearch = CONFIG.defaultFilters.search;
    this._debounceId = null;
  }

  initialize() {
    this.setupEventListeners();
  }

  debounce(fn, delay = 250) {
    return (...args) => {
      clearTimeout(this._debounceId);
      this._debounceId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  setupEventListeners() {
    // Search functionality (debounced)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      const onInput = this.debounce((e) => {
        this.currentSearch = e.target.value.toLowerCase();
        this.applyFilters();
      }, 250);
      searchInput.addEventListener('input', onInput);
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setTypeFilter(e.target.dataset.filter);
        this.updateActiveButton(e.target, e.target.parentElement);
        this.applyFilters();
      });
    });

    // Language filter buttons
    document.querySelectorAll('.filter-btn[data-lang]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setLanguageFilter(e.target.dataset.lang);
        this.updateActiveButton(e.target, e.target.parentElement);
        this.applyFilters();
      });
    });
  }

  updateActiveButton(activeBtn, container) {
    container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  setTypeFilter(filter) { this.currentFilter = filter; }
  setLanguageFilter(filter) { this.currentLangFilter = filter; }

  setSearchTerm(term) {
    this.currentSearch = (term || '').toLowerCase();
  }

  applyFilters() {
    if (navigation.selectedCountry && navigation.selectedYear) {
      problemRenderer.filterAndDisplayProblems();
    }
  }

  filterProblems(problems) {
    return problems.filter(problem => {
      return this.matchesSearch(problem) &&
             this.matchesTypeFilter(problem) &&
             this.matchesLanguageFilter(problem);
    });
  }

  matchesSearch(problem) {
    if (this.currentSearch === '') return true;

    const searchableText = [
      problem.statement_latex || '',
      problem.author || '',
      problem.id || '',
      problem['competition name'] || '',
      problem['booklet title'] || ''
    ].join(' ').toLowerCase();

    return searchableText.includes(this.currentSearch);
  }

  matchesTypeFilter(problem) {
    switch (this.currentFilter) {
      case 'has-solution':
        return Array.isArray(problem.solutions) && problem.solutions.length > 0;
      case 'has-images':
        // Check both statement_images array and inline images in text
        const hasStatementImages = Array.isArray(problem.statement_images) && problem.statement_images.length > 0;
        const hasInlineImages = imageParser.hasInlineImages(problem.statement_latex);
        return hasStatementImages || hasInlineImages;
      case 'has-booklet':
        return problem['booklet_url'] && problem['booklet_url'] !== 'NULL';
      case 'all':
      default:
        return true;
    }
  }

  matchesLanguageFilter(problem) {
    if (this.currentLangFilter === 'all') return true;
    return problem.language === this.currentLangFilter;
  }

  getFilterState() {
    return {
      type: this.currentFilter,
      language: this.currentLangFilter,
      search: this.currentSearch
    };
  }

  resetFilters() {
    this.currentFilter = CONFIG.defaultFilters.type;
    this.currentLangFilter = CONFIG.defaultFilters.language;
    this.currentSearch = CONFIG.defaultFilters.search;

    // Reset UI
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    // Reset filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if ((btn.dataset.filter === 'all' && !btn.dataset.lang) ||
          (btn.dataset.lang === 'all' && !btn.dataset.filter)) {
        btn.classList.add('active');
      }
    });
  }
}

// Create global instance
const filterManager = new FilterManager();
