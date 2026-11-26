# Mina Play Lab — public browser edition

Four modules for free GitHub Pages hosting: Mina Market, Mina Avatar Creator, Root Word Quest, and Spelling Bee.

Open `index.html` over HTTP/HTTPS. No server installation or account is needed. Vocabulary edits are stored in IndexedDB. Game and spelling progress use browser storage. Each browser has independent data; clearing website data removes it. Use the Backups page to transfer or preserve data. Personal home-server records, credentials, uploads, and database files are not included.

External fonts, Tailwind CSS, and dictionary lookups depend on third-party services and internet access. Device speech depends on browser support.

## Publish

GitHub repository Settings → Pages → Deploy from a branch → `main` / root. `.nojekyll` keeps this a plain static site. All paths work under a repository subdirectory.

The self-hosted family app is maintained separately. This repository contains only the selected public browser edition and has no family account system or shared database.
