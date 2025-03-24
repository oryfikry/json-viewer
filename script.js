document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const jsonEditor = document.getElementById('json-editor');
    const jsonTree = document.getElementById('json-tree');
    const formatBtn = document.getElementById('format-json-btn');
    const fixFormatBtn = document.getElementById('fix-json-btn');
    const validateBtn = document.getElementById('validate-json-btn');
    const addBtn = document.getElementById('add-btn');
    const validationMessage = document.getElementById('validation-message');
    const viewerTab = document.getElementById('viewer-tab');
    const textTab = document.getElementById('text-tab');

    // Current JSON data
    let jsonData = null;

    // Initialize code editor
    const editor = new JsonCodeEditor('json-editor');

    // Initialize
    initEventListeners();

    // Set up event listeners
    function initEventListeners() {
        // Format JSON button
        formatBtn.addEventListener('click', function() {
            const success = editor.formatJson();
            if (success) {
                showValidationSuccess("JSON formatted successfully");
            } else {
                showValidationError("Cannot format: Invalid JSON");
                alert("Invalid JSON. Please fix errors first.");
            }
        });
        
        // Fix JSON Format button
        fixFormatBtn.addEventListener('click', function() {
            const success = editor.fixJsonFormat();
            if (success) {
                showValidationSuccess("JSON format fixed successfully");
            } else {
                showValidationError("Partial fix applied. JSON may still have issues.");
            }
        });
        
        // Validate JSON button
        validateBtn.addEventListener('click', function() {
            const result = editor.validateJson();
            if (result.valid) {
                showValidationSuccess(result.message);
                alert("JSON is valid!");
            } else {
                // Build a more detailed error message
                let errorMsg = result.message;
                
                // Add line and column information if available
                if (result.line) {
                    errorMsg += `\n\nError location: Line ${result.line}`;
                    if (result.column) {
                        errorMsg += `, Column ${result.column}`;
                    }
                    
                    // Provide a hint for common errors
                    if (errorMsg.includes("Expected")) {
                        const expectedMatch = errorMsg.match(/Expected\s+'([^']+)'/);
                        if (expectedMatch) {
                            errorMsg += `\n\nTip: Check if you're missing a ${expectedMatch[1]} character at this location.`;
                        }
                    } else if (errorMsg.includes("Unexpected")) {
                        errorMsg += "\n\nTip: You might have an extra comma or a missing quote.";
                    }
                }
                
                showValidationError(result.message);
                alert("Invalid JSON: " + errorMsg);
            }
        });
        
        // Add button
        addBtn.addEventListener('click', addElement);
        
        // Tab change events
        viewerTab.addEventListener('shown.bs.tab', function() {
            try {
                const text = editor.getValue().trim();
                if (text) {
                    jsonData = JSON.parse(text);
                    renderJsonTree(jsonData);
                }
            } catch (e) {
                showValidationError("Please fix JSON errors before switching to Viewer tab");
                textTab.click(); // Switch back to text tab
            }
        });
    }

    // Add element function (handles both root and child elements)
    function addElement() {
        if (!jsonData) {
            // If no JSON data exists, create a root element
            addRootElement();
        } else {
            // If JSON data exists, add to the root
            addJsonNode(jsonData);
        }
    }

    // Render JSON as a tree in the viewer tab
    function renderJsonTree(data, container = jsonTree) {
        container.innerHTML = '';
        
        if (data === null || data === undefined) {
            container.innerHTML = '<div class="alert alert-info">No JSON data to display</div>';
            return;
        }
        
        if (typeof data === 'object') {
            const rootItem = document.createElement('div');
            rootItem.className = 'json-tree-item';
            
            if (Array.isArray(data)) {
                createArrayNode(rootItem, data, 'root');
            } else {
                createObjectNode(rootItem, data, 'root');
            }
            
            container.appendChild(rootItem);
        } else {
            // Handle primitive root value
            const valueItem = document.createElement('div');
            valueItem.className = 'json-tree-item';
            valueItem.appendChild(createValueElement(data, 'root'));
            container.appendChild(valueItem);
        }
    }

    // Create an object node in the tree
    function createObjectNode(container, obj, key) {
        const isEmpty = Object.keys(obj).length === 0;
        
        // Create a wrapper for the toggle and controls
        const headerWrapper = document.createElement('div');
        headerWrapper.className = 'node-header';
        container.appendChild(headerWrapper);
        
        // Create toggle element if not empty
        if (!isEmpty) {
            const toggle = document.createElement('span');
            toggle.className = 'json-toggle';
            
            // Add key text with separator
            if (key !== undefined) {
                const keyText = document.createElement('span');
                keyText.className = 'json-key';
                keyText.textContent = key + ': ';
                toggle.appendChild(keyText);
            }
            
            // Add object type indicator
            const typeText = document.createElement('span');
            typeText.className = 'json-toggle-text';
            typeText.textContent = '{ ... }';
            toggle.appendChild(typeText);
            
            toggle.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent event bubbling
                
                // Toggle this element's collapsed state
                this.classList.toggle('collapsed');
                
                // Find the content container (sibling of the header)
                const content = headerWrapper.nextElementSibling;
                
                // Toggle display
                const isCollapsed = this.classList.contains('collapsed');
                if (content && content.classList.contains('json-object')) {
                    content.style.display = isCollapsed ? 'none' : 'block';
                }
            });
            headerWrapper.appendChild(toggle);
        } else {
            // Just show the key for empty objects
            if (key) {
                const keySpan = document.createElement('span');
                keySpan.className = 'json-key';
                keySpan.textContent = key + ': ';
                headerWrapper.appendChild(keySpan);
            }
        }
        
        // Add edit controls
        addEditControls(headerWrapper, obj, key);
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'json-object';
        if (isEmpty) {
            content.textContent = '{}';
        } else {
            for (const [k, v] of Object.entries(obj)) {
                const item = document.createElement('div');
                item.className = 'json-tree-item';
                
                if (typeof v === 'object' && v !== null) {
                    if (Array.isArray(v)) {
                        createArrayNode(item, v, k);
                    } else {
                        createObjectNode(item, v, k);
                    }
                } else {
                    const keySpan = document.createElement('span');
                    keySpan.className = 'json-key';
                    keySpan.textContent = k + ': ';
                    item.appendChild(keySpan);
                    item.appendChild(createValueElement(v));
                    
                    // Add edit controls for primitive values
                    addEditControls(item, obj, k);
                }
                
                content.appendChild(item);
            }
        }
        
        container.appendChild(content);
    }

    // Create an array node in the tree
    function createArrayNode(container, arr, key) {
        const isEmpty = arr.length === 0;
        
        // Create a wrapper for the toggle and controls
        const headerWrapper = document.createElement('div');
        headerWrapper.className = 'node-header';
        container.appendChild(headerWrapper);
        
        // Create toggle element if not empty
        if (!isEmpty) {
            const toggle = document.createElement('span');
            toggle.className = 'json-toggle';
            
            // Add key text with separator
            if (key !== undefined) {
                const keyText = document.createElement('span');
                keyText.className = 'json-key';
                keyText.textContent = key + ': ';
                toggle.appendChild(keyText);
            }
            
            // Add array type indicator
            const typeText = document.createElement('span');
            typeText.className = 'json-toggle-text';
            typeText.textContent = `[ ${arr.length} items ]`;
            toggle.appendChild(typeText);
            
            toggle.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent event bubbling
                
                // Toggle this element's collapsed state
                this.classList.toggle('collapsed');
                
                // Find the content container (sibling of the header)
                const content = headerWrapper.nextElementSibling;
                
                // Toggle display
                const isCollapsed = this.classList.contains('collapsed');
                if (content && content.classList.contains('json-array')) {
                    content.style.display = isCollapsed ? 'none' : 'block';
                }
            });
            headerWrapper.appendChild(toggle);
        } else {
            // Just show the key for empty arrays
            if (key) {
                const keySpan = document.createElement('span');
                keySpan.className = 'json-key';
                keySpan.textContent = key + ': ';
                headerWrapper.appendChild(keySpan);
            }
        }
        
        // Add edit controls
        addEditControls(headerWrapper, arr, key);
        
        // Create content container
        const content = document.createElement('div');
        content.className = 'json-array';
        if (isEmpty) {
            content.textContent = '[]';
        } else {
            for (let i = 0; i < arr.length; i++) {
                const item = document.createElement('div');
                item.className = 'json-tree-item';
                
                if (typeof arr[i] === 'object' && arr[i] !== null) {
                    if (Array.isArray(arr[i])) {
                        createArrayNode(item, arr[i], i);
                    } else {
                        createObjectNode(item, arr[i], i);
                    }
                } else {
                    const keySpan = document.createElement('span');
                    keySpan.className = 'json-key';
                    keySpan.textContent = i + ': ';
                    item.appendChild(keySpan);
                    item.appendChild(createValueElement(arr[i]));
                    
                    // Add edit controls for primitive values
                    addEditControls(item, arr, i);
                }
                
                content.appendChild(item);
            }
        }
        
        container.appendChild(content);
    }

    // Create a value element based on type
    function createValueElement(value) {
        const valueSpan = document.createElement('span');
        
        if (value === null) {
            valueSpan.className = 'json-value json-null';
            valueSpan.textContent = 'null';
        } else if (typeof value === 'boolean') {
            valueSpan.className = 'json-value json-boolean';
            valueSpan.textContent = value.toString();
        } else if (typeof value === 'number') {
            valueSpan.className = 'json-value json-number';
            valueSpan.textContent = value.toString();
        } else if (typeof value === 'string') {
            valueSpan.className = 'json-value json-string';
            valueSpan.textContent = '"' + value + '"';
        } else {
            valueSpan.className = 'json-value';
            valueSpan.textContent = value.toString();
        }
        
        return valueSpan;
    }

    // Add edit controls to a tree node
    function addEditControls(container, parent, key) {
        const controls = document.createElement('span');
        controls.className = 'edit-controls';
        
        // Add button - now added to all nodes, not just objects/arrays
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-sm btn-outline-success add-json-btn';
        addBtn.textContent = 'Add';
        
        // Different behavior based on context
        if (parent[key] !== null && typeof parent[key] === 'object') {
            // If this is an object or array, add to it
            addBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                addJsonNode(parent[key]);
            });
        } else {
            addBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Add to the parent object/array, not this node
                addJsonNode(parent);
            });
        }
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-outline-primary edit-json-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            editJsonNode(parent, key);
        });
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-outline-danger delete-json-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteJsonNode(parent, key);
        });
        
        controls.appendChild(addBtn);
        controls.appendChild(editBtn);
        controls.appendChild(deleteBtn);
        
        // If this is a primitive value node, add controls after the value
        if (container.lastChild && (container.lastChild.classList.contains('json-value') || 
                                    container.lastChild.classList.contains('json-toggle-text'))) {
            container.appendChild(controls);
        } else {
            // For objects and arrays, add controls right after the toggle/key
            container.insertBefore(controls, container.lastChild);
        }
    }

    // Edit a JSON node
    function editJsonNode(parent, key) {
        let value = parent[key];
        let newValue;
        
        if (value === null) {
            newValue = prompt(`Edit value for "${key}"`, 'null');
            if (newValue === null) return; // Cancelled
            
            // Try to parse the value
            try {
                parent[key] = JSON.parse(newValue);
            } catch (e) {
                // If parsing fails, treat as a string
                parent[key] = newValue;
            }
        } else if (typeof value === 'object') {
            // For objects, allow editing the key if not an array index
            if (!Array.isArray(parent)) {
                const newKey = prompt(`Edit key (currently "${key}")`, key);
                if (newKey === null) return; // Cancelled
                
                if (newKey !== key) {
                    parent[newKey] = value;
                    delete parent[key];
                }
            }
        } else {
            // For primitive values
            const type = typeof value;
            if(type !== 'undefined'){
                newValue = prompt(`Edit ${type} value for "${key}"`, value);
            }else{
                newValue = alert('Unable to edit this value');
                return;
            }
            if (newValue === null) return; // Cancelled
            
            // Try to maintain the same type
            if (type === 'number') {
                parent[key] = Number(newValue);
            } else if (type === 'boolean') {
                parent[key] = newValue.toLowerCase() === 'true';
            } else {
                parent[key] = newValue;
            }
        }
        
        // Update both views
        renderJsonTree(jsonData);
        editor.setValue(JSON.stringify(jsonData, null, 4));
    }

    // Delete a JSON node
    function deleteJsonNode(parent, key) {
        if(Array.isArray(parent) ||  typeof parent[key] == 'undefined'){
            alert('Unable to delete this value');
            return;
        }
        if (confirm(`Are you sure you want to delete "${parent[key]} - ${key}" ?`)) {
            if (Array.isArray(parent)) {
                // For arrays, we need to splice to keep the array indices correct
                parent.splice(key, 1);
            } else {
                // For objects, just delete the property
                delete parent[key];
            }
            
            // Update both views
            renderJsonTree(jsonData);
            editor.setValue(JSON.stringify(jsonData, null, 4));
        }
    }

    // Add a new node to an object or array
    function addJsonNode(target) {
        if (Array.isArray(target)) {
            // For arrays, just add a new item
            const value = prompt('Enter a value to add to the array:');
            if (value === null) return; // Cancelled
            
            // Try to parse the value
            try {
                target.push(JSON.parse(value));
            } catch (e) {
                // If parsing fails, treat as a string
                target.push(value);
            }
        } else {
            // For objects, need a key and value
            const key = prompt('Enter a new key:');
            if (key === null || key === '') return; // Cancelled or empty
            
            const value = prompt(`Enter a value for "${key}":`);
            if (value === null) return; // Cancelled
            
            // Try to parse the value
            try {
                target[key] = JSON.parse(value);
            } catch (e) {
                // If parsing fails, treat as a string
                target[key] = value;
            }
        }
        
        // Update both views
        renderJsonTree(jsonData);
        editor.setValue(JSON.stringify(jsonData, null, 4));
    }

    // Add a new root element when the JSON is empty
    function addRootElement() {
        const type = prompt('What type of root element? (object, array, string, number, boolean, null)');
        if (!type) return;
        
        switch (type.toLowerCase()) {
            case 'object':
                jsonData = {};
                break;
            case 'array':
                jsonData = [];
                break;
            case 'string':
                jsonData = prompt('Enter string value:', '') || '';
                break;
            case 'number':
                const num = prompt('Enter number value:', '0');
                jsonData = num ? Number(num) : 0;
                break;
            case 'boolean':
                jsonData = confirm('Select true (OK) or false (Cancel)');
                break;
            case 'null':
                jsonData = null;
                break;
            default:
                alert('Invalid type. Please try again.');
                return;
        }
        
        // Update both views
        renderJsonTree(jsonData);
        editor.setValue(JSON.stringify(jsonData, null, 4));
    }

    // Show validation success message
    function showValidationSuccess(message) {
        showValidationMessage(message, 'validation-success');
    }

    // Show validation error message
    function showValidationError(message) {
        showValidationMessage(message, 'validation-error');
    }

    // Show validation message with a specific class
    function showValidationMessage(message, className) {
        validationMessage.textContent = message;
        validationMessage.className = className;
        
        // Clear message after 3 seconds
        if (message) {
            setTimeout(() => {
                validationMessage.textContent = '';
                validationMessage.className = '';
            }, 3000);
        }
    }
}); 