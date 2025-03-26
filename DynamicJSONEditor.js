(function(window) {
  /**
   * DynamicJSONEditor
   * Recursively renders and allows editing of any nested JSON structure.
   * @param {Object} options - Configuration options.
   * @param {HTMLElement|Object} options.inputElement - Textarea containing the JSON string or a custom object with getValue/setValue methods.
   * @param {HTMLElement} options.editorElement - Container where the editor is rendered.
   * @param {HTMLElement} options.feedbackElement - Element to show validation messages.
   * @param {Function} [options.onUpdate] - Callback invoked whenever the JSON data is updated.
   */
  function DynamicJSONEditor(options) {
    this.inputElement = options.inputElement;
    this.editorElement = options.editorElement;
    this.feedbackElement = options.feedbackElement;
    this.onUpdate = options.onUpdate || function(data) {};
    this.data = {}; // main JSON data
    
    // For custom input element (like CodeMirror)
    this.getValue = options.getValue || function() { 
      return this.inputElement.value; 
    };
    this.setValue = options.setValue || function(value) { 
      this.inputElement.value = value; 
    };
    
    this.init();
  }

  DynamicJSONEditor.prototype.init = function() {
    var self = this;
    // Update JSON when the textarea changes.
    this.inputElement.addEventListener('input', function() {
      self.parseInput();
    });
    // Initial parse
    this.parseInput();
  };

  // Parse JSON from the textarea.
  DynamicJSONEditor.prototype.parseInput = function() {
    try {
      var parsed = JSON.parse(this.getValue());
      this.data = parsed;
      this.feedbackElement.textContent = "Valid JSON!";
      this.feedbackElement.className = "alert alert-success";
      this.render();
      this.onUpdate(this.data);
    } catch (e) {
      this.feedbackElement.textContent = "Invalid JSON: " + e.message;
      this.feedbackElement.className = "alert alert-danger";
    }
  };

  // Render the entire editor recursively.
  DynamicJSONEditor.prototype.render = function() {
    this.editorElement.innerHTML = "";
    this.renderEditor(this.data, this.editorElement, []);
  };

  /**
   * Create a toggle button for collapsible containers
   * @returns {HTMLElement} - The toggle button element
   */
  DynamicJSONEditor.prototype.createToggleButton = function(container) {
    var toggleBtn = document.createElement("span");
    toggleBtn.className = "toggle-btn";
    toggleBtn.innerHTML = "▼";
    toggleBtn.title = "Collapse/Expand";
    
    toggleBtn.addEventListener("click", function() {
      if (container.classList.contains("collapsed")) {
        container.classList.remove("collapsed");
        toggleBtn.innerHTML = "▼";
      } else {
        container.classList.add("collapsed");
        toggleBtn.innerHTML = "►";
      }
    });
    
    return toggleBtn;
  };

  /**
   * Creates a summary of object/array contents for collapsed view
   * @param {*} data - The data to summarize
   * @returns {string} - A string summary of the data
   */
  DynamicJSONEditor.prototype.createSummary = function(data) {
    if (Array.isArray(data)) {
      return data.length + " items";
    } else if (typeof data === "object" && data !== null) {
      var keys = Object.keys(data);
      return keys.length + " properties" + 
        (keys.length > 0 ? " (" + keys.slice(0, 3).join(", ") + (keys.length > 3 ? "..." : "") + ")" : "");
    }
    return "";
  };

  /**
   * Recursively render a portion of the JSON data.
   * @param {*} data - The current data (object, array, or primitive).
   * @param {HTMLElement} container - The container to render into.
   * @param {Array} path - Array representing the location of data within the main JSON.
   */
  DynamicJSONEditor.prototype.renderEditor = function(data, container, path) {
    var self = this;
    if (typeof data === "object" && data !== null) {
      if (Array.isArray(data)) {
        // Render an array with Bootstrap styling
        var arrayContainer = document.createElement("div");
        arrayContainer.className = "array-container collapsible-container";
        
        // Add toggle button for collapsing
        arrayContainer.appendChild(this.createToggleButton(arrayContainer));
        
        var pathLabel = document.createElement("div");
        pathLabel.className = "mb-2 text-muted";
        pathLabel.textContent = "Array" + (path.length ? " at " + path.join('.') : "");
        arrayContainer.appendChild(pathLabel);
        
        // Summary for collapsed view
        var summary = document.createElement("span");
        summary.className = "array-summary";
        summary.textContent = "[" + this.createSummary(data) + "]";
        arrayContainer.appendChild(summary);
        
        // Container for array items (collapsible content)
        var itemsContainer = document.createElement("div");
        itemsContainer.className = "ms-3 collapsible-content";
        
        data.forEach(function(item, index) {
          var itemDiv = document.createElement("div");
          itemDiv.className = "array-item d-flex align-items-start";
          
          // Index badge
          var indexBadge = document.createElement("span");
          indexBadge.className = "badge me-2 mt-1";
          indexBadge.textContent = index;
          itemDiv.appendChild(indexBadge);
          
          // Value container
          var valueContainer = document.createElement("div");
          valueContainer.className = "flex-grow-1";
          valueContainer.appendChild(self.createEditorForValue(item, path.concat(index)));
          itemDiv.appendChild(valueContainer);
          
          // Button group for actions
          var btnGroup = document.createElement("div");
          btnGroup.className = "ms-2";
          
          // Delete button
          var delButton = document.createElement("button");
          delButton.className = "btn btn-danger btn-sm";
          delButton.innerHTML = '<i class="bi bi-trash"></i>';
          delButton.title = "Delete item";
          delButton.addEventListener("click", function() {
            var arr = self.getDataByPath(path);
            arr.splice(index, 1);
            self.update();
          });
          btnGroup.appendChild(delButton);
          
          itemDiv.appendChild(btnGroup);
          itemsContainer.appendChild(itemDiv);
        });
        
        arrayContainer.appendChild(itemsContainer);
        
        // Add new element button
        var addButtonRow = document.createElement("div");
        addButtonRow.className = "mt-2 collapsible-content";
        
        var addButton = document.createElement("button");
        addButton.className = "btn btn-primary btn-sm";
        addButton.innerHTML = '<i class="bi bi-plus-circle"></i> Add Item';
        addButton.addEventListener("click", function() {
          var arr = self.getDataByPath(path);
          arr.push("");
          self.update();
        });
        
        addButtonRow.appendChild(addButton);
        arrayContainer.appendChild(addButtonRow);
        
        container.appendChild(arrayContainer);
      } else {
        // Render an object with Bootstrap styling
        var objectContainer = document.createElement("div");
        objectContainer.className = "object-container card border-0 collapsible-container";
        
        // Add toggle button for collapsing
        objectContainer.appendChild(this.createToggleButton(objectContainer));
        
        // Add a header for the object
        if (path.length > 0) {
          var objectHeader = document.createElement("div");
          objectHeader.className = "mb-2 text-muted";
          objectHeader.textContent = "Object" + (path.length ? " at " + path.join('.') : "");
          objectContainer.appendChild(objectHeader);
        }
        
        // Summary for collapsed view
        var summary = document.createElement("span");
        summary.className = "object-summary";
        summary.textContent = "{" + this.createSummary(data) + "}";
        objectContainer.appendChild(summary);
        
        // Properties container (collapsible content)
        var propsContainer = document.createElement("div");
        propsContainer.className = "ms-2 collapsible-content";
        
        // Render each property
        for (var key in data) {
          if (data.hasOwnProperty(key)) {
            var propertyRow = document.createElement("div");
            propertyRow.className = "object-property p-2 d-flex align-items-start";
            
            // Property key
            var keyLabel = document.createElement("div");
            keyLabel.className = "node-label me-2 text-primary";
            keyLabel.style.minWidth = "100px";
            keyLabel.textContent = key + ":";
            propertyRow.appendChild(keyLabel);
            
            // Property value
            var valueContainer = document.createElement("div");
            valueContainer.className = "flex-grow-1";
            valueContainer.appendChild(self.createEditorForValue(data[key], path.concat(key)));
            propertyRow.appendChild(valueContainer);
            
            // Delete button
            var btnContainer = document.createElement("div");
            btnContainer.className = "ms-2";
            
            var delButton = document.createElement("button");
            delButton.className = "btn btn-danger btn-sm";
            delButton.innerHTML = '<i class="bi bi-trash"></i>';
            delButton.title = "Delete property";
            // Use an IIFE to capture the current key.
            delButton.addEventListener("click", (function(k) {
              return function() {
                var obj = self.getDataByPath(path);
                delete obj[k];
                self.update();
              };
            })(key));
            
            btnContainer.appendChild(delButton);
            propertyRow.appendChild(btnContainer);
            
            propsContainer.appendChild(propertyRow);
          }
        }
        
        objectContainer.appendChild(propsContainer);
        
        // Add new property form (collapsible content)
        var addPropertyForm = document.createElement("div");
        addPropertyForm.className = "mt-3 p-2 border-top collapsible-content";
        
        var formRow = document.createElement("div");
        formRow.className = "d-flex";
        
        // Key input
        var keyInput = document.createElement("input");
        keyInput.type = "text";
        keyInput.className = "form-control form-control-sm me-2";
        keyInput.placeholder = "New key";
        formRow.appendChild(keyInput);
        
        // Value input
        var valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.className = "form-control form-control-sm me-2";
        valueInput.placeholder = "New value";
        formRow.appendChild(valueInput);
        
        // Add button
        var addButton = document.createElement("button");
        addButton.className = "btn btn-success btn-sm";
        addButton.innerHTML = "Add";
        addButton.addEventListener("click", function() {
          var newKey = keyInput.value.trim();
          if (!newKey) {
            alert("Key cannot be empty");
            return;
          }
          var newValue = valueInput.value;
          try {
            newValue = JSON.parse(newValue);
          } catch (e) {
            // If parsing fails, leave it as a string.
          }
          var obj = self.getDataByPath(path);
          if (obj.hasOwnProperty(newKey)) {
            alert("Key already exists");
            return;
          }
          obj[newKey] = newValue;
          self.update();
          
          // Clear inputs
          keyInput.value = "";
          valueInput.value = "";
        });
        
        formRow.appendChild(addButton);
        addPropertyForm.appendChild(formRow);
        objectContainer.appendChild(addPropertyForm);
        
        container.appendChild(objectContainer);
      }
    } else {
      // For primitive values, simply create an input.
      container.appendChild(self.createEditorForValue(data, path));
    }
  };

  /**
   * Create an input field for editing a primitive value.
   * For objects/arrays, the recursive call in renderEditor handles rendering.
   * @param {*} value - The value to edit.
   * @param {Array} path - The path to this value in the main JSON object.
   * @returns {HTMLElement} - The input element.
   */
  DynamicJSONEditor.prototype.createEditorForValue = function(value, path) {
    var self = this;
    // If the value is an object or array, render its editor recursively.
    if (typeof value === "object" && value !== null) {
      var wrapper = document.createElement("div");
      self.renderEditor(value, wrapper, path);
      return wrapper;
    } else {
      // Create a Bootstrap-styled input for primitive values
      var inputGroup = document.createElement("div");
      inputGroup.className = "input-group input-group-sm";
      
      var input = document.createElement("input");
      input.type = "text";
      input.className = "form-control";
      input.value = value;
      
      // Add a badge indicating the data type
      var typeBadge = document.createElement("span");
      typeBadge.className = "input-group-text";
      var type = typeof value;
      if (value === null) type = "null";
      if (type === "string") {
        typeBadge.className += " bg-info text-white";
      } else if (type === "number") {
        typeBadge.className += " bg-warning text-dark";
      } else if (type === "boolean") {
        typeBadge.className += " bg-success text-white";
      } else {
        typeBadge.className += " bg-secondary text-white";
      }
      typeBadge.textContent = type;
      
      inputGroup.appendChild(input);
      inputGroup.appendChild(typeBadge);
      
      input.addEventListener("change", function() {
        var parent = self.getParentByPath(path);
        var key = path[path.length - 1];
        var newVal = input.value;
        try {
          // Try to parse as JSON for numbers, booleans, null
          if (newVal.toLowerCase() === "true" || 
              newVal.toLowerCase() === "false" || 
              newVal === "null" || 
              !isNaN(newVal)) {
            newVal = JSON.parse(newVal);
          }
        } catch(e) {
          // If parsing fails, keep it as a string.
        }
        parent[key] = newVal;
        self.update();
      });
      
      return inputGroup;
    }
  };

  // Returns the parent object/array for the given path.
  DynamicJSONEditor.prototype.getParentByPath = function(path) {
    if (path.length === 0) return this.data;
    var parentPath = path.slice(0, -1);
    return this.getDataByPath(parentPath);
  };

  // Traverses the main JSON using the given path.
  DynamicJSONEditor.prototype.getDataByPath = function(path) {
    var current = this.data;
    for (var i = 0; i < path.length; i++) {
      current = current[path[i]];
    }
    return current;
  };

  // Called whenever the data changes: updates the textarea, re-renders the editor, and calls the callback.
  DynamicJSONEditor.prototype.update = function() {
    this.setValue(JSON.stringify(this.data, null, 2));
    this.render();
    this.onUpdate(this.data);
  };

  // Expose the editor to the global scope.
  window.DynamicJSONEditor = DynamicJSONEditor;
})(window);
