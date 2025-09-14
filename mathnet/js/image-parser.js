// Image parsing and rendering for inline markdown images in LaTeX text

class ImageParser {
    constructor() {
        // Regex to match markdown image syntax: ![alt](path) or ![](path)
        // Keep /g for global replace; be careful with .test() (we reset lastIndex there)
        this.imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    }

    /**
     * Process LaTeX text to extract and render inline images
     * @param {string} latexText - The original LaTeX text
     * @param {string} problemId - Unique identifier for the problem (for unique IDs)
     * @returns {{processedText: string, foundImages: Array}}
     */
    processInlineImages(latexText, problemId = '') {
        if (!latexText) return { processedText: latexText, foundImages: [] };

        let processedText = String(latexText);
        let imageCounter = 0;
        const foundImages = [];

        // Replace markdown image syntax with HTML
        this.imageRegex.lastIndex = 0; // defensive reset
        processedText = processedText.replace(this.imageRegex, (match, alt, src) => {
            imageCounter++;
            const imageId = `inline-image-${problemId}-${imageCounter}`;

            const altText = alt || `Problem image ${imageCounter}`;
            foundImages.push({
                id: imageId,
                alt: altText,
                src: src,
                original: match
            });

            // Prefer unobtrusive error handling via onerror attribute but without referencing runtime `this` from here
            const imgName = this.getImageName(src).replace(/"/g, '&quot;');

            return `<div class="inline-image-container" id="${imageId}">
                <img src="${src}"
                     alt="${altText}"
                     class="inline-problem-image"
                     onclick="imageModal.open('${src}', '${altText.replace(/'/g, "\\'")}')"
                     onerror="this.parentElement.innerHTML='<div class=&quot;image-error&quot;>❌ Image not found: ${imgName}</div>'"
                     loading="lazy">
            </div>`;
        });

        return {
            processedText,
            foundImages
        };
    }

    /**
     * Extract just the filename from an image path
     * @param {string} imagePath
     * @returns {string}
     */
    getImageName(imagePath) {
        return (imagePath || '').split('/').pop() || imagePath;
    }

    /**
     * Process all images in a problem statement and return enhanced problem object
     * @param {Object} problem - Problem object
     * @returns {Object} - Enhanced problem with processed images
     */
    enhanceProblemWithImages(problem) {
        if (!problem || !problem.statement_latex) return problem;

        const result = this.processInlineImages(problem.statement_latex, problem.id);

        return {
            ...problem,
            statement_latex: result.processedText,
            _inline_images: result.foundImages,
            _has_inline_images: result.foundImages.length > 0
        };
    }

    /**
     * Check if text contains inline images
     * IMPORTANT: reset lastIndex when using .test() with /g
     * @param {string} text
     * @returns {boolean}
     */
    hasInlineImages(text) {
        this.imageRegex.lastIndex = 0; // reset so .test() is deterministic
        return this.imageRegex.test(text || '');
    }

    /**
     * Extract all image paths from text
     * @param {string} text
     * @returns {Array<{alt:string, src:string, full:string}>}
     */
    extractImagePaths(text) {
        const matches = [];
        let match;

        // Reset regex
        this.imageRegex.lastIndex = 0;

        while ((match = this.imageRegex.exec(text || '')) !== null) {
            matches.push({
                alt: match[1] || '',
                src: match[2],
                full: match[0]
            });
        }

        return matches;
    }
}

// Create global instance
const imageParser = new ImageParser();
