// UI component builders and renderers

class UIComponents {
    static createCountryNode(country, yearData) {
        const totalProblems = Object.values(yearData).reduce((sum, problems) => sum + problems.length, 0);
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
                <span class="problem-count">${totalProblems}</span>
            </div>
            <div class="tree-children" id="children-${country}">
                ${Object.keys(yearData).sort((a, b) => b - a).map(year => `
                    <div class="year-node" onclick="navigation.selectYear('${country}', '${year}', this)">
                        <span>${year}</span>
                        <span class="problem-count">${yearData[year].length}</span>
                    </div>
                `).join('')}
            </div>
        `;

        return nodeDiv;
    }

    static createProblemCard(problem) {
        // Enhance problem with inline image processing
        const enhancedProblem = imageParser.enhanceProblemWithImages(problem);

        const hasImages = enhancedProblem.statement_images && enhancedProblem.statement_images.length > 0;
        const hasInlineImages = enhancedProblem._has_inline_images;
        const hasAnyImages = hasImages || hasInlineImages;
        const hasSolutions = enhancedProblem.solutions && enhancedProblem.solutions.length > 0;

        return `
            <div class="problem-card">
                <div class="problem-header">
                    <div class="problem-id">${enhancedProblem.id}</div>
                    <div class="problem-meta">
                        <div class="meta-item">
                            <span>📚</span>
                            <span>${enhancedProblem['booklet title'] || 'No booklet'}</span>
                        </div>
                        <div class="meta-item">
                            <span>👤</span>
                            <span>${enhancedProblem.author || 'Unknown author'}</span>
                        </div>
                        <div class="meta-item">
                            <span>🌐</span>
                            <span class="language-badge">${enhancedProblem.language || 'unknown'}</span>
                        </div>
                        <div class="meta-item">
                            <span>${hasAnyImages ? '🖼️' : '📝'}</span>
                            <span>${hasAnyImages ? 'Has images' : 'Text only'}</span>
                        </div>
                    </div>
                </div>

                <div class="problem-content">
                    <div class="problem-statement">
                        ${enhancedProblem.statement_latex || 'No statement available'}
                    </div>

                    ${this.createMetadataSection(enhancedProblem)}

                    ${hasImages ? this.createImagesSection(enhancedProblem.statement_images) : ''}

                    ${hasSolutions ? this.createSolutionsSection(enhancedProblem.solutions, enhancedProblem.id) : '<div class="no-solutions">No solutions available</div>'}

                    ${this.createProvenanceInfo(enhancedProblem._provenance)}
                </div>
            </div>
        `;
    }

    static createMetadataSection(problem) {
        const competitions = problem['competition name'] ?
            problem['competition name'].split(';').map(c => c.trim()) : [];

        return `
            <div class="metadata-section">
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <span class="metadata-label">Pages:</span>
                        <span class="metadata-value">${Array.isArray(problem['page numbers']) ? problem['page numbers'].join(', ') : 'N/A'}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Booklet:</span>
                        <span class="metadata-value">
                            ${problem['booklet_url'] && problem['booklet_url'] !== 'NULL' ?
                                `<a href="${problem['booklet_url']}" class="booklet-link" target="_blank" rel="noopener noreferrer">${problem['booklet title'] || 'View booklet'}</a>` :
                                (problem['booklet title'] || 'No booklet available')
                            }
                        </span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Solutions:</span>
                        <span class="metadata-value">${problem.has_solutions ? 'Available' : 'Not available'}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Copyright:</span>
                        <span class="metadata-value">${problem.copyright_info || 'N/A'}</span>
                    </div>
                </div>
                ${competitions.length > 0 ? `
                    <div class="competition-tags">
                        ${competitions.map(comp => `<span class="competition-tag">${comp}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    static createImagesSection(images) {
        if (!images || images.length === 0) return '';

        return `
            <div class="images-section">
                <strong>📷 Statement Images:</strong>
                <div class="images-grid">
                    ${images.map((img, index) => `
                        <div class="image-placeholder" onclick="imageModal.open('${img.path}', '${(img.alt || 'Problem image').replace(/'/g, "\\'")}')">
                            🖼️ Image ${index + 1}
                            ${img.title ? `<br><small>${img.title}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    static createSolutionsSection(solutions, problemId) {
        if (!solutions || solutions.length === 0) return '';

        return `
            <div class="solution-section">
                ${solutions.map((solution, index) => {
                    // Process solution text for inline images and formatting
                    let processedSolution;
                    if (solution.latex) {
                        processedSolution = imageParser.processInlineImages(solution.latex, `${problemId}_sol_${index}`);
                    } else {
                        processedSolution = { processedText: 'Solution text not available', foundImages: [] };
                    }

                    return `
                        <div class="solution-header" onclick="toggleSolution(event, '${problemId}_${index}')">
                            <button class="solution-toggle">+</button>
                            <span>Solution ${index + 1} ${solution.status ? `(${solution.status})` : ''}</span>
                        </div>
                        <div class="solution-content" id="solution_${problemId}_${index}">
                            ${solution.pages ? `
                                <div class="solution-meta">
                                    📄 Pages: ${solution.pages.join(', ')}
                                </div>
                            ` : ''}
                            <div class="solution-text">
                                ${processedSolution.processedText}
                            </div>
                            ${solution.images && solution.images.length > 0 ? `
                                <div class="images-section">
                                    <strong>Solution Images:</strong>
                                    <div class="images-grid">
                                        ${solution.images.map((img, imgIndex) => `
                                            <div class="image-placeholder" onclick="imageModal.open('${img.path || img}', 'Solution image ${imgIndex + 1}')">
                                                🖼️ Image ${imgIndex + 1}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    static createProvenanceInfo(provenance) {
        if (!provenance) return '';

        return `
            <div class="provenance-info">
                <strong>📁 Source:</strong> ${provenance.folder || 'Unknown'}
                ${provenance.pages_map ? `<br><strong>Pages mapping:</strong> ${Object.entries(provenance.pages_map).map(([key, value]) => `${key}→${value}`).join(', ')}` : ''}
            </div>
        `;
    }

    static showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const problemsGrid = document.getElementById('problemsGrid');
        const loading = document.getElementById('loading');

        if (!emptyState || !problemsGrid || !loading) return;

        emptyState.style.display = 'block';
        problemsGrid.style.display = 'none';
        loading.style.display = 'none';

        emptyState.innerHTML = `
            <h3>📚 Welcome to the Math Problems Dataset</h3>
            <p>Select a country and year from the sidebar to explore problems from mathematical competitions worldwide.</p>
        `;
    }

    static showLoading() {
        const loading = document.getElementById('loading');
        const problemsGrid = document.getElementById('problemsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!loading || !problemsGrid || !emptyState) return;

        loading.style.display = 'block';
        problemsGrid.style.display = 'none';
        emptyState.style.display = 'none';
    }

    static hideLoading() {
        const loading = document.getElementById('loading');
        const problemsGrid = document.getElementById('problemsGrid');

        if (!loading || !problemsGrid) return;

        loading.style.display = 'none';
        problemsGrid.style.display = 'grid';
    }

    static displayNoResults() {
        const grid = document.getElementById('problemsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!grid || !emptyState) return;

        grid.innerHTML = '';
        emptyState.innerHTML = `
            <h3>No problems found</h3>
            <p>Try adjusting your search terms or filters</p>
        `;
        emptyState.style.display = 'block';
    }
}
