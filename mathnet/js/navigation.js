// Navigation with async country loading (lazy country fetch)

class NavigationManager {
  constructor() {
    this.selectedCountry = null;
    this.selectedYear = null;
  }

  async initialize() {
    await this.buildNavigationTree();
  }

  async buildNavigationTree() {
    const tree = document.getElementById('navigationTree');
    if (!tree) return;

    tree.innerHTML = '<div class="loading">Loading countries...</div>';

    try {
      const countries = await dataLoader.loadIndex();
      tree.innerHTML = '';

      for (const country of countries) {
        const countryNode = this.createCountryNodeSkeleton(country);
        tree.appendChild(countryNode);
      }
    } catch (error) {
      tree.innerHTML = '<div class="error">Failed to load countries</div>';
      console.error('Failed to build navigation tree:', error);
    }
  }

  createCountryNodeSkeleton(country) {
    const flag = CONFIG.countryFlags[country] || '🌐';

    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'tree-node';

    nodeDiv.innerHTML = `
      <div class="tree-header" onclick="navigation.toggleCountry('${country}', this)">
        <div class="tree-header-left">
          <span class="tree-toggle">▶</span>
          <div class="country-info">
            <span class="country-flag">${flag}</span>
            <span>${country}</span>
          </div>
        </div>
        <span class="problem-count">…</span>
      </div>
      <div class="tree-children" id="children-${country}">
        <div class="loading">Click to load years…</div>
      </div>
    `;

    return nodeDiv;
  }

  async toggleCountry(country, headerElement) {
    const toggle = headerElement.querySelector('.tree-toggle');
    const children = document.getElementById(`children-${country}`);
    if (!children) return;

    const isExpanding = !children.classList.contains('expanded');

    if (isExpanding) {
      children.classList.add('expanded');
      if (toggle) toggle.classList.add('expanded');

      // Load the country JSON now (if not already)
      children.innerHTML = '<div class="loading">Loading years…</div>';
      try {
        await dataLoader.ensureCountryLoaded(country);

        const years = dataLoader.getYears(country);
        const totalCount = dataLoader.getTotalProblemsCount(country);

        // Update header problem count
        const countSpan = headerElement.querySelector('.problem-count');
        if (countSpan) countSpan.textContent = totalCount;

        if (!years.length) {
          children.innerHTML = '<div class="empty">No years found</div>';
          return;
        }

        children.innerHTML = years.map(year => {
          const yearCount = dataLoader.getYearProblemsCount(country, year);
          return `
            <div class="year-node" onclick="navigation.selectYear('${country}', '${year}', this)">
              <span>${year}</span>
              <span class="problem-count">${yearCount}</span>
            </div>
          `;
        }).join('');

      } catch (e) {
        console.error(`Failed to load details for ${country}:`, e);
        children.innerHTML = '<div class="error">Failed to load years</div>';
        const countSpan = headerElement.querySelector('.problem-count');
        if (countSpan) countSpan.textContent = '!';
      }
    } else {
      children.classList.remove('expanded');
      if (toggle) toggle.classList.remove('expanded');
    }
  }

  async selectYear(country, year, yearElement) {
    // Show loading state in the clicked year node
    const originalText = yearElement.innerHTML;
    yearElement.innerHTML = `<span>${year}</span><span class="problem-count">loading…</span>`;

    try {
      // Ensure country is loaded (should be already if clicked from expanded state)
      await dataLoader.ensureCountryLoaded(country);
      const problems = dataLoader.getProblems(country, year);

      // Update selections
      document.querySelectorAll('.year-node.active').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tree-header.active').forEach(el => el.classList.remove('active'));

      yearElement.classList.add('active');
      yearElement.closest('.tree-node')?.querySelector('.tree-header')?.classList.add('active');

      this.selectedCountry = country;
      this.selectedYear = year;

      yearElement.innerHTML = `<span>${year}</span><span class="problem-count">${problems.length}</span>`;

      this.updateBreadcrumb(country, year);
      await problemRenderer.filterAndDisplayProblems();

    } catch (error) {
      console.error(`Failed to load problems for ${country} ${year}:`, error);
      yearElement.innerHTML = originalText; // Restore original
      alert(`Failed to load problems for ${country} ${year}`);
    }
  }

  updateBreadcrumb(country, year) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;

    const flag = CONFIG.countryFlags[country] || '🌐';
    breadcrumb.innerHTML = `
      <a href="#" class="breadcrumb-item" onclick="navigation.showAllProblems()">All Problems</a> >
      <span class="breadcrumb-item">${flag} ${country}</span> >
      <span class="breadcrumb-item">${year}</span>
    `;
  }

  showAllProblems() {
    this.clearSelection();
    UIComponents.showEmptyState();
    this.updateResultsCount(0, 0);

    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = 'Select a country and year to view problems';
    }
  }

  clearSelection() {
    document.querySelectorAll('.year-node.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tree-header.active').forEach(el => el.classList.remove('active'));

    this.selectedCountry = null;
    this.selectedYear = null;
  }

  updateResultsCount(filtered, total) {
    const resultsCount = document.getElementById('resultsCount');
    if (!resultsCount) return;

    if (filtered === total) {
      resultsCount.textContent = `${total} problem${total !== 1 ? 's' : ''}`;
    } else {
      resultsCount.textContent = `${filtered} of ${total} problem${total !== 1 ? 's' : ''}`;
    }
  }

  getSelectedData() {
    return { country: this.selectedCountry, year: this.selectedYear };
  }

  hasSelection() {
    return this.selectedCountry !== null && this.selectedYear !== null;
  }
}

const navigation = new NavigationManager();
