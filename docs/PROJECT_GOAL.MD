\# Detailer Central — Project Goal



\## Purpose



Detailer Central is a \*\*local-first assistant for rebar detailers\*\*.  

The goal is to provide a \*\*single workspace where a detailer can manage their entire workflow\*\* across multiple construction projects.



This is NOT just a rebar tracking tool.



The goal is to build a \*\*Detailer Assistant\*\* that helps a user:



\- Plan submittals

\- Track detailing progress

\- Stay on schedule

\- Manage RFIs and change orders

\- Track personal productivity

\- Organize project notes

\- Monitor release deadlines and material needs

\- Maintain awareness across multiple jobs



The application must remain:



\- \*\*Local-first\*\*

\- \*\*Simple to run (static HTML/JS)\*\*

\- \*\*Fast\*\*

\- \*\*Stable\*\*



No servers or databases are required. All data is stored locally using localStorage with backup capability.



---



\# Core Workflow



The application follows the real workflow of a rebar detailer.



\### Step 1 — Project Intake

User inputs:



\- Project

\- Scopes

\- Estimated weight

\- Initial notes



This establishes the \*\*project structure\*\*.



---



\### Step 2 — Submittal Planning



The user plans out submittals.



Submittals represent \*\*units of detailing work\*\*.



The planner should allow:



\- Target submission dates

\- Scope grouping

\- RFI links

\- Change order awareness



This is displayed using a \*\*Gantt-style planner\*\*.



The planner answers:



"What submittals exist and when should they be submitted?"



---



\### Step 3 — Submittal Execution



The detailer works through submittals.



During execution the system tracks:



\- Detailed weight

\- Time spent

\- Submittal status

\- Revision count



Submittal lifecycle:



Drafting  

Submitted (Waiting Return)  

Approved  

Approved as Noted  

Revise \& Resubmit  

Released



The goal is that \*\*all submittals eventually reach Approved or Approved as Noted and then become Released.\*\*



---



\### Step 4 — Release and Material Coordination



The ultimate goal is \*\*material released for fabrication and delivered to the jobsite\*\*.



Additional tracking:



\- Release Date

\- Material Requested Date

\- Fabrication lead time (5 day rule)



The system should warn the user if:



Material is needed soon but the submittal is not approved.



---



\# Key System Capabilities



Detailer Central should support:



\### Submittal Planning

Gantt-style timeline for submittal scheduling.



\### Execution Queues

Daily task awareness such as:



\- Awaiting return

\- Release ready

\- At risk submittals



\### RFIs

Questions and clarifications tied to submittals.



\### Change Orders

Scope changes affecting detailing.



\### Notes

Two types:



Quick notes  

Structured job notes



\### Weekly Planner

A weekly work planning tool.



\### Performance Tracking

Personal insights including:



\- Tons detailed per week

\- Hours per submittal

\- Schedule accuracy



---



\# End Goal



The end goal is a \*\*one stop detailer assistant\*\* that helps the user:



\- Plan work

\- Execute work

\- Track work

\- Improve productivity

\- Avoid missed deadlines



The application must stay \*\*simple, stable, and modular\*\* so new features can be added without breaking existing ones.

2\. ARCHITECTURE\_REFACTOR.md



Put this in /docs/ARCHITECTURE\_REFACTOR.md



\# Architecture Refactor



\## Why the Architecture Is Changing



The current application was originally built as a single-file prototype.



Most logic lives inside:



index.html



This approach works for early development but becomes unstable as features grow.



Upcoming features include:



\- Submittal lifecycle rules

\- Release gating

\- Material requested scheduling

\- Execution queues

\- Time logging

\- Weekly planning

\- Performance insights



Adding these features directly to index.html would create:



\- Extremely large files

\- Tight coupling between UI and logic

\- Difficult debugging

\- High risk of breaking working features



For long-term stability the application needs \*\*modular architecture\*\*.



---



\# Architecture Goals



The new structure must:



1\. Keep the application \*\*local-first\*\*

2\. Remain \*\*static HTML + JS\*\*

3\. Avoid build tools

4\. Allow \*\*feature modules\*\*

5\. Separate \*\*data, rules, and UI\*\*



---



\# New Architecture Model



The system will be divided into four layers.



\## 1. Store Layer

Responsible for data storage.



Handles:



\- localStorage

\- migrations

\- schema defaults



Files:



store/

storage.js

schema.js



---



\## 2. Rules Layer



Business logic for the application.



Examples:



\- Submittal lifecycle rules

\- Release gating

\- Fabrication urgency rules



Files:



rules/

submittalRules.js

urgencyRules.js



---



\## 3. Selectors Layer



Computed data used by the UI.



Examples:



\- Awaiting return queue

\- Release ready queue

\- At risk submittals

\- Performance rollups



Files:



store/selectors.js



---



\## 4. Module Layer



UI views for each system feature.



Modules include:



projects.js  

submittalsPlanner.js  

submittalsExecution.js  

rfis.js  

changeOrders.js  

notes.js  

timeLog.js  

weeklyPlanner.js  

insights.js  



Each module should only handle:



\- rendering

\- user interaction

\- calling rules/selectors



Modules should not contain core data logic.



---



\# Benefits



This structure allows:



\- safer feature development

\- easier debugging

\- predictable data flow

\- incremental development phases

\- long term stability

3\. MASTER CLAUDE PROMPT (paste this into Claude)

You are helping refactor an existing local-first HTML/JavaScript application called "Detailer Central".



Before making any changes, read the following files in the repository:



docs/PROJECT\_GOAL.md

docs/ARCHITECTURE\_REFACTOR.md



These documents define the purpose of the application and the architecture direction.



The goal is NOT to rewrite the application.



The goal is to \*\*refactor the codebase into modular architecture while preserving all existing functionality.\*\*



IMPORTANT RULES



1\. The app must remain \*\*static HTML + JavaScript\*\*.

2\. Do NOT introduce build tools.

3\. Do NOT introduce frameworks.

4\. The application must remain \*\*local-first using localStorage\*\*.

5\. Existing features must continue working.



---



ARCHITECTURE TARGET



Create the following structure inside the app directory:



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



backup.js should remain functional.



---



REFACTOR OBJECTIVE



Refactor the existing index.html logic into modules.



Specifically:



Move data access and localStorage logic into:



store/storage.js



Define default schema inside:



store/schema.js



Move business rules into:



rules/



Move UI rendering into:



modules/



Keep index.html as a shell that loads modules.



---



IMPLEMENTATION STRATEGY



Perform the refactor in small safe steps.



Step 1

Extract storage logic into storage.js.



Step 2

Create schema.js with default state structure.



Step 3

Move project rendering logic into modules/projects.js.



Step 4

Ensure the application still runs correctly after each step.



Do not implement new features yet.



This refactor is ONLY about architecture.



---



OUTPUT



Explain:



1\. What code sections should move

2\. What each new file will contain

3\. What changes index.html needs



Do NOT generate the entire rewritten project at once.



Work step by step to keep the application stable.

