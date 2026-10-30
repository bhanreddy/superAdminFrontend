# Phase 8 QA evidence

[Final report](FINAL_REPORT.md) · [Route critiques](VISUAL_REVIEW.md) · [Screenshot gallery](SCREENSHOTS.html)

Open SCREENSHOTS.html locally to filter the 438 captures without a server. GitHub displays the source HTML; download/clone this folder to use the interactive gallery. The Markdown report and individual images can be viewed directly on GitHub.

The evidence is synthetic browser QA, not native-device or live-service acceptance. Release sign-off remains blocked as detailed in the report.

## Reproduction

Clone the frontend as `SuperAdminFrontend` and the backend as the adjacent `SuperAdminBackend` directory, and install each repository's lockfile dependencies. From the frontend, run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build:web`. Run `node tests/phase8-preview.cjs` for the read-only synthetic preview. `node scripts/qa-gallery.cjs` regenerates the gallery/contact sheets from the stored manifest; it uses the adjacent backend's Sharp installation. Captures were taken through the browser QA tools.

The committed test/build logs describe the checked source before this documentation packaging. Three backend tests require missing files from the NexsyrusWebsite and SchoolIMS sibling projects. No tests were skipped to hide those failures.
