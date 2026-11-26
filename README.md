# Mina Play Lab — public browser edition

Five modules for free GitHub Pages hosting: Mina Market, Mina Avatar Creator, Root Word Quest, Spelling Bee, and Book Library.

Open `index.html` over HTTP/HTTPS. No server installation or account is needed. Books, reading comments and attachments, and vocabulary edits are stored in IndexedDB. Game and spelling progress use browser storage. Each browser has independent data; clearing website data removes it. Use the Backups page to transfer or preserve data. Book Library starts empty; import a catalog JSON/spreadsheet or add books. Personal home-server records, credentials, uploads, and database files are not included.

External fonts, Tailwind CSS, spreadsheet parsing, dictionary lookups, and optional book lookups depend on third-party services and internet access. Device speech depends on browser support. A Google Books key, if used, is entered in settings on that device and is never included in this repository or full backup.

## Publish

GitHub repository Settings → Pages → Deploy from a branch → `main` / root. `.nojekyll` keeps this a plain static site. All paths work under a repository subdirectory.

The self-hosted family app is maintained separately. This repository contains only the selected public browser edition and has no family account system or shared database.
