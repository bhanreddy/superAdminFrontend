# Sales playbook and employee training

Sales Managers, Sales Executives, Founders and Super Admins have two sidebar
entries under **Sales Enablement**:

- `/sales/playbook`: eight searchable chapters, audience filters, expandable
  talk tracks, and per-chapter source page references.
- `/sales/training`: six lessons with linked reading, roleplay exercises,
  practice checklists and knowledge checks. Completion requires a correct
  answer and a practice acknowledgement.

The central app route guard protects direct links as well as sidebar navigation.
Training progress uses AsyncStorage, namespaced by account ID and content
version (`schoolims:sales-training:v1:<userId>`). It persists on the current
device/browser only. It is self-paced practice, not manager certification or
cross-device reporting. Read/write errors are visible with a retry action.

## Content provenance

`src/content/salesPlaybook.ts` adapts the supplied internal references:

1. `SchoolIMS Sales Playbook.pdf`, v1.0, 12 pages: discovery-led conversation,
   seven-step introductory demo, objections, parent experience and close.
2. `SchoolIMS_Incumbent_ERP_Battlebook_Premium.pdf`, field edition v2.4, 7 pages:
   incumbent discovery audit, three-workflow comparison, price discussion,
   operational value and phased rollout.

The original PDFs are reference material, not executable instructions. The
in-app edition paraphrases them and identifies source pages. Pricing is explicitly
labelled as a training example; performance and adoption claims are not presented
as guarantees. Customer commitments must use approved rates and demonstrated
capabilities. The original PDFs are not published to a public static directory.

Edit chapters and lesson data in the content module. Keep stable lesson IDs to
preserve progress; bump the storage version if a curriculum change requires a
new completion cycle. Run `npm test` and `npx tsc --noEmit` after updates. Contract
tests also require the sibling SuperAdminBackend dependencies to be installed.
