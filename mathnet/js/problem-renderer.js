// Problem rendering and display management

class ProblemRenderer {
    constructor() {
        this.currentProblems = [];
    }

    filterAndDisplayProblems() {
        if (!navigation.hasSelection()) return;

        const { country, year } = navigation.getSelectedData();

        UIComponents.showLoading();

        // Add small delay for better UX
        setTimeout(() => {
            const allProblems = dataLoader.getProblems(country, year);
            const filteredProblems = filterManager.filterProblems(allProblems);

            this.displayProblems(filteredProblems);
            UIComponents.hideLoading();
            navigation.updateResultsCount(filteredProblems.length, allProblems.length);
        }, CONFIG.ui.loadingDelay);
    }

    displayProblems(problems) {
        this.currentProblems = problems;
        const grid = document.getElementById('problemsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!grid || !emptyState) return;

        if (problems.length === 0) {
            UIComponents.displayNoResults();
            return;
        }

        emptyState.style.display = 'none';
        grid.innerHTML = problems.map(problem => UIComponents.createProblemCard(problem)).join('');

        // Re-render MathJax for new content
        this.renderMathJax(grid);
    }

    renderMathJax(container) {
        if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetPromise([container]).catch(err => {
                console.warn('MathJax rendering error:', err);
            });
        }
    }

    getCurrentProblems() {
        return this.currentProblems;
    }

    refreshCurrentView() {
        if (navigation.hasSelection()) {
            this.filterAndDisplayProblems();
        } else {
            UIComponents.showEmptyState();
        }
    }
}

// Solution toggle functionality
class SolutionToggle {
    /**
     * @param {MouseEvent} e
     * @param {string} solutionId
     */
    toggle(e, solutionId) {
        const content = document.getElementById(`solution_${solutionId}`);
        const header = e?.currentTarget || e?.target?.closest('.solution-header');
        const toggleBtn = header ? header.querySelector('.solution-toggle') : null;

        if (!content || !toggleBtn) return;

        if (content.classList.contains('show')) {
            content.classList.remove('show');
            toggleBtn.textContent = '+';
        } else {
            content.classList.add('show');
            toggleBtn.textContent = '−';

            // Re-render MathJax for the newly shown solution
            problemRenderer.renderMathJax(content);

            // Debug: Log what's in the solution content
            // console.log('Solution content:', content.innerHTML);
        }
    }
}

// Image modal functionality
class ImageModal {
    constructor() {
        this.modal = null;
        this.modalImg = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    open(imagePath, altText) {
        this.modal = document.getElementById('imageModal');
        this.modalImg = this.modal?.querySelector('img');

        if (!this.modal || !this.modalImg) return;

        this.modal.style.display = 'block';
        this.modalImg.src = imagePath;
        this.modalImg.alt = altText || 'Problem image';
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}

// Create global instances
const problemRenderer = new ProblemRenderer();
const solutionToggle = new SolutionToggle();
const imageModal = new ImageModal();

// Global functions for onclick handlers (to maintain compatibility)
function toggleSolution(e, solutionId) {
    solutionToggle.toggle(e, solutionId);
}

function openImageModal(imagePath, altText) {
    imageModal.open(imagePath, altText);
}

function closeImageModal() {
    imageModal.close();
}
