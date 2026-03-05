DEVELOPMENT\_PHASES.md

\# Detailer Central — Development Phases



This document defines the safe implementation order for new features.



The goal is to ensure \*\*build stability\*\* while the application evolves from a prototype into a modular system.



Claude (or any AI assistant) must \*\*follow these phases in order\*\*.



Do not skip phases or implement later features early.



Each phase must leave the application \*\*fully functional before moving to the next phase.\*\*



---



\# Phase 0 — Architecture Refactor (Current Phase)



Goal: Stabilize the codebase.



Tasks:



\- Split logic currently inside `index.html` into modules.

\- Implement the folder structure described in:





docs/ARCHITECTURE\_REFACTOR.md





Key refactor targets:



Move storage logic → `store/storage.js`



Define default schema → `store/schema.js`



Move rendering logic → `modules/`



Move reusable UI helpers → `ui/`



Create rule containers → `rules/`



No new features should be implemented during this phase.



The goal is \*\*architecture stability only\*\*.



Success criteria:



\- Application runs normally.

\- Existing functionality still works.

\- Code is modularized.



---



\# Phase 1 — Submittal Lifecycle System



Goal: Establish the core workflow engine.



Implement the full submittal lifecycle defined in:





docs/DATA\_MODEL.md





Statuses:



Drafting  

Submitted (Waiting Return)  

Returned (review outcome stored separately)  

Resubmitted (Waiting Return)  

Released  



Return outcomes:



Approved  

Approved as Noted  

Revise \& Resubmit  



Required features:



\- Revision increments

\- Return outcome tracking

\- Release eligibility rules

\- Status history logging



Business logic should live in:





rules/submittalRules.js





Success criteria:



\- Submittal lifecycle behaves correctly

\- Revision cycles work

\- Release rules are enforced



---



\# Phase 2 — Material Request + Urgency System



Goal: Add schedule awareness.



Implement \*\*Material Requested Date (MRD)\*\* tracking.



Add:



MaterialRequest entity.



MRD drives urgency logic.



Rule:





fabStartNeeded = MRD - 5 days





If today is near or past `fabStartNeeded` and linked submittals are not:



Approved  

Approved as Noted  

Released  



Then an \*\*urgent task should be generated\*\*.



Logic belongs in:





rules/urgencyRules.js





Success criteria:



\- MRD calendar entries exist

\- 5-day fabrication rule works

\- urgency tasks appear correctly



---



\# Phase 3 — Execution Queues



Goal: Provide daily awareness.



Create execution dashboard queues.



Queues include:



\### Awaiting Return



Submittals currently waiting on engineer response.



\### Release Ready



Submittals that are:



Approved  

Approved as Noted  



but not yet released.



\### At Risk



Submittals approaching MRD deadlines.



Queue logic should be computed using:





store/selectors.js





Success criteria:



\- Queues update dynamically

\- Users can quickly see urgent work



---



\# Phase 4 — Time Logging



Goal: Track detailing effort.



Create a Time Log module.



Entity:





TimeEntry





Fields:



date  

minutes  

projectId  

scopeId (optional)  

submittalId (preferred)



Time logging should enable:



\- hours per submittal

\- hours per week

\- effort tracking



Success criteria:



\- Time entries persist

\- Rollups appear in selectors



---



\# Phase 5 — Planner Improvements (Gantt)



Goal: Improve the submittal planning system.



Enhance the Gantt-style planner to support:



\- planning windows

\- revision rescheduling

\- better visualization of workload



Planner reads from the same submittal data model.



Success criteria:



\- Planner remains stable

\- Dates sync with lifecycle system



---



\# Phase 6 — Weekly Work Planner



Goal: Help the user plan their week.



Weekly planner should pull from:



\- execution queues

\- urgent tasks

\- upcoming deadlines



User should be able to:



\- reorder work

\- assign weekly priorities



Success criteria:



\- Weekly planning improves task clarity



---



\# Phase 7 — Performance Insights



Goal: Provide productivity feedback.



Using TimeEntry and submittal data, compute:



\- lbs detailed per week

\- hours per submittal

\- schedule accuracy

\- revision frequency

\- release rates



Selectors should generate rollups.



UI lives in:





modules/insights.js





Success criteria:



\- Insights appear without affecting core workflow



---



\# Development Rules



1\. Never skip phases.



2\. The application must run after each phase.



3\. New logic must follow the architecture defined in:





docs/ARCHITECTURE\_REFACTOR.md





4\. Data structures must follow:





docs/DATA\_MODEL.md





5\. No business logic inside UI modules.



---



\# Long-Term Vision



These phases gradually transform Detailer Central into a \*\*Detailer Assistant\*\*.



The final system will combine:



\- Submittal planning

\- Deadline awareness

\- Time tracking

\- Task management

\- Performance insights



into a single workspace designed for professional rebar detailers.

