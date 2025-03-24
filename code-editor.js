/**
 * Simple JSON Code Editor
 * A lightweight code editor for JSON with syntax highlighting and validation
 */
class JsonCodeEditor {
    constructor(editorId) {
        this.container = document.getElementById(editorId);
        if (!this.container) {
            console.error(`Element with ID ${editorId} not found`);
            return;
        }
        
        // Make the container editable and set attributes
        this.container.contentEditable = true;
        this.container.spellcheck = false;
        this.container.autocorrect = 'off';
        this.container.autocapitalize = 'off';
        this.container.dataset.gramm = false; // Disable Grammarly
        
        // Debounce timers
        this.highlightTimer = null;
        this.lastContent = '';
        
        // Initialize
        this.setupEventListeners();
        
        // Initialize with empty content
        if (this.isEmpty()) {
            this.setValue("");
        } else {
            this.highlightSyntax();
        }
    }
    
    isEmpty() {
        return !this.container.textContent.trim();
    }
    
    setupEventListeners() {
        // Tab key handling (for indentation)
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    '); // 4 spaces for a tab
            }
        });
        
        // Input event for syntax highlighting with debounce
        this.container.addEventListener('input', () => {
            clearTimeout(this.highlightTimer);
            
            // For very large content, delay highlighting to prevent freezing
            const content = this.getValue();
            
            // If content is very large, only highlight after 1 second of inactivity
            const delay = content.length > 10000 ? 1000 : 300;
            
            // Skip highlighting for extremely large content
            if (content.length > 100000) {
                // Just validate but don't highlight
                this.validateJson(true);
                return;
            }
            
            this.highlightTimer = setTimeout(() => {
                this.handleContentMutation();
            }, delay);
        });
        
        // Paste event handling to clean up pasted content
        this.container.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            
            // For large pastes, insert without immediate highlighting
            if (text.length > 10000) {
                // Disable highlighting temporarily
                this.disableHighlighting = true;
                document.execCommand('insertText', false, text);
                
                // Show loading indicator
                this.showLoadingIndicator();
                
                // Process in chunks using requestAnimationFrame
                setTimeout(() => {
                    this.processLargeContent(text);
                }, 100);
            } else {
                document.execCommand('insertText', false, text);
            }
        });
    }
    
    showLoadingIndicator() {
        // Create a loading overlay if it doesn't exist
        if (!document.getElementById('json-loading-indicator')) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'json-loading-indicator';
            loadingIndicator.innerHTML = 'Processing large JSON...';
            loadingIndicator.style.position = 'absolute';
            loadingIndicator.style.top = '50%';
            loadingIndicator.style.left = '50%';
            loadingIndicator.style.transform = 'translate(-50%, -50%)';
            loadingIndicator.style.padding = '10px 20px';
            loadingIndicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
            loadingIndicator.style.color = 'white';
            loadingIndicator.style.borderRadius = '4px';
            loadingIndicator.style.zIndex = '1000';
            
            document.body.appendChild(loadingIndicator);
        } else {
            document.getElementById('json-loading-indicator').style.display = 'block';
        }
    }
    
    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('json-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
    
    processLargeContent(content) {
        try {
            // Try to parse and format the JSON for better performance
            const parsed = JSON.parse(content);
            // Format with a custom smaller indent for large content
            const formatted = JSON.stringify(parsed, null, 2);
            
            // Set the value without highlighting yet
            this.container.textContent = formatted;
            
            // Use a progressive highlighting approach for large content
            if (formatted.length > 50000) {
                // For extremely large content, skip syntax highlighting
                setTimeout(() => {
                    this.hideLoadingIndicator();
                    this.disableHighlighting = false;
                }, 100);
            } else {
                // For large but manageable content, highlight in the next frame
                requestAnimationFrame(() => {
                    this.highlightSyntax();
                    this.hideLoadingIndicator();
                    this.disableHighlighting = false;
                });
            }
        } catch (e) {
            // If not valid JSON, just set the raw content
            this.container.textContent = content;
            this.hideLoadingIndicator();
            this.disableHighlighting = false;
        }
    }
    
    handleContentMutation() {
        // Skip if content is the same to prevent unnecessary processing
        const currentContent = this.getValue();
        if (currentContent === this.lastContent || this.disableHighlighting) {
            return;
        }
        
        this.lastContent = currentContent;
        
        // For large content, skip highlighting but still validate
        if (currentContent.length > 50000) {
            this.validateJson(true);
        } else {
            this.highlightSyntax();
            this.validateJson(true);
        }
    }
    
    getValue() {
        // Get the text content without HTML
        return this.container.textContent;
    }
    
    setValue(value) {
        // Set raw text value
        this.container.textContent = value;
        
        // For large content, don't highlight automatically
        if (value.length < 50000 && !this.disableHighlighting) {
            // Highlight after setting
            this.highlightSyntax();
        } else {
            // For very large content, at least wrap with line numbers
            this.container.innerHTML = this.wrapLinesWithNumbers(this.escapeHtml(value));
        }
        
        // Place cursor at end
        this.placeCursorAtEnd();
    }
    
    formatJson() {
        try {
            const text = this.getValue().trim();
            if (!text) return false;
            
            const parsed = JSON.parse(text);
            
            // For large JSON, use a smaller indent
            const indent = text.length > 10000 ? 1 : 4;
            
            // Use built-in JSON.stringify for large content as it's more efficient
            if (text.length > 50000) {
                this.setValue(JSON.stringify(parsed, null, indent));
            } else {
                this.setValue(this.formatJsonString(parsed, 0, text.length > 10000));
            }
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Enhanced JSON formatting with proper indentation
    formatJsonString(obj, level = 0, useCompactFormat = false) {
        // Use more compact formatting for large content
        const indent = useCompactFormat ? '  ' : '    '; // 2 or 4 spaces per level
        const baseIndent = indent.repeat(level);
        const nextIndent = indent.repeat(level + 1);
        
        if (obj === null) return 'null';
        
        if (typeof obj !== 'object') {
            // Handle primitive types
            if (typeof obj === 'string') return JSON.stringify(obj);
            return String(obj);
        }
        
        // Handle arrays
        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            
            // For large arrays, use a more compact representation
            if (useCompactFormat && obj.length > 20) {
                let result = '[';
                for (let i = 0; i < obj.length; i++) {
                    if (i > 0) result += ', ';
                    // For large arrays, only show the first 20 items
                    if (i === 20 && obj.length > 20) {
                        result += `... ${obj.length - 20} more items`;
                        break;
                    }
                    result += this.formatJsonString(obj[i], 0, true);
                }
                result += ']';
                return result;
            }
            
            let result = '[\n';
            for (let i = 0; i < obj.length; i++) {
                result += nextIndent + this.formatJsonString(obj[i], level + 1, useCompactFormat);
                if (i < obj.length - 1) result += ',';
                result += '\n';
            }
            result += baseIndent + ']';
            return result;
        }
        
        // Handle objects
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        
        // For large objects, use a more compact representation
        if (useCompactFormat && keys.length > 20) {
            let result = '{';
            for (let i = 0; i < Math.min(keys.length, 20); i++) {
                if (i > 0) result += ', ';
                const key = keys[i];
                result += JSON.stringify(key) + ': ' + this.formatJsonString(obj[key], 0, true);
            }
            if (keys.length > 20) {
                result += `, ... ${keys.length - 20} more properties`;
            }
            result += '}';
            return result;
        }
        
        let result = '{\n';
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            result += nextIndent + JSON.stringify(key) + ': ' + this.formatJsonString(obj[key], level + 1, useCompactFormat);
            if (i < keys.length - 1) result += ',';
            result += '\n';
        }
        result += baseIndent + '}';
        return result;
    }
    
    fixJsonFormat() {
        const text = this.getValue().trim();
        if (!text) return false;
        
        // Show loading indicator for large content
        if (text.length > 10000) {
            this.showLoadingIndicator();
        }
        
        try {
            // Attempt to fix common JSON formatting issues
            let fixedText = text
                // Fix double braces and brackets
                .replace(/\{\{/g, '{')
                .replace(/\}\}/g, '}')
                .replace(/\[\[/g, '[')
                .replace(/\]\]/g, ']')
                // Fix duplicate commas
                .replace(/,\s*,/g, ',')
                .replace(/,\s*\}/g, '}')
                .replace(/,\s*\]/g, ']')
                // Fix missing commas between objects
                .replace(/\}\s*\{/g, '}, {')
                .replace(/\]\s*\[/g, '], [')
                // Fix missing quotes around keys
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
                // Fix duplicate keys by adding index
                .replace(/"([^"]*)"(\s*:\s*[^,}]*),\s*"(\1)"(\s*:)/g, '"$1"$2, "$1_copy"$4');
                
            // Try to parse the fixed JSON
            try {
                const parsed = JSON.parse(fixedText);
                
                // For large content, use more compact formatting
                if (text.length > 50000) {
                    this.setValue(JSON.stringify(parsed, null, 1));
                } else if (text.length > 10000) {
                    this.setValue(JSON.stringify(parsed, null, 2));
                } else {
                    this.setValue(this.formatJsonString(parsed, 0, text.length > 10000));
                }
                
                this.hideLoadingIndicator();
                return true;
            } catch (error) {
                // Handle multi-line strings more aggressively
                // Processing in a separate thread using setTimeout to prevent UI freezing
                setTimeout(() => {
                    try {
                        // A more aggressive fix for multi-line strings
                        const lines = fixedText.split('\n');
                        let result = [];
                        let isInString = false;
                        let buffer = '';
                        
                        for (let line of lines) {
                            for (let i = 0; i < line.length; i++) {
                                const char = line[i];
                                if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
                                    isInString = !isInString;
                                }
                                buffer += char;
                            }
                            
                            if (!isInString) {
                                result.push(buffer);
                                buffer = '';
                            } else {
                                buffer += '\\n'; // Add explicit newline
                            }
                        }
                        
                        const joinedText = result.join('\n');
                        
                        try {
                            const parsed = JSON.parse(joinedText);
                            
                            // Format according to size
                            if (joinedText.length > 50000) {
                                this.setValue(JSON.stringify(parsed, null, 1));
                            } else if (joinedText.length > 10000) {
                                this.setValue(JSON.stringify(parsed, null, 2));
                            } else {
                                this.setValue(this.formatJsonString(parsed, 0, joinedText.length > 10000));
                            }
                            
                            this.hideLoadingIndicator();
                            return true;
                        } catch (parseError) {
                            // If all else fails, just clean up the formatting as best we can
                            this.setValue(fixedText);
                            this.hideLoadingIndicator();
                            return false;
                        }
                    } catch (deepError) {
                        // If all else fails, just clean up the formatting as best we can
                        this.setValue(fixedText);
                        this.hideLoadingIndicator();
                        return false;
                    }
                }, 0);
                
                // Return true to indicate processing is happening
                return true;
            }
        } catch (e) {
            this.hideLoadingIndicator();
            return false;
        }
    }
    
    validateJson(silent = false) {
        try {
            const text = this.getValue().trim();
            if (!text) {
                return { valid: false, message: "Empty input" };
            }
            
            JSON.parse(text);
            if (!silent) {
                this.markErrorLines([]); // Clear error markers
            }
            return { valid: true, message: "JSON is valid" };
        } catch (e) {
            // Extract error details from the message
            const text = this.getValue().trim();
            const details = this.extractErrorDetails(e.message, text);
            
            if (!silent && details.line) {
                this.markErrorLines([details.line]);
                this.scrollToLine(details.line);
                
                if (details.column) {
                    // Optionally highlight the specific column
                    this.highlightErrorPosition(details.line, details.column);
                }
            }
            
            return { 
                valid: false, 
                message: e.message, 
                line: details.line,
                column: details.column,
                position: details.position
            };
        }
    }
    
    // Extract line and column information from error messages
    extractErrorDetails(errorMessage, text) {
        const details = {
            line: null,
            column: null,
            position: null
        };
        
        // Try to get line and column directly from message
        const lineColMatch = errorMessage.match(/line (\d+) column (\d+)/i);
        if (lineColMatch) {
            details.line = parseInt(lineColMatch[1]);
            details.column = parseInt(lineColMatch[2]);
            return details;
        }
        
        // Try to get position
        const posMatch = errorMessage.match(/position (\d+)/i);
        if (posMatch) {
            const position = parseInt(posMatch[1]);
            details.position = position;
            
            // Calculate line and column from position
            const textToPosition = text.substring(0, position);
            const lines = textToPosition.split('\n');
            details.line = lines.length;
            details.column = lines[lines.length - 1].length + 1;
            
            return details;
        }
        
        return details;
    }
    
    // Highlight a specific position (column) in the error line
    highlightErrorPosition(line, column) {
        const lineElements = this.container.querySelectorAll('.line');
        if (line < 1 || line > lineElements.length) return;
        
        const lineElement = lineElements[line - 1];
        
        // Add tooltip to show exact column
        lineElement.setAttribute('title', `Error at line ${line}, column ${column}`);
        
        // Add a tooltip marker at the approximate column position if possible
        try {
            const lineText = lineElement.textContent;
            if (column <= lineText.length) {
                // This is a simple approach - for more complex highlighting,
                // you would need to account for HTML tags and use ranges
                const tooltip = document.createElement('span');
                tooltip.className = 'error-column-indicator';
                tooltip.setAttribute('title', `Error at column ${column}`);
                tooltip.textContent = '↑';
                
                // Append to the container after the line
                this.container.insertBefore(tooltip, lineElement.nextSibling);
                
                // Position it roughly at the column
                tooltip.style.position = 'absolute';
                tooltip.style.left = `calc(3.5em + ${column * 0.6}em)`;
                tooltip.style.top = `${lineElement.offsetTop + lineElement.offsetHeight}px`;
                tooltip.style.color = '#e74c3c';
                tooltip.style.fontSize = '14px';
                tooltip.style.fontWeight = 'bold';
                
                // Remove after a few seconds
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 5000);
            }
        } catch (e) {
            // Ignore positioning errors
            console.warn('Could not position column indicator', e);
        }
    }
    
    // Scroll to a specific line and highlight it
    scrollToLine(lineNumber) {
        if (!lineNumber) return;
        
        // Find the line element
        const lineElements = this.container.querySelectorAll('.line');
        if (lineNumber < 1 || lineNumber > lineElements.length) return;
        
        const lineElement = lineElements[lineNumber - 1];
        
        // Scroll to the element
        lineElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Add blinking effect
        lineElement.classList.add('error-line-blink');
        
        // Remove blinking effect after 5 seconds
        setTimeout(() => {
            lineElement.classList.remove('error-line-blink');
        }, 5000);
    }
    
    markErrorLines(errorLines = []) {
        // Skip for very large content
        if (this.container.textContent.length > 50000) return;
        
        // Clear existing error markers
        const errorLineElements = this.container.querySelectorAll('.error-line, .error-line-blink');
        errorLineElements.forEach(el => {
            el.classList.remove('error-line', 'error-line-blink');
        });
        
        if (!errorLines || errorLines.length === 0) return;
        
        // Find the line elements and add error class
        const lineElements = this.container.querySelectorAll('.line');
        errorLines.forEach(lineNum => {
            if (lineNum > 0 && lineNum <= lineElements.length) {
                lineElements[lineNum - 1].classList.add('error-line');
            }
        });
    }
    
    highlightSyntax() {
        // Skip highlighting if disabled or content is extremely large
        if (this.disableHighlighting) return;
        
        const text = this.getValue();
        if (!text.trim()) {
            this.container.innerHTML = '';
            return;
        }
        
        // Skip syntax highlighting for very large content
        if (text.length > 50000) {
            // Just use basic formatting instead
            this.container.innerHTML = this.escapeHtml(text);
            return;
        }
        
        // For moderately large content, use a simplified tokenizer
        if (text.length > 10000) {
            this.simpleHighlight(text);
            return;
        }
        
        // Normal highlighting for reasonable size content
        const html = this.tokenizeAndHighlight(text);
        this.container.innerHTML = this.wrapLinesWithNumbers(html);
    }
    
    // Wrap content with line numbers
    wrapLinesWithNumbers(html) {
        const lines = html.split('\n');
        return lines.map(line => `<span class="line">${line}</span>`).join('\n');
    }
    
    // Simplified highlighting for large content
    simpleHighlight(text) {
        // Use a more basic regex-based approach for large content
        let html = this.escapeHtml(text);
        
        // Basic regex replacements for syntax highlighting
        // This is much faster than tokenizing for large content
        html = html
            // Highlight strings
            .replace(/"([^"\\]*(\\.[^"\\]*)*)"(?=:)/g, '<span class="json-key">$&</span>')
            .replace(/"([^"\\]*(\\.[^"\\]*)*)"(?!:)/g, '<span class="json-string">$&</span>')
            // Highlight numbers
            .replace(/\b(\d+\.?\d*)\b/g, '<span class="json-number">$&</span>')
            // Highlight booleans
            .replace(/\b(true|false)\b/g, '<span class="json-boolean">$&</span>')
            // Highlight null
            .replace(/\bnull\b/g, '<span class="json-null">$&</span>')
            // Highlight brackets
            .replace(/([{}\[\]])/g, '<span class="json-bracket">$&</span>')
            // Highlight operators
            .replace(/([,:])/g, '<span class="json-operator">$&</span>');
            
        this.container.innerHTML = this.wrapLinesWithNumbers(html);
    }
    
    tokenizeAndHighlight(text) {
        let tokens = [];
        let currentPosition = 0;
        let currentLine = 1;
        
        const isDigit = (char) => /[0-9]/.test(char);
        const isAlpha = (char) => /[a-zA-Z_]/.test(char);
        const isNewline = (char) => char === '\n';
        
        // Use a faster algorithm for moderately large text
        const fastMode = text.length > 5000;
        
        while (currentPosition < text.length) {
            let char = text[currentPosition];
            
            // Handle whitespace
            if (/\s/.test(char)) {
                let whitespace = '';
                while (currentPosition < text.length && /\s/.test(text[currentPosition])) {
                    if (isNewline(text[currentPosition])) {
                        currentLine++;
                    }
                    whitespace += text[currentPosition++];
                }
                tokens.push({ type: 'whitespace', value: whitespace, line: currentLine });
                continue;
            }
            
            // Handle strings
            if (char === '"' || char === "'") {
                const quote = char;
                let string = char;
                let escaped = false;
                currentPosition++;
                
                while (currentPosition < text.length) {
                    char = text[currentPosition++];
                    string += char;
                    
                    if (isNewline(char)) {
                        currentLine++;
                    }
                    
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escaped = true;
                        continue;
                    }
                    
                    if (char === quote) {
                        break;
                    }
                }
                
                tokens.push({ type: 'string', value: string, line: currentLine });
                continue;
            }
            
            // Handle numbers
            if (isDigit(char) || (char === '-' && isDigit(text[currentPosition + 1]))) {
                let number = char;
                currentPosition++;
                
                while (currentPosition < text.length && 
                      (isDigit(text[currentPosition]) || text[currentPosition] === '.' ||
                       text[currentPosition].toLowerCase() === 'e' || 
                       ((text[currentPosition] === '+' || text[currentPosition] === '-') && 
                        text[currentPosition - 1].toLowerCase() === 'e'))) {
                    number += text[currentPosition++];
                }
                
                tokens.push({ type: 'number', value: number, line: currentLine });
                continue;
            }
            
            // Handle keywords (null, true, false)
            if (isAlpha(char)) {
                let word = char;
                currentPosition++;
                
                while (currentPosition < text.length && isAlpha(text[currentPosition])) {
                    word += text[currentPosition++];
                }
                
                if (word === 'null') {
                    tokens.push({ type: 'null', value: word, line: currentLine });
                } else if (word === 'true' || word === 'false') {
                    tokens.push({ type: 'boolean', value: word, line: currentLine });
                } else {
                    tokens.push({ type: 'identifier', value: word, line: currentLine });
                }
                continue;
            }
            
            // Handle brackets and braces
            if (char === '{' || char === '}' || char === '[' || char === ']') {
                tokens.push({ type: 'bracket', value: char, line: currentLine });
                currentPosition++;
                continue;
            }
            
            // Handle colons for key-value pairs
            if (char === ':') {
                tokens.push({ type: 'colon', value: char, line: currentLine });
                currentPosition++;
                continue;
            }
            
            // Handle commas
            if (char === ',') {
                tokens.push({ type: 'comma', value: char, line: currentLine });
                currentPosition++;
                continue;
            }
            
            // Handle any other character
            tokens.push({ type: 'operator', value: char, line: currentLine });
            currentPosition++;
        }
        
        // Process tokens to identify object keys - use a faster approach for larger content
        let html = '';
        let isKey = false;
        
        if (fastMode) {
            // Fast mode skips complex token analysis
            for (const token of tokens) {
                switch (token.type) {
                    case 'whitespace':
                        html += this.escapeHtml(token.value);
                        break;
                    case 'string':
                        html += `<span class="json-string">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'number':
                        html += `<span class="json-number">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'boolean':
                        html += `<span class="json-boolean">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'null':
                        html += `<span class="json-null">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'bracket':
                        html += `<span class="json-bracket">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'colon':
                    case 'comma':
                        html += `<span class="json-operator">${this.escapeHtml(token.value)}</span>`;
                        break;
                    default:
                        html += this.escapeHtml(token.value);
                }
            }
        } else {
            // Normal mode with key detection
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                
                // Mark the token as a key if it's a string followed by a colon
                if (token.type === 'string' && 
                    i < tokens.length - 2 && 
                    tokens[i+1].type === 'whitespace' && 
                    tokens[i+2].type === 'colon') {
                    isKey = true;
                }
                
                // Apply HTML formatting based on token type
                switch (token.type) {
                    case 'whitespace':
                        html += this.escapeHtml(token.value);
                        break;
                    case 'string':
                        if (isKey) {
                            html += `<span class="json-key">${this.escapeHtml(token.value)}</span>`;
                            isKey = false;
                        } else {
                            html += `<span class="json-string">${this.escapeHtml(token.value)}</span>`;
                        }
                        break;
                    case 'number':
                        html += `<span class="json-number">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'boolean':
                        html += `<span class="json-boolean">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'null':
                        html += `<span class="json-null">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'bracket':
                        html += `<span class="json-bracket">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'colon':
                        html += `<span class="json-operator">${this.escapeHtml(token.value)}</span>`;
                        break;
                    case 'comma':
                        html += `<span class="json-operator">${this.escapeHtml(token.value)}</span>`;
                        break;
                    default:
                        html += this.escapeHtml(token.value);
                }
            }
        }
        
        return html;
    }
    
    placeCursorAtEnd() {
        this.container.focus();
        const range = document.createRange();
        range.selectNodeContents(this.container);
        range.collapse(false); // false means collapse to end
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
} 