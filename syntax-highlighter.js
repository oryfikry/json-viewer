/**
 * JSON Syntax Highlighter
 * This module adds syntax highlighting to the JSON text area
 */
class JsonSyntaxHighlighter {
    constructor(textAreaId) {
        this.textArea = document.getElementById(textAreaId);
        this.highlightContainer = null;
        this.setupHighlighter();
    }

    setupHighlighter() {
        // Create a container for the highlighter
        const container = document.createElement('div');
        container.className = 'syntax-highlight-container';
        container.style.position = 'relative';
        
        // Style the container to match the textarea
        const textAreaStyles = window.getComputedStyle(this.textArea);
        container.style.fontFamily = textAreaStyles.fontFamily;
        container.style.fontSize = textAreaStyles.fontSize;
        container.style.lineHeight = textAreaStyles.lineHeight;
        container.style.width = '100%';
        container.style.height = 'auto';
        
        // Create the highlight element
        this.highlightContainer = document.createElement('pre');
        this.highlightContainer.className = 'syntax-highlighter';
        this.highlightContainer.style.position = 'absolute';
        this.highlightContainer.style.top = '0';
        this.highlightContainer.style.left = '0';
        this.highlightContainer.style.margin = '0';
        this.highlightContainer.style.padding = textAreaStyles.padding;
        this.highlightContainer.style.width = '100%';
        this.highlightContainer.style.height = '100%';
        this.highlightContainer.style.overflow = 'hidden';
        this.highlightContainer.style.pointerEvents = 'none';
        this.highlightContainer.style.whiteSpace = 'pre-wrap';
        this.highlightContainer.style.wordWrap = 'break-word';
        this.highlightContainer.style.color = 'transparent';
        this.highlightContainer.style.backgroundColor = 'transparent';
        this.highlightContainer.style.borderColor = 'transparent';
        
        // Insert the highlighter before the textarea
        container.appendChild(this.highlightContainer);
        this.textArea.parentNode.insertBefore(container, this.textArea);
        
        // Move the textarea into the container
        container.appendChild(this.textArea);
        
        // Style the textarea to overlay the highlighter
        this.textArea.style.position = 'relative';
        this.textArea.style.backgroundColor = 'transparent';
        this.textArea.style.caretColor = 'black';
        this.textArea.style.color = 'black';
        this.textArea.style.zIndex = '1';
        
        // Set up event listeners
        this.textArea.addEventListener('input', this.highlight.bind(this));
        this.textArea.addEventListener('scroll', this.syncScroll.bind(this));
        this.textArea.addEventListener('focus', this.highlight.bind(this));
        
        // Initial highlight
        this.highlight();
    }

    highlight() {
        const text = this.textArea.value;
        if (!text) {
            this.highlightContainer.innerHTML = '';
            return;
        }
        
        // Pre-process the text to fix common formatting issues
        let processedText = text
            .replace(/\{\{/g, '{') // Replace double open braces
            .replace(/\}\}/g, '}') // Replace double close braces
            .replace(/,,/g, ',')   // Remove duplicate commas
            .replace(/,\s*\}/g, '}') // Remove trailing commas in objects
            .replace(/,\s*\]/g, ']'); // Remove trailing commas in arrays
        
        // Escape HTML entities
        let html = processedText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Try parsing first to see if it's valid JSON
        let isValidJson = false;
        try {
            JSON.parse(processedText);
            isValidJson = true;
        } catch (e) {
            // It's still invalid, but we'll do our best to highlight
        }
        
        if (isValidJson) {
            // For valid JSON, use a more accurate approach with a tokenizer
            try {
                // Create formatted JSON with proper indentation
                const formattedJson = JSON.stringify(JSON.parse(processedText), null, 4);
                
                // Create highlighted HTML
                html = formattedJson
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    // Keys (property names)
                    .replace(/"([^"\\]*(\\.[^"\\]*)*)"(?=\s*:)/g, '<span class="json-key">"$1"</span>')
                    // String values
                    .replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, ': <span class="json-string">"$1"</span>')
                    // Numbers (only when they're actual JSON numbers, not in strings)
                    .replace(/:\s*(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, ': <span class="json-number">$1</span>')
                    // Booleans and null
                    .replace(/:\s*(true|false|null)\b/g, ': <span class="json-$1">$1</span>')
                    // Brackets
                    .replace(/([{}\[\]])/g, '<span class="json-bracket">$1</span>')
                    // Commas
                    .replace(/,/g, '<span class="json-operator">,</span>');
            } catch (e) {
                // Fallback to basic highlighting if something goes wrong
                html = this.basicHighlighting(html);
            }
        } else {
            // If invalid, use simpler highlighting that won't break on malformed JSON
            html = this.basicHighlighting(html);
        }
        
        this.highlightContainer.innerHTML = html;
        
        // Ensure the highlighter matches the textarea's dimensions
        this.highlightContainer.style.height = Math.max(this.textArea.scrollHeight, this.textArea.clientHeight) + 'px';
    }

    // Basic highlighting function for invalid JSON
    basicHighlighting(html) {
        return html
            // Keys with colon
            .replace(/"([^"\n\r]*)"\s*:/g, '<span class="json-key">"$1"</span>:')
            // String values (after colons)
            .replace(/:\s*"([^"\n\r]*)"/g, ': <span class="json-string">"$1"</span>')
            // Other quoted strings
            .replace(/"([^"\n\r]*)"/g, '<span class="json-string">"$1"</span>')
            // Special keywords
            .replace(/\b(true|false|null)\b/g, '<span class="json-$1">$1</span>')
            // Brackets
            .replace(/([{}\[\]])/g, '<span class="json-bracket">$1</span>')
            // Commas and colons
            .replace(/,/g, '<span class="json-operator">,</span>')
            .replace(/:/g, '<span class="json-operator">:</span>');
    }

    syncScroll() {
        this.highlightContainer.scrollTop = this.textArea.scrollTop;
        this.highlightContainer.scrollLeft = this.textArea.scrollLeft;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JsonSyntaxHighlighter;
} 