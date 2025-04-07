(function(window) {
  /**
   * DynamicJSONEditor
   * Recursively renders and allows editing of any nested JSON structure.
   * @param {Object} options - Configuration options.
   * @param {HTMLElement|Object} options.inputElement - Textarea containing the JSON string or a custom object with getValue/setValue methods.
   * @param {HTMLElement} options.editorElement - Container where the editor is rendered.
   * @param {HTMLElement} options.feedbackElement - Element to show validation messages.
   * @param {Function} [options.onUpdate] - Callback invoked whenever the JSON data is updated.
   * @param {Object} [options.templates] - Predefined templates for adding new items
   */
  function DynamicJSONEditor(options) {
    this.inputElement = options.inputElement;
    this.editorElement = options.editorElement;
    this.feedbackElement = options.feedbackElement;
    this.onUpdate = options.onUpdate || function(data) {};
    this.data = {}; // main JSON data
    this.templates = options.templates || {
      // Default templates
      "level1": {
        name: "Level 1 Fixed Template",
        template: {
          "id": "",
          "name": "",
          "type": "fixed",
          "properties": {}
        }
      },
      "level2A": {
        name: "Level 2 Template A",
        template: {
          "id": "",
          "type": "templateA",
          "fixedValue": "fixed-A",
          "dynamicValue": ""
        }
      },
      "level2B": {
        name: "Level 2 Template B",
        template: {
          "id": "",
          "type": "templateB",
          "fixedValue": "fixed-B",
          "dynamicValue": ""
        }
      },
      "level2C": {
        name: "Level 2 Template C",
        template: {
          "id": "",
          "type": "templateC",
          "fixedValue": "fixed-C",
          "dynamicValue": ""
        }
      },
      "level2D": {
        name: "Level 2 Template D",
        template: {
          "id": "",
          "type": "templateD",
          "fixedValue": "fixed-D",
          "dynamicValue": ""
        }
      }
    };
    
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
    var treeContainer = document.createElement("div");
    treeContainer.className = "json-tree-view";
    this.editorElement.appendChild(treeContainer);
    this.renderTreeView(this.data, treeContainer, []);
  };

  DynamicJSONEditor.prototype.renderTreeView = function(data, container, path) {
    var self = this;
    
    if (typeof data === "object" && data !== null) {
      var isArray = Array.isArray(data);
      var nodeType = isArray ? "array" : "object";
      var openBrace = isArray ? "[" : "{";
      var closeBrace = isArray ? "]" : "}";
      
      var rootNode = document.createElement("div");
      rootNode.className = "tree-node tree-root";
      
      // Create the first line with the opening brace
      var firstLine = document.createElement("div");
      firstLine.className = "node-line";
      
      var toggleIcon = document.createElement("span");
      toggleIcon.className = "toggle-icon";
      toggleIcon.textContent = "▼";
      toggleIcon.addEventListener("click", function() {
        if (rootNode.classList.contains("collapsed")) {
          rootNode.classList.remove("collapsed");
          toggleIcon.textContent = "▼";
        } else {
          rootNode.classList.add("collapsed");
          toggleIcon.textContent = "►";
        }
      });
      
      firstLine.appendChild(toggleIcon);
      
      var openBraceSpan = document.createElement("span");
      openBraceSpan.className = isArray ? "array-bracket" : "object-brace";
      openBraceSpan.textContent = openBrace;
      firstLine.appendChild(openBraceSpan);
      
      rootNode.appendChild(firstLine);
      
      // Content container for all nested elements
      var contentContainer = document.createElement("div");
      contentContainer.className = "tree-content";
      rootNode.appendChild(contentContainer);
      
      // Render children
      var keys = Object.keys(data);
      keys.forEach(function(key, index) {
        var isLastItem = index === keys.length - 1;
        self.renderTreeNode(data[key], contentContainer, path.concat(key), key, isLastItem);
      });
      
      // Add property/item
      var addLine = document.createElement("div");
      addLine.className = "node-line";
      
      var addButton = document.createElement("span");
      addButton.className = "toggle-icon";
      addButton.innerHTML = "+";
      addButton.title = "Add " + (isArray ? "item" : "property");
      addButton.style.color = "#0a0";
      addButton.style.fontWeight = "bold";
      addButton.addEventListener("click", function() {
        if (isArray) {
          // Get the last item in the array as a template or create empty string
          var arr = self.getDataByPath(path);
          var newItem = "";
          if (arr.length > 0) {
            // Use the last item as a template
            var lastItem = arr[arr.length - 1];
            if (typeof lastItem === "object" && lastItem !== null) {
              // Deep clone the object
              newItem = JSON.parse(JSON.stringify(lastItem));
              // Clear any ID fields or similar identifiers
              if (newItem.id) newItem.id = "";
              if (newItem.ID) newItem.ID = "";
              if (newItem.Id) newItem.Id = "";
              if (newItem.name) newItem.name = "";
              if (newItem.Name) newItem.Name = "";
            } else {
              // For primitive values, use the same type but empty/zero value
              if (typeof lastItem === "string") newItem = "";
              else if (typeof lastItem === "number") newItem = 0;
              else if (typeof lastItem === "boolean") newItem = false;
              else newItem = null;
            }
          }
          arr.push(newItem);
          self.update();
        } else {
          var promptKey = prompt("Enter new property name:");
          if (promptKey) {
            var obj = self.getDataByPath(path);
            if (obj.hasOwnProperty(promptKey)) {
              alert("Key already exists");
              return;
            }
            
            // Check if there are other properties to copy structure from
            var keys = Object.keys(obj);
            if (keys.length > 0) {
              var lastProp = obj[keys[keys.length - 1]];
              var newValue = "";
              if (typeof lastProp === "object" && lastProp !== null) {
                // Deep clone the object
                newValue = JSON.parse(JSON.stringify(lastProp));
                // Clear any ID fields or similar identifiers
                if (newValue.id) newValue.id = "";
                if (newValue.ID) newValue.ID = "";
                if (newValue.Id) newValue.Id = "";
                if (newValue.name) newValue.name = "";
                if (newValue.Name) newValue.Name = "";
              } else {
                // For primitive values, use the same type but empty/zero value
                if (typeof lastProp === "string") newValue = "";
                else if (typeof lastProp === "number") newValue = 0;
                else if (typeof lastProp === "boolean") newValue = false;
                else newValue = null;
              }
              obj[promptKey] = newValue;
            } else {
              obj[promptKey] = "";
            }
            self.update();
          }
        }
      });
      
      var indent = document.createElement("span");
      indent.style.marginLeft = "16px";
      addLine.appendChild(indent);
      addLine.appendChild(addButton);
      contentContainer.appendChild(addLine);
      
      // Last line with closing brace
      var lastLine = document.createElement("div");
      lastLine.className = "node-line";
      
      var closeBraceSpan = document.createElement("span");
      closeBraceSpan.className = isArray ? "array-bracket" : "object-brace";
      closeBraceSpan.textContent = closeBrace;
      lastLine.appendChild(closeBraceSpan);
      
      rootNode.appendChild(lastLine);
      container.appendChild(rootNode);
    } else {
      // For primitive values at the root level (unlikely)
      this.renderTreeNode(data, container, path, null, true);
    }
  };

  DynamicJSONEditor.prototype.renderTreeNode = function(data, container, path, key, isLastItem) {
    var self = this;
    
    var nodeContainer = document.createElement("div");
    nodeContainer.className = "tree-node";
    
    var nodeLine = document.createElement("div");
    nodeLine.className = "node-line";
    
    // Delete icon for the entire node
    var deleteIcon = document.createElement("span");
    deleteIcon.className = "toggle-icon";
    deleteIcon.innerHTML = "×";
    deleteIcon.title = "Delete";
    deleteIcon.style.visibility = "hidden";
    deleteIcon.style.color = "#f00";
    deleteIcon.style.fontWeight = "bold";
    
    nodeLine.addEventListener("mouseenter", function() {
      deleteIcon.style.visibility = "visible";
      if (keyDeleteIcon) keyDeleteIcon.style.visibility = "visible";
    });
    
    nodeLine.addEventListener("mouseleave", function() {
      deleteIcon.style.visibility = "hidden";
      if (keyDeleteIcon) keyDeleteIcon.style.visibility = "hidden";
    });
    
    deleteIcon.addEventListener("click", function(e) {
      e.stopPropagation();
      if (confirm("Delete this " + (Array.isArray(data) ? "array" : typeof data) + "?")) {
        var parent = self.getParentByPath(path);
        var prop = path[path.length - 1];
        if (Array.isArray(parent)) {
          parent.splice(prop, 1);
        } else {
          delete parent[prop];
        }
        self.update();
      }
    });
    
    // Key or index with deletable key
    var keyDeleteIcon = null;
    if (key !== null) {
      // Container for key and its delete icon
      var keyContainer = document.createElement("div");
      keyContainer.className = "key-container";
      keyContainer.style.display = "inline-flex";
      keyContainer.style.alignItems = "center";
      
      // Delete icon for the key
      keyDeleteIcon = document.createElement("span");
      keyDeleteIcon.className = "toggle-icon";
      keyDeleteIcon.innerHTML = "×";
      keyDeleteIcon.title = "Delete Key";
      keyDeleteIcon.style.visibility = "hidden";
      keyDeleteIcon.style.color = "#f00";
      keyDeleteIcon.style.fontWeight = "bold";
      keyDeleteIcon.style.marginRight = "3px";
      keyDeleteIcon.style.fontSize = "0.8em";
      
      keyDeleteIcon.addEventListener("click", function(e) {
        e.stopPropagation();
        if (confirm("Delete this key and its value?")) {
          var parent = self.getParentByPath(path);
          var prop = path[path.length - 1];
          if (Array.isArray(parent)) {
            parent.splice(prop, 1);
          } else {
            delete parent[prop];
          }
          self.update();
        }
      });
      
      // Only show the key delete icon for object properties, not array items
      if (!Array.isArray(self.getParentByPath(path))) {
        keyContainer.appendChild(keyDeleteIcon);
      } else {
        keyDeleteIcon = null;
      }
      
      var keySpan = document.createElement("span");
      keySpan.className = "key";
      keySpan.textContent = Array.isArray(self.getParentByPath(path)) ? "" : "\"" + key + "\"";
      keyContainer.appendChild(keySpan);
      
      nodeLine.appendChild(keyContainer);
      
      var colonSpan = document.createElement("span");
      colonSpan.className = "colon";
      colonSpan.textContent = Array.isArray(self.getParentByPath(path)) ? "" : " : ";
      nodeLine.appendChild(colonSpan);
    }
    
    // Handle different types of values
    if (typeof data === "object" && data !== null) {
      var isArray = Array.isArray(data);
      var openBrace = isArray ? "[" : "{";
      var closeBrace = isArray ? "]" : "}";
      
      // Toggle icon for expandable nodes
      var toggleIcon = document.createElement("span");
      toggleIcon.className = "toggle-icon";
      toggleIcon.textContent = "▼";
      toggleIcon.addEventListener("click", function(e) {
        e.stopPropagation();
        if (nodeContainer.classList.contains("collapsed")) {
          nodeContainer.classList.remove("collapsed");
          toggleIcon.textContent = "▼";
        } else {
          nodeContainer.classList.add("collapsed");
          toggleIcon.textContent = "►";
        }
      });
      
      nodeLine.insertBefore(toggleIcon, nodeLine.firstChild);
      
      // Opening brace
      var openBraceSpan = document.createElement("span");
      openBraceSpan.className = isArray ? "array-bracket" : "object-brace";
      openBraceSpan.textContent = openBrace;
      nodeLine.appendChild(openBraceSpan);
      
      nodeContainer.appendChild(nodeLine);
      
      // Content container
      var contentContainer = document.createElement("div");
      contentContainer.className = "tree-content";
      nodeContainer.appendChild(contentContainer);
      
      // Render children
      var keys = Object.keys(data);
      keys.forEach(function(childKey, index) {
        var isLastChild = index === keys.length - 1;
        self.renderTreeNode(data[childKey], contentContainer, path.concat(childKey), childKey, isLastChild);
      });
      
      // Add button for objects and arrays
      var addLine = document.createElement("div");
      addLine.className = "node-line";
      
      var addButton = document.createElement("span");
      addButton.className = "toggle-icon";
      addButton.innerHTML = "+";
      addButton.title = "Add " + (isArray ? "item" : "property");
      addButton.style.color = "#0a0";
      addButton.style.fontWeight = "bold";
      addButton.addEventListener("click", function(e) {
        e.stopPropagation();
        if (isArray) {
          // Get the last item in the array as a template or create empty string
          var newItem = "";
          if (data.length > 0) {
            // Use the last item as a template
            var lastItem = data[data.length - 1];
            if (typeof lastItem === "object" && lastItem !== null) {
              // Deep clone the object
              newItem = JSON.parse(JSON.stringify(lastItem));
              // Clear any ID fields or similar identifiers
              if (newItem.id) newItem.id = "";
              if (newItem.ID) newItem.ID = "";
              if (newItem.Id) newItem.Id = "";
              if (newItem.name) newItem.name = "";
              if (newItem.Name) newItem.Name = "";
            } else {
              // For primitive values, use the same type but empty/zero value
              if (typeof lastItem === "string") newItem = "";
              else if (typeof lastItem === "number") newItem = 0;
              else if (typeof lastItem === "boolean") newItem = false;
              else newItem = null;
            }
          }
          data.push(newItem);
          self.update();
        } else {
          var promptKey = prompt("Enter new property name:");
          if (promptKey) {
            if (data.hasOwnProperty(promptKey)) {
              alert("Key already exists");
              return;
            }
            
            // Check if there are other properties to copy structure from
            var keys = Object.keys(data);
            if (keys.length > 0) {
              var lastProp = data[keys[keys.length - 1]];
              var newValue = "";
              if (typeof lastProp === "object" && lastProp !== null) {
                // Deep clone the object
                newValue = JSON.parse(JSON.stringify(lastProp));
                // Clear any ID fields or similar identifiers
                if (newValue.id) newValue.id = "";
                if (newValue.ID) newValue.ID = "";
                if (newValue.Id) newValue.Id = "";
                if (newValue.name) newValue.name = "";
                if (newValue.Name) newValue.Name = "";
              } else {
                // For primitive values, use the same type but empty/zero value
                if (typeof lastProp === "string") newValue = "";
                else if (typeof lastProp === "number") newValue = 0;
                else if (typeof lastProp === "boolean") newValue = false;
                else newValue = null;
              }
              data[promptKey] = newValue;
            } else {
              data[promptKey] = "";
            }
            self.update();
          }
        }
      });
      
      var indent = document.createElement("span");
      indent.style.marginLeft = "16px";
      addLine.appendChild(indent);
      addLine.appendChild(addButton);
      contentContainer.appendChild(addLine);
      
      // Closing brace
      var closingLine = document.createElement("div");
      closingLine.className = "node-line";
      
      var closeBraceSpan = document.createElement("span");
      closeBraceSpan.className = isArray ? "array-bracket" : "object-brace";
      closeBraceSpan.textContent = closeBrace;
      closingLine.appendChild(closeBraceSpan);
      
      // Add comma if not the last item
      if (!isLastItem) {
        var commaSpan = document.createElement("span");
        commaSpan.className = "comma";
        commaSpan.textContent = ",";
        closingLine.appendChild(commaSpan);
      }
      
      nodeContainer.appendChild(closingLine);
    } else {
      // For primitive values
      nodeLine.appendChild(deleteIcon);
      
      var valueSpan = document.createElement("span");
      valueSpan.className = "editable value";
      valueSpan.setAttribute("contenteditable", "true");
      
      // Format the value based on type
      if (typeof data === "string") {
        valueSpan.textContent = "\"" + data + "\"";
        valueSpan.dataset.type = "string";
      } else {
        valueSpan.textContent = data;
        valueSpan.dataset.type = typeof data;
      }
      
      // Handle editing of values
      valueSpan.addEventListener("blur", function() {
        var newValue = valueSpan.textContent;
        var type = valueSpan.dataset.type;
        
        // Remove quotes for strings
        if (type === "string" && newValue.startsWith("\"") && newValue.endsWith("\"")) {
          newValue = newValue.substring(1, newValue.length - 1);
        }
        
        // Convert to appropriate type
        try {
          if (type !== "string") {
            newValue = JSON.parse(newValue);
          }
        } catch (e) {
          // If parsing fails, keep as string
          valueSpan.dataset.type = "string";
        }
        
        var parent = self.getParentByPath(path);
        var prop = path[path.length - 1];
        parent[prop] = newValue;
        self.update();
      });
      
      // Handle keypresses during editing
      valueSpan.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          valueSpan.blur();
        }
      });
      
      nodeLine.appendChild(valueSpan);
      
      // Add comma if not the last item
      if (!isLastItem) {
        var commaSpan = document.createElement("span");
        commaSpan.className = "comma";
        commaSpan.textContent = ",";
        nodeLine.appendChild(commaSpan);
      }
      
      nodeContainer.appendChild(nodeLine);
    }
    
    container.appendChild(nodeContainer);
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
  
  // Create a simplified initialization function for easy integration
  DynamicJSONEditor.init = function(elementId, jsonData, options) {
    options = options || {};
    
    var element = document.getElementById(elementId);
    if (!element) {
      console.error("Element with ID '" + elementId + "' not found");
      return null;
    }
    
    // Default button configuration
    var buttonConfig = options.buttons || {};
    buttonConfig = {
      showFormat: buttonConfig.showFormat !== undefined ? buttonConfig.showFormat : true,
      showClear: buttonConfig.showClear !== undefined ? buttonConfig.showClear : true,
      showSample: buttonConfig.showSample !== undefined ? buttonConfig.showSample : true,
      showExpand: buttonConfig.showExpand !== undefined ? buttonConfig.showExpand : true,
      showCollapse: buttonConfig.showCollapse !== undefined ? buttonConfig.showCollapse : true
    };
    
    // Create container elements
    var wrapperDiv = document.createElement("div");
    wrapperDiv.className = "json-editor-wrapper";
    
    // Add button toolbar if any buttons are enabled
    if (buttonConfig.showFormat || buttonConfig.showClear || buttonConfig.showSample || 
        buttonConfig.showExpand || buttonConfig.showCollapse) {
      
      var toolbarDiv = document.createElement("div");
      toolbarDiv.className = "json-editor-toolbar d-flex flex-row mb-2";
      
      if (buttonConfig.showFormat) {
        var formatBtn = document.createElement("button");
        formatBtn.className = "btn btn-outline-primary me-2";
        formatBtn.innerHTML = '<i class="bi bi-code-square"></i> Format JSON';
        formatBtn.id = elementId + "-format";
        toolbarDiv.appendChild(formatBtn);
      }
      
      if (buttonConfig.showClear) {
        var clearBtn = document.createElement("button");
        clearBtn.className = "btn btn-outline-danger me-2";
        clearBtn.innerHTML = '<i class="bi bi-trash"></i> Clear';
        clearBtn.id = elementId + "-clear";
        toolbarDiv.appendChild(clearBtn);
      }
      
      if (buttonConfig.showSample) {
        var sampleBtn = document.createElement("button");
        sampleBtn.className = "btn btn-outline-secondary me-2";
        sampleBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Load Sample';
        sampleBtn.id = elementId + "-sample";
        toolbarDiv.appendChild(sampleBtn);
      }
      
      if (buttonConfig.showExpand) {
        var expandBtn = document.createElement("button");
        expandBtn.className = "btn btn-outline-info me-2";
        expandBtn.innerHTML = '<i class="bi bi-arrows-expand"></i> Expand All';
        expandBtn.id = elementId + "-expand";
        toolbarDiv.appendChild(expandBtn);
      }
      
      if (buttonConfig.showCollapse) {
        var collapseBtn = document.createElement("button");
        collapseBtn.className = "btn btn-outline-info";
        collapseBtn.innerHTML = '<i class="bi bi-arrows-collapse"></i> Collapse All';
        collapseBtn.id = elementId + "-collapse";
        toolbarDiv.appendChild(collapseBtn);
      }
      
      wrapperDiv.appendChild(toolbarDiv);
    }
    
    var jsonInput = document.createElement("textarea");
    jsonInput.className = "json-editor-input";
    jsonInput.style.display = "none";
    jsonInput.value = JSON.stringify(jsonData, null, 2);
    
    var editorDiv = document.createElement("div");
    editorDiv.className = "json-editor-visual";
    
    var feedbackDiv = document.createElement("div");
    feedbackDiv.className = "json-editor-feedback";
    
    wrapperDiv.appendChild(jsonInput);
    wrapperDiv.appendChild(feedbackDiv);
    wrapperDiv.appendChild(editorDiv);
    
    element.appendChild(wrapperDiv);
    
    // Create editor instance
    var editorOptions = {
      inputElement: jsonInput,
      editorElement: editorDiv,
      feedbackElement: feedbackDiv,
      onUpdate: options.onUpdate || function() {},
      templates: options.templates
    };
    
    var editor = new DynamicJSONEditor(editorOptions);
    
    // Add button event handlers if buttons are shown
    if (buttonConfig.showFormat) {
      document.getElementById(elementId + "-format").addEventListener('click', function() {
        try {
          var value = editor.getValue();
          var parsed = JSON.parse(value);
          editor.setValue(JSON.stringify(parsed, null, 2));
          feedbackDiv.textContent = "JSON formatted successfully!";
          feedbackDiv.className = "alert alert-success";
          editor.parseInput();
        } catch (e) {
          feedbackDiv.textContent = "Invalid JSON: " + e.message;
          feedbackDiv.className = "alert alert-danger";
        }
      });
    }
    
    if (buttonConfig.showClear) {
      document.getElementById(elementId + "-clear").addEventListener('click', function() {
        if (confirm("Are you sure you want to clear the editor?")) {
          editor.setValue('[]');
          editor.parseInput();
        }
      });
    }
    
    if (buttonConfig.showSample && options.sampleData) {
      document.getElementById(elementId + "-sample").addEventListener('click', function() {
        editor.setValue(JSON.stringify(options.sampleData, null, 2));
        editor.parseInput();
      });
    }
    
    if (buttonConfig.showExpand) {
      document.getElementById(elementId + "-expand").addEventListener('click', function() {
        var collapsibles = document.querySelectorAll('#' + elementId + ' .tree-node.collapsed');
        collapsibles.forEach(function(element) {
          element.classList.remove('collapsed');
          var toggleIcon = element.querySelector('.toggle-icon');
          if (toggleIcon) toggleIcon.textContent = "▼";
        });
      });
    }
    
    if (buttonConfig.showCollapse) {
      document.getElementById(elementId + "-collapse").addEventListener('click', function() {
        var collapsibles = document.querySelectorAll('#' + elementId + ' .tree-node:not(.collapsed)');
        collapsibles.forEach(function(element) {
          if (element.querySelector('.tree-content')) {
            element.classList.add('collapsed');
            var toggleIcon = element.querySelector('.toggle-icon');
            if (toggleIcon) toggleIcon.textContent = "►";
          }
        });
      });
    }
    
    return editor;
  };

  // Helper function to load templates from JSON files or URLs
  DynamicJSONEditor.loadTemplates = function(templatesUrl, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', templatesUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var templates = JSON.parse(xhr.responseText);
            callback(null, templates);
          } catch (e) {
            callback(e, null);
          }
        } else {
          callback(new Error("Failed to load templates: " + xhr.status), null);
        }
      }
    };
    xhr.send();
  };

  // Simplified initialization function with CodeMirror support
  DynamicJSONEditor.initWithCodeMirror = function(editorElementId, codeMirrorInstance, jsonData, options) {
    options = options || {};
    
    var editorElement = document.getElementById(editorElementId);
    if (!editorElement) {
      console.error("Element with ID '" + editorElementId + "' not found");
      return null;
    }
    
    // Create feedback element if not provided
    var feedbackElement = options.feedbackElement || document.createElement('div');
    if (!options.feedbackElement) {
      feedbackElement.className = "alert mt-2";
      editorElement.parentNode.insertBefore(feedbackElement, editorElement.nextSibling);
    }
    
    // Create CodeMirror adapter
    var codeMirrorAdapter = {
      value: codeMirrorInstance.getValue(),
      addEventListener: function(event, callback) {
        if (event === 'input') {
          codeMirrorInstance.on('change', function() {
            // Clear previous error markers
            codeMirrorInstance.getAllMarks().forEach(function(mark) {
              mark.clear();
            });
            
            // Clear line classes
            for (var i = 0; i < codeMirrorInstance.lineCount(); i++) {
              codeMirrorInstance.removeLineClass(i, 'background', 'error-line');
            }
            
            callback();
          });
        }
      }
    };
    
    // Function to parse JSON and highlight errors
    function parseJsonFromCodeMirror() {
      var jsonText = codeMirrorInstance.getValue();
      
      try {
        var parsed = JSON.parse(jsonText);
        feedbackElement.textContent = "Valid JSON!";
        feedbackElement.className = "alert alert-success";
        return parsed;
      } catch (e) {
        // Extract line and column information
        var match = e.message.match(/position (\d+).*line (\d+) column (\d+)/);
        if (match) {
          var position = parseInt(match[1], 10);
          var line = parseInt(match[2], 10) - 1; // CodeMirror is 0-indexed
          var column = parseInt(match[3], 10) - 1;
          
          // Highlight the error line and position
          codeMirrorInstance.addLineClass(line, 'background', 'error-line');
          
          // Create a marker at the error position
          var marker = document.createElement('span');
          marker.className = 'error-location';
          codeMirrorInstance.markText(
            { line: line, ch: Math.max(0, column - 1) },
            { line: line, ch: column + 1 },
            { className: 'error-location' }
          );
          
          // Scroll to the error position
          codeMirrorInstance.scrollIntoView({ line: line, ch: column }, 100);
          
          feedbackElement.textContent = "Invalid JSON: " + e.message;
          feedbackElement.className = "alert alert-danger";
        } else {
          feedbackElement.textContent = "Invalid JSON: " + e.message;
          feedbackElement.className = "alert alert-danger";
        }
        return null;
      }
    }
    
    // Create editor instance
    var editorOptions = {
      inputElement: codeMirrorAdapter,
      editorElement: editorElement,
      feedbackElement: feedbackElement,
      templates: options.templates,
      onUpdate: options.onUpdate || function() {},
      getValue: function() {
        return codeMirrorInstance.getValue();
      },
      setValue: function(value) {
        codeMirrorInstance.setValue(value);
      }
    };
    
    var editorInstance = new DynamicJSONEditor(editorOptions);
    
    // Override parseInput method to work with CodeMirror
    editorInstance.parseInput = function() {
      var parsed = parseJsonFromCodeMirror();
      if (parsed !== null) {
        this.data = parsed;
        this.render();
        this.onUpdate(this.data);
      }
    };
    
    // Override update method
    editorInstance.update = function() {
      codeMirrorInstance.setValue(JSON.stringify(this.data, null, 2));
      this.render();
      this.onUpdate(this.data);
    };
    
    // Add toolbar with buttons if configured
    if (options.buttons) {
      var buttonConfig = options.buttons;
      var cardHeader = editorElement.closest('.card').querySelector('.card-header');
      
      if (cardHeader) {
        var toolbar = document.createElement("div");
        toolbar.className = "d-flex flex-row";
        
        // Format button
        if (buttonConfig.showFormat) {
          var formatBtn = document.createElement("button");
          formatBtn.className = "btn btn-action btn-outline-primary me-2";
          formatBtn.innerHTML = '<i class="bi bi-code-square"></i> Format JSON';
          formatBtn.addEventListener('click', function() {
            try {
              var parsed = JSON.parse(codeMirrorInstance.getValue());
              codeMirrorInstance.setValue(JSON.stringify(parsed, null, 2));
              feedbackElement.textContent = "JSON formatted successfully!";
              feedbackElement.className = "alert alert-success";
              editorInstance.parseInput();
            } catch (e) {
              parseJsonFromCodeMirror(); // Show error position
            }
          });
          toolbar.appendChild(formatBtn);
        }
        
        // Clear button
        if (buttonConfig.showClear) {
          var clearBtn = document.createElement("button");
          clearBtn.className = "btn btn-action btn-outline-danger me-2";
          clearBtn.innerHTML = '<i class="bi bi-trash"></i> Clear';
          clearBtn.addEventListener('click', function() {
            if (confirm("Are you sure you want to clear the editor?")) {
              codeMirrorInstance.setValue('[]');
              editorInstance.parseInput();
            }
          });
          toolbar.appendChild(clearBtn);
        }
        
        // Sample button
        if (buttonConfig.showSample && options.sampleData) {
          var sampleBtn = document.createElement("button");
          sampleBtn.className = "btn btn-action btn-outline-secondary me-2";
          sampleBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Load Sample';
          sampleBtn.addEventListener('click', function() {
            codeMirrorInstance.setValue(JSON.stringify(options.sampleData, null, 2));
            editorInstance.parseInput();
          });
          toolbar.appendChild(sampleBtn);
        }
        
        // Expand all button
        if (buttonConfig.showExpand) {
          var expandAllBtn = document.createElement("button");
          expandAllBtn.className = "btn btn-action btn-outline-info me-2";
          expandAllBtn.innerHTML = '<i class="bi bi-arrows-expand"></i> Expand All';
          expandAllBtn.addEventListener('click', function() {
            var collapsibles = document.querySelectorAll('.tree-node.collapsed');
            collapsibles.forEach(function(element) {
              element.classList.remove('collapsed');
              var toggleIcon = element.querySelector('.toggle-icon');
              if (toggleIcon) toggleIcon.textContent = "▼";
            });
          });
          toolbar.appendChild(expandAllBtn);
        }
        
        // Collapse all button
        if (buttonConfig.showCollapse) {
          var collapseAllBtn = document.createElement("button");
          collapseAllBtn.className = "btn btn-action btn-outline-info";
          collapseAllBtn.innerHTML = '<i class="bi bi-arrows-collapse"></i> Collapse All';
          collapseAllBtn.addEventListener('click', function() {
            var collapsibles = document.querySelectorAll('.tree-node:not(.collapsed)');
            collapsibles.forEach(function(element) {
              if (element.querySelector('.tree-content')) {
                element.classList.add('collapsed');
                var toggleIcon = element.querySelector('.toggle-icon');
                if (toggleIcon) toggleIcon.textContent = "►";
              }
            });
          });
          toolbar.appendChild(collapseAllBtn);
        }
        
        cardHeader.appendChild(toolbar);
      }
    }
    
    // Initial parse
    editorInstance.parseInput();
    
    return editorInstance;
  };

  // Expose the editor to the global scope.
  window.DynamicJSONEditor = DynamicJSONEditor;
})(window);
