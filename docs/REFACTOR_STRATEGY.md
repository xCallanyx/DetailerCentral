\# REFACTOR\_STRATEGY.md — Detailer Central



This document tells an AI assistant (Claude) exactly how to refactor the current prototype into the modular architecture described in:



\- docs/PROJECT\_GOAL.md

\- docs/DATA\_MODEL.md

\- docs/ARCHITECTURE\_REFACTOR.md

\- docs/DEVELOPMENT\_PHASES.md



Goal: \*\*Refactor architecture only\*\* (Phase 0).  

Do NOT implement new features yet.



Success means: the app behaves exactly the same, but the code is split into clean files.



---



\## Ground Rules



1\) \*\*Do not rewrite the app.\*\*  

2\) \*\*Do not introduce build tools, frameworks, bundlers, or TypeScript.\*\*  

3\) \*\*Keep the app local-first using localStorage.\*\*  

4\) Maintain the existing storage key and shape as much as possible:

&nbsp;  - localStorage key stays: `rebar\_tracker\_data`

5\) Refactor in small steps so the app stays runnable after each step.



---



\## Target Folder Layout (Phase 0)



Inside `app/` create:



app/

&nbsp; index.html

&nbsp; styles/

&nbsp;   main.css

&nbsp;   components.css

&nbsp; js/

&nbsp;   app.js

&nbsp;   store/

&nbsp;     storage.js

&nbsp;     schema.js

&nbsp;     selectors.js

&nbsp;   rules/

&nbsp;     submittalRules.js

&nbsp;     urgencyRules.js

&nbsp;   modules/

&nbsp;     projects.js

&nbsp;     submittalsPlanner.js

&nbsp;     submittalsExecution.js

&nbsp;     rfis.js

&nbsp;     changeOrders.js

&nbsp;     notes.js

&nbsp;     timeLog.js

&nbsp;     weeklyPlanner.js

&nbsp;     insights.js

&nbsp;   ui/

&nbsp;     components.js

&nbsp;     renderHelpers.js

&nbsp;     events.js

&nbsp; backup.js   (keep working; may later be moved but not required in Phase 0)



Note: During Phase 0, many modules may be placeholders exporting stubs until code is moved.



---



\## Refactor Plan (Safe Steps)



\### Step 0 — Baseline Snapshot (No code changes)

\- Identify current behavior:

&nbsp; - load existing localStorage

&nbsp; - add/edit/delete project/scope/submittal

&nbsp; - status changes and history log

&nbsp; - backup.js behavior (if used)

\- Do not change functionality.



---



\### Step 1 — Extract Storage (Highest priority)

Goal: make storage a single importable module.



Create: `js/store/storage.js`



Move into it:

\- `STORAGE\_KEY`

\- load/save functions

\- any state initialization logic currently in index.html



Define and export:

\- `loadState()`

\- `saveState(state)`

\- `setState(nextState)` OR `updateState(fn)`

\- `getState()`



Required behavior:

\- `loadState()` returns the exact same object shape the app uses today.

\- If nothing exists in localStorage, initialize default state.



At the end of Step 1:

\- index.html must call `loadState()` and still behave normally.



---



\### Step 2 — Create Schema Defaults (No behavior change)

Goal: schema defaults live in one place.



Create: `js/store/schema.js`



Export:

\- `DEFAULT\_STATE`

\- `SCHEMA\_VERSION`



Important:

\- DEFAULT\_STATE should match current app expectations.

\- If current state has fields not in DEFAULT\_STATE, preserve them on load.

\- Do NOT migrate fields yet beyond adding schemaVersion if missing.



In `storage.js`, use DEFAULT\_STATE to initialize new installs.



---



\### Step 3 — Introduce App Boot File

Goal: index.html becomes a shell.



Create: `js/app.js`



Responsibilities:

\- call `loadState()`

\- initialize module registry

\- handle navigation/tabs

\- trigger initial render



At the end of Step 3:

\- index.html contains minimal script tags and calls into app.js.



---



\### Step 4 — Extract UI Helpers

Goal: remove repeated DOM utilities from main files.



Create:

\- `js/ui/renderHelpers.js`

\- `js/ui/events.js`

\- `js/ui/components.js`



Move into these files:

