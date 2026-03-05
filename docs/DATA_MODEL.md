\# DATA\_MODEL.md — Detailer Central



This document defines the canonical data structures for Detailer Central.

The app is local-first and stores a single state object in localStorage.



Key principles:

\- \*\*All weights are stored in LBS\*\* internally.

\- Submittals are the core unit of planning/execution, but \*\*weights must tie back to scopes\*\*.

\- The submittal planner (Gantt-style) and execution systems (queues/calendar/tasks) read the SAME data.

\- Statuses reflect the real submission/return loop and resubmittals.



---



\## Storage



\### LocalStorage

\- Primary state key: `rebar\_tracker\_data` (existing key)

\- Future-proofing: include schema version for migrations.



```js

state = {

&nbsp; schemaVersion: 1,

&nbsp; projects: \[],

&nbsp; tasks: \[],

&nbsp; timeEntries: \[],

&nbsp; settings: {}

}

Entities

1\) Project



A project is the top-level job container.



Project



id: string



jobNumber: string



jobName: string



createdAt: ISODateTime



updatedAt: ISODateTime



Collections



scopes: Scope\[]



rfis: Rfi\[]



changeOrders: ChangeOrder\[]



Notes: RFIs and Notes link to scope (not directly to submittal).



2\) Scope



A scope is the main estimating + organizing bucket under a project.

Example: Foundations, SOG, Deck Level 2, Sitework, etc.



Scope



id: string



name: string



estimatedLbs: number (scope estimate input)



hoursBudget?: number (optional existing field)



hoursSpent?: number (legacy/optional; future rollups come from timeEntries)



createdAt: ISODateTime



updatedAt: ISODateTime



Collections



submittals: Submittal\[]



notes: Note\[] (recommended; or notes may live in project with scopeId links)



3\) Submittal



A submittal is the core unit of planning and delivery.



3.1 Identity



Submittals use a human-friendly sequence ID:



S1, S2, S3, etc.



Submittal



id: string



label: string (e.g., "S1")



title: string (optional friendly description)



status: SubmittalStatus



rev: number (integer, increases when resubmitted)



3.2 Scope-linked weights



A submittal normally belongs to one scope, but must support

splitting submittal weight across multiple scopes when necessary.



Submittal stores weight breakdown as entries:



SubmittalScopeWeight



scopeId: string



estimatedLbs?: number (optional; may be blank)



detailedLbs?: number (editable; “detailed weight”)



note?: string



Submittal



scopeWeights: SubmittalScopeWeight\[]



Rules:



A submittal must have at least one scopeWeights entry.



Typical case: one entry, matching the parent scope.



Multi-scope case: multiple entries to split weight intentionally.



3.3 Dates (planner + execution)



We want full visibility, so submittals can store both target and actual dates.



Planned / Target dates



targetSubmitDate?: ISODate



targetReleaseDate?: ISODate (optional; useful for planning)



Actual dates



submittedAt?: ISODate



returnedAt?: ISODate



releasedAt?: ISODate



3.4 Review result (return outcome)



When a submittal comes back from review, the result must be captured.



SubmittalReviewOutcome



NONE (not returned yet)



APPROVED



APPROVED\_AS\_NOTED



REVISE\_AND\_RESUBMIT



Submittal



reviewOutcome: SubmittalReviewOutcome



3.5 Releases are NOT locked (additive entries)



Released weight is not a single locked snapshot.

Mistakes happen and additional releases can be issued later.

We track release entries as additive deltas.



ReleaseEntry



id: string



date: ISODate



addedLbs: number



description?: string (e.g., "Initial release", "Added missed bars", "Weekly release total")



relatedChangeOrderId?: string (optional link if the release is CO-driven)



Submittal



releaseEntries: ReleaseEntry\[]



Derived:



releasedTotalLbs = sum(releaseEntries.addedLbs)



3.6 History log (audit trail)



Submittals keep a history list for important events.



SubmittalHistoryEvent



id: string



timestamp: ISODateTime



type: string (e.g., "CREATED", "STATUS\_CHANGED", "REV\_BUMPED", "WEIGHT\_UPDATED", "DATE\_UPDATED", "RELEASE\_ADDED", "OUTCOME\_SET")



message: string



Submittal



history: SubmittalHistoryEvent\[]



4\) Submittal Status Lifecycle



We use the more explicit “Option 2” lifecycle to reflect resubmittals and pushed dates.



SubmittalStatus



DRAFTING



SUBMITTED\_WAITING\_RETURN



RETURNED (optional internal grouping; or omit and use reviewOutcome)



RESUBMITTED\_WAITING\_RETURN



RELEASED



Rules:



A submittal starts as DRAFTING.



When sent, it becomes SUBMITTED\_WAITING\_RETURN and sets submittedAt (optional).



When returned, set returnedAt and set reviewOutcome:



APPROVED



APPROVED\_AS\_NOTED



REVISE\_AND\_RESUBMIT



If outcome is REVISE\_AND\_RESUBMIT, user bumps rev += 1,

sets a new targetSubmitDate, and status becomes RESUBMITTED\_WAITING\_RETURN.

(This preserves that the initial target was pushed due to resubmittal.)



“Release” is allowed only when outcome is APPROVED or APPROVED\_AS\_NOTED.



RELEASED means at least one releaseEntries\[] exists, but release entries remain editable/additive.



Note: The UI may show a “Returned” badge based on returnedAt + reviewOutcome,

even if the underlying status uses the waiting statuses.



5\) Material Requests (Calendar-anchored)



We track Material Requested Date (MRD) as the key planning anchor.

We do NOT track the actual delivery date (shop controls that).



MaterialRequest



id: string



dateRequested: ISODate (MRD)



projectId: string



linkedSubmittalIds: string\[]



description?: string



createdAt: ISODateTime



5-day fabrication rule (calendar days)



Rule-of-thumb lead time is 3–5 days; default is 5.

We model it as a setting but default to 5.



Derived:



fabLeadDaysDefault = 5 (calendar days)



fabStartNeededDate = MRD - fabLeadDays



Urgency rule:

If today is near or past fabStartNeededDate AND any linked submittal is NOT:



outcome APPROVED or APPROVED\_AS\_NOTED



OR status RELEASED

Then generate/raise an urgent task.



6\) Tasks



Tasks are both:



manually created (user to-do)



auto-generated (from rules: MRD urgency, overdue return, release-ready queue)



Task



id: string



title: string



type: TaskType (MANUAL | AUTO)



status: TaskStatus (OPEN | DONE | ARCHIVED)



urgency: TaskUrgency (LOW | MED | HIGH | CRITICAL)



dueDate?: ISODate



projectId?: string



scopeId?: string



linkedSubmittalId?: string



linkedMaterialRequestId?: string



createdAt: ISODateTime



updatedAt: ISODateTime



notes?: string



AUTO task behavior



If condition persists, task remains OPEN and urgency increases as deadline approaches.



If condition resolves (submittal becomes approved/released), AUTO task can auto-close or suggest close.



7\) Time Entries (Performance Tracking)



Time tracking is its own module.

Time entries should support either scope or submittal, but submittal is preferred.



TimeEntry



id: string



date: ISODate



minutes: number (store as minutes for precision; UI can show hours)



projectId: string



scopeId?: string



submittalId?: string (preferred)



note?: string



createdAt: ISODateTime



We do NOT track work types (Detailing/Checking/etc) in time entries at this phase.



Derived rollups:



hours per submittal



hours per week



lbs per week (from detailed lbs or released lbs depending on report)



schedule hit rate (target submit vs submittedAt)



cycle time (submittedAt → returnedAt)



resubmittal count per job/scope



8\) RFIs



RFIs support submittals but are linked to scopes (per requirement).



Rfi



id: string



scopeId: string



number?: string



title: string



status: string (OPEN | ANSWERED | CLOSED or similar)



createdAt: ISODateTime



updatedAt: ISODateTime



notes?: string



9\) Change Orders



Change orders are tracked separately and can affect released totals.

They may add weight after the fact.



ChangeOrder



id: string



scopeId: string



label?: string (CO-01)



description: string



addedLbs?: number (optional, if known later)



status?: string (PENDING | APPROVED | BUILT-IN, etc.)



createdAt: ISODateTime



updatedAt: ISODateTime



CO linkage to release entries:



ReleaseEntry may include relatedChangeOrderId.



10\) Settings



Settings



fabLeadDaysDefault: number (default 5; allowed 3–5 typical)



units: "LBS" (fixed)



schemaVersion: number



Naming Conventions



IDs: use stable unique IDs (timestamp + random suffix acceptable)



Dates:



Use ISODate (YYYY-MM-DD) for day-based planning.



Use ISODateTime for logs/history.



Summary of Key Decisions (locked)



We store all weights in LBS.



Submittal weights are linked to scopes via scopeWeights\[].



Lifecycle uses explicit resubmittal status: RESUBMITTED\_WAITING\_RETURN.



MRD (Material Requested Date) is the anchor; we do not track delivery.



Fab lead time uses calendar days; default 5 (typical range 3–5).



Released totals are tracked via additive release entries, not a locked snapshot.



Time logs are supported (submittal preferred) with minimal fields (no work types).



RFIs and Notes link primarily to scope.



Change orders are tracked separately and can be linked to release entries.



Tasks are both manual and auto-generated from urgency rules.

