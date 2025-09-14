// Main application initialization and coordination

class MathProblemsApp {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing Math Problems Dataset application...');

    // Dependency checks
    if (typeof CONFIG === 'undefined') throw new Error('CONFIG not loaded');
    if (typeof dataLoader === 'undefined') throw new Error('dataLoader not loaded');
    if (typeof imageParser === 'undefined') throw new Error('imageParser not loaded');
    if (typeof UIComponents === 'undefined') throw new Error('UIComponents not loaded');
    if (typeof filterManager === 'undefined') throw new Error('filterManager not loaded');
    if (typeof navigation === 'undefined') throw new Error('navigation not loaded');

    try {
      // Load country index first
      await dataLoader.loadProblemsData();

      // Initialize UI components
      this.initializeComponents();

      // Set initial state
      this.setInitialState();

      this.isInitialized = true;
      console.log('Application initialized successfully');

    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showErrorState(error);
    }
  }

  initializeComponents() {
    filterManager.initialize();
    navigation.initialize();
    this.setupGlobalEventHandlers();
  }

  setupGlobalEventHandlers() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.handleResize(), 250);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.handlePageVisible();
    });

    window.addEventListener('popstate', (event) => this.handlePopState(event));
  }

  setInitialState() {
    UIComponents.showEmptyState();
    navigation.updateResultsCount(0, 0);
    this.checkInitialUrlState();
  }

  checkInitialUrlState() {
    const params = new URLSearchParams(window.location.search);
    const country = params.get('country');
    const year = params.get('year');

    if (country && year) {
      // Expand country first (loads the JSON and builds years)
      setTimeout(async () => {
        // try to expand (simulate click)
        const header = Array.from(document.querySelectorAll('.tree-header'))
          .find(h => h.textContent.includes(country));
        if (header) {
          await navigation.toggleCountry(country, header);
          // now find the year node
          const selector = `[onclick*="selectYear('${country}', '${year}', this)"]`;
          const yearElement = document.querySelector(selector);
          if (yearElement) {
            navigation.selectYear(country, year, yearElement);
          }
        }
      }, 150);
    }
  }

  handleResize() { /* optional responsive hooks */ }

  handlePageVisible() {
    if (window.MathJax && navigation.hasSelection()) {
      const problemsGrid = document.getElementById('problemsGrid');
      if (problemsGrid && problemsGrid.children.length > 0) {
        problemRenderer.renderMathJax(problemsGrid);
      }
    }
  }

  handlePopState(event) { /* optional */ }

  showErrorState(error) {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.innerHTML = `
        <h3>⚠️ Application Error</h3>
        <p>Failed to load the Math Problems Dataset. Please refresh the page to try again.</p>
        <p><small>Error: ${error.message}</small></p>
      `;
      emptyState.style.display = 'block';
    }
  }

  getCurrentState() {
    return {
      selection: navigation.getSelectedData(),
      filters: filterManager.getFilterState(),
      problems: problemRenderer.getCurrentProblems(),
      isInitialized: this.isInitialized
    };
  }

  resetApplication() {
    filterManager.resetFilters();
    navigation.showAllProblems();
    UIComponents.showEmptyState();
  }

  getDebugInfo() {
    return {
      dataLoaded: dataLoader.isDataLoaded(),
      totalCountries: (dataLoader.getCountries() || []).length,
      currentState: this.getCurrentState(),
      config: CONFIG
    };
  }
}

// Create global app instance
const app = new MathProblemsApp();

document.addEventListener('DOMContentLoaded', () => {
  app.initialize();
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

window.mathProblemsApp = app;