\- DOM query helpers

\- event delegation helpers

\- formatting helpers (date/weight)

\- modal helpers / dropdown builders (if they exist)



Rules:

\- UI helpers must not modify state directly.

\- UI helpers can accept callbacks to update state.



---



\### Step 5 — Extract “Projects” Module First

Goal: move one complete feature area end-to-end to validate the architecture.



Create: `js/modules/projects.js`



This module should:

\- render project list / selection

\- render scopes list under project

\- call store update functions

\- rerender as needed



Interface contract (exported):

\- `initProjectsModule({ rootEl, store, ui, selectors })`

\- `renderProjectsView()`



At the end:

\- project creation, selection, deletion must still work.



---



\### Step 6 — Move Submittals Planner Logic

Goal: move existing submittal UI logic into its module.



Create: `js/modules/submittalsPlanner.js`



Move:

\- submittal list rendering inside scopes

\- add/edit submittal

\- status dropdown handling

\- target date fields

\- history log rendering (if present)



Keep all rules as-is for now (even if messy) — Phase 0 is not a rules rewrite.



---



\### Step 7 — Stubs for Future Modules

Goal: prepare file locations without building features.



Create placeholder modules that export init/render with a “Coming Soon” view:



\- submittalsExecution.js

\- rfis.js

\- changeOrders.js

\- notes.js

\- timeLog.js

\- weeklyPlanner.js

\- insights.js



These should not break the app.



---



\### Step 8 — Add Selectors File (Pure Computations)

Create: `js/store/selectors.js`



For Phase 0:

\- only move existing derived computations (if any)

\- if none exist, export empty object:

&nbsp; - `selectors = {}`



Selectors must:

\- accept `state`

\- return computed lists/rollups

\- never modify state



---



\### Step 9 — Rules Files as Empty Containers (Phase 0 only)

Create:

\- `js/rules/submittalRules.js`

\- `js/rules/urgencyRules.js`



During Phase 0:

\- only extract any existing lifecycle helpers IF they already exist.

\- otherwise export placeholders.



The important part is that future phases have a dedicated home for domain rules.



---



\## “Do Not Break” Checklist (After Every Step)



After each step, the app must still allow:



\- Load saved data from localStorage

\- Create project

\- Create scope

\- Create submittal

\- Edit weights/dates

\- Change submittal statuses and see history updates

\- Save state persists after refresh

\- backup.js still functions (if used)



If any of these break, stop and fix before continuing.



---



\## How to Split the Existing index.html Safely



\### Technique: “Lift \& Wrap”

1\) Copy the existing function unchanged into the target file.

2\) Export it.

3\) Replace original function in index.html with an import call to the exported one.

4\) Verify behavior is identical.

5\) Only then clean up parameters and remove global variables.



Avoid rewriting logic during initial moves.



---



\## State Update Pattern (Recommended)



Use one consistent pattern:



\- store exports `updateState(fn)` where fn receives draft (or clone).

\- updateState saves to localStorage.

\- updateState triggers a rerender callback registered by app.js.



Example desired flow:

\- Module handles UI event

\- Module calls `store.updateState(state => { ...mutate... })`

\- App rerenders current view



In Phase 0, keep it simple: clone + mutate.



---



\## File Responsibility Summary



\- `store/storage.js`:

&nbsp; persistence, loading, saving, migrations

\- `store/schema.js`:

&nbsp; defaults + schemaVersion

\- `store/selectors.js`:

&nbsp; computed lists and rollups

\- `rules/\*`:

&nbsp; business logic (phases 1+)

\- `modules/\*`:

&nbsp; UI views only

\- `ui/\*`:

&nbsp; reusable DOM helpers



---



\## Output Requirement for Claude



When asked to refactor, Claude must:



1\) Describe which code blocks move into which files.

2\) Provide updated code in small chunks (per step).

3\) Ensure the app runs after each step.

4\) Avoid feature additions during Phase 0.



---



\## End of Phase 0 Definition



Phase 0 is complete when:



\- index.html is mostly layout + script tags.

\- store/schema exists.

\- store/storage exists.

\- at least Projects + Submittals Planner are extracted to modules.

\- app.js handles boot and routing.

\- everything still works exactly as before.

