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
          var arr = self.getDataByPath(path);
          arr.push("");
          self.update();
        } else {
          var promptKey = prompt("Enter new property name:");
          if (promptKey) {
            var obj = self.getDataByPath(path);
            if (obj.hasOwnProperty(promptKey)) {
              alert("Key already exists");
              return;
            }
            obj[promptKey] = "";
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
    
    // Delete icon
    var deleteIcon = document.createElement("span");
    deleteIcon.className = "toggle-icon";
    deleteIcon.innerHTML = "×";
    deleteIcon.title = "Delete";
    deleteIcon.style.visibility = "hidden";
    deleteIcon.style.color = "#f00";
    deleteIcon.style.fontWeight = "bold";
    
    nodeLine.addEventListener("mouseenter", function() {
      deleteIcon.style.visibility = "visible";
    });
    
    nodeLine.addEventListener("mouseleave", function() {
      deleteIcon.style.visibility = "hidden";
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
    
    // Key or index
    if (key !== null) {
      var keySpan = document.createElement("span");
      keySpan.className = "key";
      keySpan.textContent = Array.isArray(self.getParentByPath(path)) ? "" : "\"" + key + "\"";
      nodeLine.appendChild(keySpan);
      
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
          data.push("");
          self.update();
        } else {
          var promptKey = prompt("Enter new property name:");
          if (promptKey) {
            if (data.hasOwnProperty(promptKey)) {
              alert("Key already exists");
              return;
            }
            data[promptKey] = "";
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

  // Expose the editor to the global scope.
  window.DynamicJSONEditor = DynamicJSONEditor;
})(window);
