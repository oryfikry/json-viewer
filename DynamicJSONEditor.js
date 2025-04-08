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
    var jsonText = this.getValue();
    
    try {
      var parsed = JSON.parse(jsonText);
      this.data = parsed;
      this.feedbackElement.textContent = "Valid JSON!";
      this.feedbackElement.className = "alert alert-success";
      this.render();
      this.onUpdate(this.data);
    } catch (e) {
      // Check for specific errors first
      var trailingCommaInfo = detectTrailingCommaInText(jsonText);
      if (trailingCommaInfo) {
        // We found a trailing comma error
        var line = trailingCommaInfo.line;
        var column = trailingCommaInfo.column;
        
        // Get the line content where the error occurred
        var jsonLines = jsonText.split('\n');
        if (line < jsonLines.length) {
          var lineContent = jsonLines[line];
          
          // Add context information around the error
          var startLine = Math.max(0, line - 2);
          var endLine = Math.min(jsonLines.length - 1, line + 2);
          var contextLines = [];
          
          for (var i = startLine; i <= endLine; i++) {
            var prefix = (i === line) ? ' → ' : '   ';
            var lineNum = (i + 1).toString().padStart(4, ' ');
            
            if (i === line) {
              // Highlight the exact position of the trailing comma
              var content = lineContent;
              var marker = ' '.repeat(column) + '^';
              contextLines.push(prefix + lineNum + ': ' + content);
              contextLines.push('     ' + marker + ' Trailing comma');
            } else {
              contextLines.push(prefix + lineNum + ': ' + jsonLines[i]);
            }
          }
          
          var errorContext = contextLines.join('\n');
          
          // Construct a detailed error message
          var errorMessage = "Invalid JSON: Trailing comma detected\n";
          errorMessage += "At line " + (line + 1) + ", column " + (column + 1) + "\n\n";
          errorMessage += errorContext + "\n\n";
          errorMessage += "JSON does not allow trailing commas. Remove the comma after the last item.";
          
          // Display error in feedback element
          this.feedbackElement.innerHTML = errorMessage.replace(/\n/g, '<br>');
          this.feedbackElement.className = "alert alert-danger";
          return;
        }
      }
      
      // Attempt to extract line and column information
      var line = 0;
      var column = 0;
      var position = -1;
      
      // Extract position from error message
      var posMatch = e.message.match(/position\s+(\d+)/i);
      var lineColMatch = e.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
      
      if (posMatch) {
        position = parseInt(posMatch[1], 10);
      }
      
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      } else if (position !== -1) {
        // If we have a position but no line/column, calculate them
        var lines = jsonText.substring(0, position).split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      } else {
        // Try to find the error position by checking for SyntaxError details
        var tokenMatch = e.message.match(/Unexpected token\s+([^\s]+)/i);
        var endMatch = e.message.match(/Unexpected end of JSON/i);
        
        if (tokenMatch || endMatch) {
          // Search for common JSON syntax errors
          var errorTokens = [
            ',}', ',]', // Trailing commas
            '}{', '][', // Missing commas
            ':""}', ':""]', // Empty strings with missing quotes
            ':,', ':}', ':]' // Missing values
          ];
          
          for (var i = 0; i < errorTokens.length; i++) {
            var pos = jsonText.indexOf(errorTokens[i]);
            if (pos !== -1) {
              position = pos + 1; // Point to the problematic character
              break;
            }
          }
          
          if (position === -1 && tokenMatch) {
            // Search for the unexpected token
            var token = tokenMatch[1].replace(/['"\\]/g, '');
            position = jsonText.indexOf(token);
          }
          
          if (position !== -1) {
            // Calculate line and column
            var lines = jsonText.substring(0, position).split('\n');
            line = lines.length;
            column = lines[lines.length - 1].length + 1;
          }
        }
      }
      
      // Construct a detailed error message
      var errorMessage = "Invalid JSON: " + e.message;
      
      if (line > 0) {
        errorMessage += "\nAt line " + line + ", column " + column;
        
        // Add context if we have a line number
        var jsonLines = jsonText.split('\n');
        var startLine = Math.max(0, line - 3);
        var endLine = Math.min(jsonLines.length - 1, line + 1);
        
        errorMessage += "\n\nContext:";
        for (var i = startLine; i <= endLine; i++) {
          var prefix = (i === line - 1) ? " → " : "   ";
          errorMessage += "\n" + prefix + (i + 1) + ": " + jsonLines[i];
          
          // Add a marker pointing to the error position
          if (i === line - 1) {
            var marker = " ".repeat(prefix.length + (i + 1).toString().length + 2 + column - 1) + "^";
            errorMessage += "\n" + marker;
          }
        }
      }
      
      // Display error in feedback element
      this.feedbackElement.innerHTML = errorMessage.replace(/\n/g, '<br>');
      this.feedbackElement.className = "alert alert-danger";
    }
  };

  // Helper function to detect trailing commas in JSON text
  function detectTrailingCommaInText(jsonText) {
    // Regular expressions to find trailing commas
    var objectTrailingComma = /,\s*\}/g;
    var arrayTrailingComma = /,\s*\]/g;
    
    // Find all matches of trailing commas
    var matches = [];
    var match;
    
    // Check for trailing commas in objects
    while ((match = objectTrailingComma.exec(jsonText)) !== null) {
      matches.push({
        index: match.index,
        type: 'object'
      });
    }
    
    // Check for trailing commas in arrays
    while ((match = arrayTrailingComma.exec(jsonText)) !== null) {
      matches.push({
        index: match.index,
        type: 'array'
      });
    }
    
    if (matches.length > 0) {
      // Find the first position where a trailing comma appears
      var firstMatch = matches.reduce(function(min, current) {
        return current.index < min.index ? current : min;
      }, matches[0]);
      
      // Calculate line and column for the trailing comma
      var textBeforeComma = jsonText.substring(0, firstMatch.index);
      var lines = textBeforeComma.split('\n');
      var line = lines.length - 1;
      var column = lines[line].length;
      
      return {
        line: line,
        column: column,
        type: firstMatch.type
      };
    }
    
    return null;
  }

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
        // First, clear previous error markers
        codeMirrorInstance.getAllMarks().forEach(function(mark) {
          mark.clear();
        });
        
        // Clear line classes
        for (var i = 0; i < codeMirrorInstance.lineCount(); i++) {
          codeMirrorInstance.removeLineClass(i, 'background', 'error-line');
        }
        
        // Check for specific common errors
        var errorInfo = null;
        
        // Check for trailing commas
        errorInfo = detectTrailingComma(jsonText);
        if (errorInfo) {
          highlightAndReportError(errorInfo, 'Trailing comma detected', 
            'JSON does not allow trailing commas. Remove the comma after the last item.');
          return null;
        }
        
        // Check for missing commas
        errorInfo = detectMissingComma(jsonText);
        if (errorInfo) {
          highlightAndReportError(errorInfo, 'Missing comma detected', 
            'JSON requires commas between array elements or object properties. Add a comma after this item.');
          return null;
        }
        
        // Check for unquoted property names
        errorInfo = detectUnquotedPropertyName(jsonText);
        if (errorInfo) {
          if (errorInfo.type === 'unquoted') {
            highlightAndReportError(errorInfo, 'Unquoted property name detected', 
              'In JSON, all property names must be enclosed in double quotes. Change <span class="error-code">' + 
              errorInfo.value + ':</span> to <span class="error-suggestion">"' + errorInfo.value + '":</span>');
          } else if (errorInfo.type === 'invalid-property') {
            highlightAndReportError(errorInfo, 'Invalid property name format', 
              'Found <span class="error-code">' + errorInfo.value + '</span> which is not properly quoted. ' + 
              'In JSON, all property names must be enclosed in double quotes like <span class="error-suggestion">"' + 
              errorInfo.value + '"</span>');
          }
          return null;
        }
        
        // Check for single quotes (instead of required double quotes)
        errorInfo = detectSingleQuotes(jsonText);
        if (errorInfo) {
          highlightAndReportError(errorInfo, 'Single quotes detected', 
            'JSON requires double quotes (") for strings and property names, not single quotes (\').');
          return null;
        }
        
        // Extract position, line, and column information
        var line = 0;
        var column = 0;
        var position = -1;
        var errorMessage = e.message;
        
        // Pattern matching for common error message formats
        var posMatch = e.message.match(/position\s+(\d+)/i);
        var lineColMatch = e.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
        
        if (posMatch) {
          position = parseInt(posMatch[1], 10);
        }
        
        if (lineColMatch) {
          line = parseInt(lineColMatch[1], 10) - 1; // Convert to 0-indexed
          column = parseInt(lineColMatch[2], 10) - 1;
        } else if (position !== -1) {
          // If we have a position but no line/column, calculate them
          var lines = jsonText.substring(0, position).split('\n');
          line = lines.length - 1;
          column = lines[line].length;
        } else {
          // Try to find the error position by checking for SyntaxError details
          var tokenMatch = e.message.match(/Unexpected token\s+([^\s]+)/i);
          var endMatch = e.message.match(/Unexpected end of JSON/i);
          
          if (tokenMatch || endMatch) {
            // Search for common JSON syntax errors
            var errorTokens = [
              ',}', ',]', // Trailing commas
              '}{', '][', // Missing commas
              ':""}', ':""]', // Empty strings with missing quotes
              ':,', ':}', ':]' // Missing values
            ];
            
            for (var i = 0; i < errorTokens.length; i++) {
              var pos = jsonText.indexOf(errorTokens[i]);
              if (pos !== -1) {
                position = pos + 1; // Point to the problematic character
                break;
              }
            }
            
            if (position === -1 && tokenMatch) {
              // Search for the unexpected token
              var token = tokenMatch[1].replace(/['"\\]/g, '');
              position = jsonText.indexOf(token);
            }
            
            if (position !== -1) {
              // Calculate line and column
              var lines = jsonText.substring(0, position).split('\n');
              line = lines.length - 1;
              column = lines[line].length;
            }
          }
        }
        
        // If we have a line number, highlight it
        if (line >= 0 && line < codeMirrorInstance.lineCount()) {
          // Create an error info object
          var errorInfo = {
            line: line,
            column: column,
            message: e.message
          };
          
          // Use the helper function to highlight and report the error
          highlightAndReportError(errorInfo, e.message);
        } else {
          // Fallback for when we can't determine the line/column
          feedbackElement.textContent = "Invalid JSON: " + e.message;
          feedbackElement.className = "alert alert-danger";
        }
        
        return null;
      }
    }
    
    // Helper function to highlight and report errors
    function highlightAndReportError(errorInfo, errorTitle, errorSuggestion) {
      var line = errorInfo.line;
      var column = errorInfo.column;
      
      // Highlight the error line
      codeMirrorInstance.addLineClass(line, 'background', 'error-line');
      
      // Mark the error position with wider range to ensure visibility
      var markStart = { line: line, ch: Math.max(0, column) };
      var lineLength = codeMirrorInstance.getLine(line).length;
      
      // For property errors, try to mark the entire property name
      var markEnd = { line: line, ch: column + 1 };
      if (errorInfo.type === 'unquoted' || errorInfo.type === 'invalid-property') {
        // Mark the entire property name
        var propLength = errorInfo.value ? errorInfo.value.length : 1;
        markEnd = { line: line, ch: column + propLength };
      } else if (errorInfo.type === 'bracket' || errorInfo.type === 'property-property') {
        // For missing comma after bracket or between properties, mark the position where the comma should be
        markEnd = { line: line, ch: column + 1 };
        
        // If this is a missing comma at a line break, also highlight the next line
        if (errorInfo.lineBreak && line + 1 < codeMirrorInstance.lineCount()) {
          codeMirrorInstance.addLineClass(line + 1, 'background', 'error-line');
        }
      } else if (errorInfo.type === 'array-closing') {
        // For missing comma after array closing bracket
        markStart = { line: line, ch: column };
        markEnd = { line: line, ch: column + 1 };
        
        // If there's a line break, highlight both lines to show where comma should go
        if (errorInfo.lineBreak && line + 1 < codeMirrorInstance.lineCount()) {
          codeMirrorInstance.addLineClass(line + 1, 'background', 'error-line');
        }
      } else {
        // Default to marking a small section
        markEnd = { line: line, ch: Math.min(lineLength, column + 3) };
      }
      
      codeMirrorInstance.markText(markStart, markEnd, { className: 'error-location' });
      
      // Scroll to the error location with more context
      codeMirrorInstance.scrollIntoView({ line: line, ch: column }, 200);
      
      // Extract context for the error with more lines for better context
      var startLine = Math.max(0, line - 3);
      var endLine = Math.min(codeMirrorInstance.lineCount() - 1, line + 3);
      var contextLines = [];
      
      for (var i = startLine; i <= endLine; i++) {
        var prefix = (i === line) ? '► ' : '  ';
        var lineContent = codeMirrorInstance.getLine(i);
        var lineNum = (i + 1).toString().padStart(3, ' '); // Line numbers with padding
        
        // Highlight the exact position of the error with more context
        if (i === line) {
          // Ensure we don't go beyond string bounds
          var highlightStart = Math.max(0, column - 10);
          var highlightEnd = Math.min(lineContent.length, column + 20);
          
          var before = lineContent.substring(0, column);
          var errorPart = '';
          var after = '';
          
          // For special case of missing comma after array/object
          if (errorInfo.type === 'bracket' || errorInfo.type === 'property-property') {
            errorPart = lineContent.substring(column, column + 1) || ' ';
            after = (lineContent.substring(column + 1) || '') +
                    (errorInfo.lineBreak ? '\n' + (errorInfo.nextLineContent || '') : '');
            
            // Show the suggested fix - add a comma
            after = after.substring(0, 0) + '<span class="error-suggestion">,</span>' + after.substring(0);
          } else if (errorInfo.type === 'array-closing') {
            // Special handling for missing comma after array closing bracket
            errorPart = lineContent.substring(column, column + 1) || ' ';
            
            // If we have the bracket on this line and property on next line
            if (errorInfo.lineBreak) {
              after = (lineContent.substring(column + 1) || '') + '\n' + (errorInfo.nextLineContent || '');
              // Insert comma suggestion right after the bracket
              after = '<span class="error-suggestion">,</span>' + after;
            } else {
              after = lineContent.substring(column + 1) || '';
              // Insert comma suggestion right after the bracket
              after = '<span class="error-suggestion">,</span>' + after;
            }
          } else if (errorInfo.type === 'unquoted' || errorInfo.type === 'invalid-property') {
            // For property name errors, highlight the whole property
            var propLength = errorInfo.value ? errorInfo.value.length : 1;
            errorPart = lineContent.substring(column, column + propLength);
            after = lineContent.substring(column + propLength);
          } else {
            // For other errors just highlight a character
            errorPart = lineContent.substring(column, column + 1) || ' ';
            after = lineContent.substring(column + 1);
          }
          
          // If error is at the end of the line, suggest missing comma
          if (column >= lineContent.length - 1 && errorTitle.includes('Missing comma')) {
            after = after + '<span class="error-suggestion">,</span>';
          }
          
          // For various error types, provide visual cues
          if (errorInfo.type === 'unquoted') {
            errorPart = '<span class="error-marker">' + errorPart + '</span>';
          } else if (errorInfo.type === 'bracket' || errorInfo.type === 'property-property') {
            // For missing comma errors, mark where the comma should be
            errorPart = '<span class="error-marker">' + errorPart + '</span>';
          } else {
            errorPart = '<span class="error-marker">' + errorPart + '</span>';
          }
          
          lineContent = before + errorPart + after;
          
          // Add a marker line pointing to the error position
          var spacesBeforeError = ' '.repeat(prefix.length + lineNum.length + 2 + column);
          var markerSymbol = '↑';
          
          contextLines.push(prefix + lineNum + ': ' + lineContent);
          
          // Additional hint for property errors
          console.log(errorInfo,errorTitle,errorSuggestion);
          if (errorInfo.type === 'unquoted') {
            contextLines.push(' '.repeat(prefix.length) + ' '.repeat(lineNum.length) + '  ' + 
                              spacesBeforeError + markerSymbol + ' Missing quotes around property name');
          } else if (errorInfo.type === 'bracket') {
            contextLines.push(' '.repeat(prefix.length) + ' '.repeat(lineNum.length) + '  ' + 
                              spacesBeforeError + markerSymbol + ' Missing comma after ' + 
                              (errorInfo.before === ']' ? 'closing bracket ]' : 'closing brace }'));
          } else if (errorInfo.type === 'property-property') {
            contextLines.push(' '.repeat(prefix.length) + ' '.repeat(lineNum.length) + '  ' + 
                              spacesBeforeError + markerSymbol + ' Missing comma between properties');
          } else if (errorInfo.type === 'array-closing') {
            contextLines.push(' '.repeat(prefix.length) + ' '.repeat(lineNum.length) + '  ' + 
                              spacesBeforeError + markerSymbol + ' Missing comma after array');
          } else {
            contextLines.push(' '.repeat(prefix.length) + ' '.repeat(lineNum.length) + '  ' + 
                              spacesBeforeError + markerSymbol);
          }
        } else {
          contextLines.push(prefix + lineNum + ': ' + lineContent);
        }
      }
      
      var errorContext = contextLines.join('\n');
      
      // Construct a more detailed error message with clearer context
      var detailedError = 'Invalid JSON: ' + errorTitle + '\n';
      detailedError += 'At line ' + (line + 1) + ', column ' + (column + 1) + ':\n';
      detailedError += '\n' + errorContext + '\n\n';
      
      // Add suggestion if provided with more specificity
      if (errorSuggestion) {
        detailedError += 'Suggestion: ' + errorSuggestion;
        
        // Add specific suggestion based on error type
        if (errorInfo.type === 'bracket') {
          detailedError += '\nYou need to add a comma after the ' + 
                          (errorInfo.before === ']' ? 'closing bracket ]' : 'closing brace }') + 
                          ' and before the next property.';
        } else if (errorInfo.type === 'property-property') {
          detailedError += '\nYou need to add a comma between the properties.';
        } else if (errorInfo.type === 'array-closing') {
          detailedError += '\nYou need to add a comma after the empty array (]) and before the "' + 
                          errorInfo.after.replace(/^"([^"]+)".*$/, '$1') + '" property.';
        } else if (errorTitle.includes('Missing comma')) {
          detailedError += '\nYou need to add a comma between this property and the next one.';
        } else if (errorTitle.includes('Trailing comma')) {
          detailedError += '\nRemove the last comma in this list.';
        } else if (errorInfo.type === 'unquoted' || errorInfo.type === 'invalid-property') {
          detailedError += '\nJSON property names must always be enclosed in double quotes.';
        }
      }
      
      // Display error in feedback element with line breaks preserved and styling
      feedbackElement.innerHTML = detailedError.replace(/\n/g, '<br>');
      feedbackElement.className = "alert alert-danger";
    }
    
    // Helper function to detect trailing commas in JSON objects and arrays
    function detectTrailingComma(jsonText) {
      // Regular expressions to find trailing commas
      var objectTrailingComma = /,\s*\}/g;
      var arrayTrailingComma = /,\s*\]/g;
      
      // Find all matches of trailing commas
      var matches = [];
      var match;
      
      // Check for trailing commas in objects
      while ((match = objectTrailingComma.exec(jsonText)) !== null) {
        matches.push({
          index: match.index,
          type: 'object'
        });
      }
      
      // Check for trailing commas in arrays
      while ((match = arrayTrailingComma.exec(jsonText)) !== null) {
        matches.push({
          index: match.index,
          type: 'array'
        });
      }
      
      if (matches.length > 0) {
        // Find the first position where a trailing comma appears
        var firstMatch = matches.reduce(function(min, current) {
          return current.index < min.index ? current : min;
        }, matches[0]);
        
        // Calculate line and column for the trailing comma
        var textBeforeComma = jsonText.substring(0, firstMatch.index);
        var lines = textBeforeComma.split('\n');
        var line = lines.length - 1;
        var column = lines[line].length;
        
        return {
          line: line,
          column: column,
          type: firstMatch.type
        };
      }
      
      return null;
    }
    
    // Helper function to detect missing commas in JSON
    function detectMissingComma(jsonText) {
      // Look for patterns that indicate missing commas
      var objectMissingComma = /("[^"]*":|[0-9]+)\s*("[^"]*":)/g;
      var arrayMissingComma = /("[^"]*"|true|false|null|[0-9]+)\s*("[^"]*"|true|false|null|[0-9]+)/g;
      
      // Add pattern for missing comma after array/object closing brackets followed by another property
      var bracketMissingComma = /(\]|\})\s*(?:\r?\n|\r|\s)*("[^"]*":)/g;
      
      // Special pattern for missing comma after array closing bracket - matches the exact example case
      var arrayClosingMissingComma = /"items"\s*:\s*\[\s*\]\s*(?:\r?\n|\r|\s)+("(?:sortOrder|[^"]+)"\s*:)/g;
      
      // Find potential missing commas
      var matches = [];
      var match;
      
      // Check for missing commas in objects
      while ((match = objectMissingComma.exec(jsonText)) !== null) {
        matches.push({
          index: match.index + match[1].length,
          type: 'object',
          before: match[1],
          after: match[2]
        });
      }
      
      // Check for missing commas in arrays
      while ((match = arrayMissingComma.exec(jsonText)) !== null) {
        matches.push({
          index: match.index + match[1].length,
          type: 'array',
          before: match[1],
          after: match[2]
        });
      }
      
      // Check for missing commas after array/object closing brackets
      while ((match = bracketMissingComma.exec(jsonText)) !== null) {
        matches.push({
          index: match.index + match[1].length,
          type: 'bracket',
          before: match[1],
          after: match[2],
          lineBreak: true
        });
      }
      
      // Special check for missing comma after array closing bracket - prioritize this pattern
      while ((match = arrayClosingMissingComma.exec(jsonText)) !== null) {
        // Find the closing bracket position
        var closingBracketPos = match.index + match[0].indexOf(']') + 1;
        
        // Create a high-priority match for this specific case
        matches.push({
          index: closingBracketPos,
          type: 'array-closing',
          before: ']',
          after: match[1],
          lineBreak: true,
          priority: 10  // Higher priority to handle this case first
        });
      }
      
      // Special check for property followed by property without comma
      var propertyFollowedByPropertyPattern = /"[^"]*"\s*:\s*(\[[^\]]*\]|\{[^}]*\}|"[^"]*"|true|false|null|\d+)\s*(?:\r?\n|\r|\s)(?:"[^"]*")/g;
      while ((match = propertyFollowedByPropertyPattern.exec(jsonText)) !== null) {
        // Verify this isn't a valid object with comma by checking context
        var followingText = jsonText.substring(match.index + match[0].length - 1);
        var nextNonWhitespace = followingText.match(/\S/);
        
        // If the next non-whitespace character isn't a comma or closing brace/bracket, we have a missing comma
        if (nextNonWhitespace && nextNonWhitespace[0] !== ',' && nextNonWhitespace[0] !== '}' && nextNonWhitespace[0] !== ']') {
          matches.push({
            index: match.index + match[0].length - 1, // Position right after the value
            type: 'property-property',
            before: match[1],
            after: '"' + followingText.split('"')[1] + '"', // Get the next property name
            contextStart: Math.max(0, match.index - 10),
            contextEnd: Math.min(jsonText.length, match.index + match[0].length + 20)
          });
        }
      }
      
      if (matches.length > 0) {
        // Find the first occurrence, prioritizing high-priority matches
        var firstMatch = matches.reduce(function(min, current) {
          // If current has a priority, use it for comparison
          if (current.priority && (!min.priority || current.priority > min.priority)) {
            return current;
          }
          // Otherwise, default to index comparison
          return current.index < min.index ? current : min;
        }, matches[0]);
        
        // Calculate line and column for the missing comma
        var textBeforeError = jsonText.substring(0, firstMatch.index);
        var lines = textBeforeError.split('\n');
        var line = lines.length - 1;
        var column = lines[line].length;
        
        // Get more context around the error
        var lineStart = textBeforeError.lastIndexOf('\n') + 1;
        if (lineStart === 0) lineStart = 0;
        
        var lineEnd = jsonText.indexOf('\n', firstMatch.index);
        if (lineEnd === -1) lineEnd = jsonText.length;
        
        var errorLineContent = jsonText.substring(lineStart, lineEnd);
        
        // Get next line for context when error is at line break
        var nextLineContent = "";
        if (firstMatch.lineBreak && lineEnd < jsonText.length) {
          var nextLineEnd = jsonText.indexOf('\n', lineEnd + 1);
          if (nextLineEnd === -1) nextLineEnd = jsonText.length;
          nextLineContent = jsonText.substring(lineEnd + 1, nextLineEnd);
        }
        
        return {
          line: line,
          column: column,
          type: firstMatch.type,
          before: firstMatch.before,
          after: firstMatch.after,
          lineBreak: firstMatch.lineBreak,
          errorLineContent: errorLineContent,
          nextLineContent: nextLineContent,
          fullContext: jsonText.substring(
            Math.max(0, lineStart - 50), 
            Math.min(jsonText.length, lineEnd + 100)
          )
        };
      }
      
      return null;
    }
    
    // Helper function to detect unquoted property names
    function detectUnquotedPropertyName(jsonText) {
      // Look for patterns like identifier: or identifier :
      var unquotedPropPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g;
      var match;
      
      while ((match = unquotedPropPattern.exec(jsonText)) !== null) {
        // Make sure it's not inside a string
        var beforeMatch = jsonText.substring(0, match.index);
        var quoteCount = (beforeMatch.match(/"/g) || []).length;
        
        // If we have an even number of quotes before this match, it's not inside a string
        if (quoteCount % 2 === 0) {
          // Get more context for the error
          var lineStart = beforeMatch.lastIndexOf('\n') + 1;
          if (lineStart === 0) lineStart = 0;
          var lineEnd = jsonText.indexOf('\n', match.index);
          if (lineEnd === -1) lineEnd = jsonText.length;
          
          var lineContent = jsonText.substring(lineStart, lineEnd);
          var columnInLine = match.index - lineStart;
          
          // Calculate line and column
          var lines = beforeMatch.split('\n');
          var line = lines.length - 1;
          var column = match.index - beforeMatch.lastIndexOf('\n') - 1;
          
          return {
            line: line,
            column: column,
            type: 'unquoted',
            value: match[1],
            lineContent: lineContent,
            columnInLine: columnInLine
          };
        }
      }
      
      // Additional check for property names that are neither quoted nor valid identifiers
      // This helps catch syntax errors like {asdd:"sd"} where asdd should be quoted
      var braceOpenPositions = [];
      var potentialErrors = [];
      
      // Find all open braces positions
      var bracePatt = /\{/g;
      while ((match = bracePatt.exec(jsonText)) !== null) {
        braceOpenPositions.push(match.index);
      }
      
      // For each open brace, check for invalid property patterns
      for (var i = 0; i < braceOpenPositions.length; i++) {
        var bracePos = braceOpenPositions[i];
        var nextChar = jsonText.substring(bracePos + 1).trim()[0];
        
        // If next non-whitespace char isn't a quote or closing brace, it might be an invalid property
        if (nextChar && nextChar !== '"' && nextChar !== "'" && nextChar !== '}') {
          // Extract the text after the brace until the next colon
          var textAfterBrace = jsonText.substring(bracePos + 1);
          var colonPos = textAfterBrace.indexOf(':');
          
          if (colonPos > 0) {
            var propertyText = textAfterBrace.substring(0, colonPos).trim();
            
            // If it contains spaces or special chars that would make it invalid for an identifier
            if (propertyText.match(/[^\w$]/) || propertyText === '') {
              // Calculate line and column
              var textBeforeError = jsonText.substring(0, bracePos + 1);
              var lines = textBeforeError.split('\n');
              var line = lines.length - 1;
              var column = bracePos + 1 - (textBeforeError.lastIndexOf('\n') + 1);
              
              potentialErrors.push({
                line: line,
                column: column,
                type: 'invalid-property',
                value: propertyText,
                bracePos: bracePos
              });
            }
          }
        }
      }
      
      // Return the first potential error if we found any
      if (potentialErrors.length > 0) {
        return potentialErrors[0];
      }
      
      return null;
    }
    
    // Helper function to detect single quotes (which are not valid in JSON)
    function detectSingleQuotes(jsonText) {
      // Look for patterns with single quotes
      var singleQuotePattern = /'[^']*'/g;
      var match;
      
      while ((match = singleQuotePattern.exec(jsonText)) !== null) {
        // Calculate line and column
        var beforeMatch = jsonText.substring(0, match.index);
        var lines = beforeMatch.split('\n');
        var line = lines.length - 1;
        var column = lines[line].length;
        
        return {
          line: line,
          column: column,
          type: 'single-quote',
          value: match[0]
        };
      }
      
      return null;
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
