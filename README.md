# VSCode DataGrip

A lightweight, powerful database explorer for Visual Studio Code. 

> **VSCode DataGrip** is a custom fork of the open-source [SQLTools](https://github.com/mtxr/vscode-sqltools) extension. It is enhanced with inline spreadsheet-like cell editing, direct database write-backs, and update-script generation.
> 
> **Configuration & Settings Compatibility**: All configurations and settings are fully compatible and run under the standard `sqltools` settings prefix. If you have already configured connection profiles or settings for SQLTools, they will work with this extension seamlessly out of the box using your same configurations.
> 
> ⚠️ **IMPORTANT: Avoid Duplicates**
> Do not keep both **SQLTools** and **VSCode DataGrip** active at the same time. Since both extensions share the same UI views, having both enabled will cause duplicate sidebar icons, connection list views, and action buttons in your extension menu. Please disable or uninstall the official SQLTools extension to avoid duplicate interface elements.

---

## Key Features

- **Database Connection Explorer**: Connect easily to MySQL, MariaDB, PostgreSQL, SQLite, and Microsoft SQL Server.
- **Spreadsheet Editing**: Double-click on any cell in your query results table to modify values directly, write changes back to the database, or discard edits.
- **Copy SQL Script**: Hover and click the clipboard icon in the bottom footer to instantly copy the generated SQL `UPDATE` script for your changes.
- **Automatic Grid Refresh**: The query results table automatically reloads upon saving modifications to reflect the database state.
- **Run Queries**: Write and execute SQL queries directly from your active editor panels.
- **IntelliSense**: Auto-complete table names, column names, and syntax structures.

---

## Drivers Supported

To connect to your database, make sure to install your corresponding driver:

- **MySQL/MariaDB**: `bshashikiran.vscode-datagrip-driver-mysql`
- **PostgreSQL**: `bshashikiran.vscode-datagrip-driver-pg`
- **SQLite**: `bshashikiran.vscode-datagrip-driver-sqlite`
- **MS SQL Server**: `bshashikiran.vscode-datagrip-driver-mssql`

---

## License

This project is licensed under the MIT License.
