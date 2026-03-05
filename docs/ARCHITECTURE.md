\# Detailer Central — Architecture



This document defines the architecture of the Detailer Central application.



The goal of the architecture is to support long-term development while keeping the application:



\- Local-first

\- Static HTML + JavaScript

\- Stable

\- Modular

\- Easy to extend



The architecture separates:



1\. Data storage

2\. Business rules

3\. Computed data

4\. UI modules



This allows the application to grow without turning into a single massive file.



---



\# Application Structure





app/

index.html



styles/

main.css

components.css



js/

app.js



store/

storage.js

schema.js

selectors.js



rules/

submittalRules.js

urgencyRules.js



modules/

projects.js

submittalsPlanner.js

submittalsExecution.js

rfis.js

changeOrders.js

notes.js

timeLog.js

weeklyPlanner.js

insights.js



ui/

components.js

renderHelpers.js

events.js





backup.js remains available for data backup functionality.



---



\# Architecture Layers



The system is divided into \*\*four layers\*\*.



---



\# 1. Store Layer



Responsible for \*\*data storage and persistence\*\*.



Handles:



\- localStorage

\- schema defaults

\- data migrations

\- backup compatibility



Files:





store/storage.js

store/schema.js





\### storage.js

Handles reading and writing the application state.



Responsibilities:



\- load state

\- save state

\- version migrations

\- backup compatibility



\### schema.js

Defines the \*\*default state structure\*\* used when initializing the application.



The schema must match the definitions in:





docs/DATA\_MODEL.md





---



\# 2. Rules Layer



Contains \*\*business logic\*\* and domain rules.



Rules must be centralized so they are not duplicated across UI modules.



Files:





rules/submittalRules.js

rules/urgencyRules.js





\### submittalRules.js



Handles:



\- Submittal lifecycle transitions

\- Revision rules

\- Approval logic

\- Release eligibility

\- Release entry creation



Example rules:



\- Only Approved or Approved as Noted submittals can be released

\- Revise \& Resubmit forces rev increment and new target date

\- Release entries add to released weight



---



\### urgencyRules.js



Handles planning and deadline awareness.



Examples:



\- 5-day fabrication rule for MRD

\- At-risk submittal detection

\- Overdue submission warnings

\- Auto task generation



---



\# 3. Selectors Layer



Selectors compute \*\*derived data\*\* from raw state.



Selectors never modify state.



Examples:



\- Awaiting return queue

\- Release ready queue

\- At risk submittals

\- Tons per week

\- Hours per submittal

\- Project rollups



File:





store/selectors.js





Selectors allow the UI to remain simple and focused on rendering.



---



\# 4. Module Layer



Modules are \*\*feature views\*\*.



Each module is responsible only for:



\- rendering UI

\- handling user interaction

\- calling store functions

\- using selectors



Modules must NOT contain business logic.



Modules:





modules/projects.js

modules/submittalsPlanner.js

modules/submittalsExecution.js

modules/rfis.js

modules/changeOrders.js

modules/notes.js

modules/timeLog.js

modules/weeklyPlanner.js

modules/insights.js





---



\# Core Modules



\## Projects



Project dashboard and navigation.



Displays:



\- scopes

\- submittals

\- summary stats



---



\## Submittals Planner



The \*\*Gantt-style planning view\*\*.



Allows the user to:



\- plan submittal target dates

\- visualize work windows

\- manage revision cycles



---



\## Submittals Execution



Daily execution dashboard.



Shows queues:



\- Awaiting return

\- Release ready

\- At risk submittals



Integrates MRD urgency logic.



---



\## RFIs



Tracks requests for information linked to scopes.



---



\## Change Orders



Tracks scope additions and weight changes.



Change orders may affect released totals.



---



\## Notes



Two types of notes:



Quick notes  

Structured job notes



---



\## Time Log



Tracks detailing time.



Time entries support:



\- submittal linking

\- scope linking



Rollups power performance insights.



---



\## Weekly Planner



A planning interface for the user's work week.



Pulls from:



\- urgency tasks

\- deadlines

\- manual priorities



---



\## Insights



Performance analytics.



Examples:



\- lbs detailed per week

\- hours per submittal

\- schedule accuracy

\- resubmittal rate



---



\# UI Layer



UI helpers live in:





ui/components.js

ui/renderHelpers.js

ui/events.js





These provide reusable UI pieces such as:



\- tables

\- modals

\- dropdowns

\- date formatting



---



\# Application Boot



The application starts in:





js/app.js





Responsibilities:



\- initialize store

\- load modules

\- handle tab navigation

\- trigger initial render



---



\# Design Principles



1\. \*\*Single Source of Truth\*\*



All application data lives in the store.



Modules must never create independent data models.



---



2\. \*\*Rules Are Centralized\*\*



Business logic lives in rules files.



UI modules should never duplicate rule logic.



---



3\. \*\*Selectors Compute Views\*\*



Derived information should be computed via selectors.



Examples:



\- queues

\- performance metrics

\- risk warnings



---



4\. \*\*Modules Are Replaceable\*\*



Modules should be independent.



This allows new features to be added without breaking existing ones.



---



\# Relationship to Other Documents



This architecture is designed to support the workflow defined in:





docs/PROJECT\_GOAL.md





The data structures used by the system are defined in:





docs/DATA\_MODEL.md





These documents together define the \*\*contract for the application\*\*.



Any new feature should follow these guidelines.

