# SailPoint IdentityIQ - Theme Toggle Plugin

A lightweight plugin for SailPoint IdentityIQ 7.2+ that adds a light/dark theme toggle to the top navigation bar. The dark theme covers classic UI pages, Angular dashboards, Identity Warehouse, Certifications, and ExtJS dialogs.

## Screenshots

**Light mode (default)**

![Light mode](assets/light-mode.png)

**Dark mode**

![Dark mode](assets/dark-mode.png)

## Features

- **Header Toggle**: Switch between dark and light themes directly from the top navigation bar (persisted via `localStorage`).
- **Comprehensive Theme**: Styles classic JSP/XHTML pages, Angular home/dashboards, Identity Warehouse, Certifications, and ExtJS modals.
- **Dynamic Cleanup**: Handles inline white backgrounds and asynchronously rendered ExtJS grids without requiring a page reload.
- **Protected Elements**: Keeps CodeMirror, XML debug editors, status badges, and the Business Process Designer canvas readable.
- **Client-Side Only**: Zero backend dependencies, no database changes, and no external libraries required.

## Theme Coverage

* **In-Scope Surfaces (Dark Theme)**:
  - **Classic UI Pages**: Identity Warehouse, System Setup, Audit, Task Results.
  - **Angular Pages**: Home dashboard widgets, QuickLink cards, top navigation bar.
  - **ExtJS Components**: Grid panels, pagination toolbars, tab panels, and modal dialogs.
* **Protected Surfaces (Intentionally Kept Light)**:
  - **CodeMirror & XML Editors**: Syntax highlighting and debug editor text remain in light mode for optimal contrast and readability.
  - **Business Process Designer**: The workflow canvas (`#workflowDesigner`) keeps its original light canvas so step SVG icons and connectors render accurately.
  - **Status Indicators**: Severity badges, risk chips, and alert boxes retain their semantic colors.

## Compatibility

- SailPoint IdentityIQ 7.2 and later (7.2 – 8.5+)
- Modern browsers (Chrome, Edge, Firefox, Safari)

## Download

* Direct download: [`ThemeTogglePlugin.zip`](./ThemeTogglePlugin.zip) - click the file and select **Download raw file**.

## Installation

1. Download `ThemeTogglePlugin.zip` directly from this repository.
2. Log in to IdentityIQ with `Plugin Administrator` capability.
3. Navigate to **Gear icon > Plugins > New**.
4. Upload `ThemeTogglePlugin.zip` and verify installation.
5. Refresh your browser to see the toggle in the navigation header.

## Post-Installation Smoke Test

After installing the plugin, spot-check these key pages in dark mode:

- [ ] **Top Header**: Click the sun/moon toggle; verify state persists across browser refresh.
- [ ] **Home Dashboard**: Confirm Angular cards and widgets render with dark surfaces.
- [ ] **Identity Warehouse**: Verify ExtJS identity grid, row selections, and tab headers are styled.
- [ ] **Certifications / Work Items**: Open an access review or modal dialog to verify popup styling.
- [ ] **Business Process Designer**: Open a workflow to verify the diagram canvas remains light and step icons are clear.
- [ ] **Debug / XML Editor**: Open an object in the debug console; confirm syntax highlighting remains readable.

## Testing

Run the zero-dependency automated unit test suite with Node.js (v18+):

```bash
node --test test/theme.test.js
```

## Building from source

The distributable is created by zipping the contents of `themetoggleplugin/` with `manifest.xml` at the root:

```bash
cd themetoggleplugin
zip -r ../ThemeTogglePlugin.zip manifest.xml installation ui
```

## Project structure

```
themetoggleplugin/
  manifest.xml
  installation/
    install.setup.xml
    upgrade.setup.xml
  ui/
    css/
      plugin.css
      theme-dark.css
      theme-light.css
    js/
      headerInject.js
    htmlTemplates/
      pluginSettings.html
test/
  theme.test.js
```

## License

Distributed under the MIT License. See [LICENSE.txt](LICENSE.txt) for more information.
