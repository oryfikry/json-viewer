# Advanced JSON Viewer

A powerful and interactive JSON viewer and editor with syntax highlighting and tree-like visualization.

## Features

- **Two-Tab Interface**: Switch between Tree View and Text editor modes
- **Tree View Mode**: 
  - Collapsible/expandable tree structure with recursive toggling
  - Add and edit JSON nodes
  - Support for all JSON data types
- **Text Mode**:
  - JSON validation
  - Format/prettify JSON
  - Syntax highlighting
- **Real-time Sync**: Changes in one tab automatically reflect in the other

## Getting Started

1. Clone this repository
2. Open `index.html` in your browser
3. Paste your JSON into the Text tab or start creating a new JSON structure from scratch in the Viewer tab

## How to Use

### Text Tab

1. Paste your JSON text into the textarea
2. Click "Format JSON" to prettify your JSON
3. Click "Validate" to check if your JSON is valid
4. Switch to the "Viewer" tab to see the tree representation

### Viewer Tab

1. Use the tree view to navigate through your JSON
2. Click on the arrow next to keys to collapse/expand objects and arrays (collapsing a node will also collapse all its children)
3. Hover over a key-value pair to see edit controls
4. Use the "Add" button to add new elements:
   - For objects/arrays: Adds a child element
   - For primitive values: Adds a sibling at the same level
5. Use the "Edit" button to modify keys and values
6. Use the main "Add" button at the top to add elements to the root or create a new JSON structure if none exists

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Bootstrap 5

## License

MIT

## Inspiration

This project was inspired by [jsonviewer.stack.hu](https://jsonviewer.stack.hu/) but with enhanced features and a more modern interface. 