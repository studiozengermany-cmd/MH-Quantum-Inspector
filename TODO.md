# TODO - Nhóm C Content Script & Utils

- [x] Update `content.js`
  - [x] Fix Shadow DOM wrapper handling for own UI detection
  - [x] Strengthen context validation (`isContextValid`)
  - [x] Remove emoji from user-facing text where applicable
- [x] Update `analyzer/dom-crawler.js`
  - [x] Add safe `CSS.escape` fallback helper
  - [x] Implement Shadow DOM traversal in region crawling
  - [x] Make overlay lookup Shadow DOM aware
- [x] Update `core/temporal-observer.js`
  - [x] Ensure all timers are cleared safely
- [x] Update `utils/payload-schema.js`
  - [x] Harden `crypto.randomUUID()` usage
- [x] Update `utils/prompt-generator.js`
  - [x] Recreate mapping logic (dedicated)
