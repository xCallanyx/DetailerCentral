# Detailer Central — Project Goal

## Purpose

Detailer Central is a **local-first assistant for rebar detailers**.  
The goal is to provide a **single workspace where a detailer can manage their entire workflow** across multiple construction projects.

This is NOT just a rebar tracking tool.

The goal is to build a **Detailer Assistant** that helps a user:

- Plan submittals
- Track detailing progress
- Stay on schedule
- Manage RFIs and change orders
- Track personal productivity
- Organize project notes
- Monitor release deadlines and material needs
- Maintain awareness across multiple jobs

The application must remain:

- **Local-first**
- **Simple to run (static HTML/JS)**
- **Fast**
- **Stable**

No servers or databases are required. All data is stored locally using localStorage with backup capability.

---

# Core Workflow

The application follows the real workflow of a rebar detailer.

### Step 1 — Project Intake
User inputs:

- Project
- Scopes
- Estimated weight
- Initial notes

This establishes the **project structure**.

---

### Step 2 — Submittal Planning

The user plans out submittals.

Submittals represent **units of detailing work**.

The planner should allow:

- Target submission dates
- Scope grouping
- RFI links
- Change order awareness

This is displayed using a **Gantt-style planner**.

The planner answers:

"What submittals exist and when should they be submitted?"

---

### Step 3 — Submittal Execution

The detailer works through submittals.

During execution the system tracks:

- Detailed weight
- Time spent
- Submittal status
- Revision count

Submittal lifecycle:

Drafting  
Submitted (Waiting Return)  
Approved  
Approved as Noted  
Revise & Resubmit  
Released

The goal is that **all submittals eventually reach Approved or Approved as Noted and then become Released.**

---

### Step 4 — Release and Material Coordination

The ultimate goal is **material released for fabrication and delivered to the jobsite**.

Additional tracking:

- Release Date
- Material Requested Date
- Fabrication lead time (5 day rule)

The system should warn the user if:

Material is needed soon but the submittal is not approved.

---

# Key System Capabilities

Detailer Central should support:

### Submittal Planning
Gantt-style timeline for submittal scheduling.

### Execution Queues
Daily task awareness such as:

- Awaiting return
- Release ready
- At risk submittals

### RFIs
Questions and clarifications tied to submittals.

### Change Orders
Scope changes affecting detailing.

### Notes
Two types:

Quick notes  
Structured job notes

### Weekly Planner
A weekly work planning tool.

### Performance Tracking
Personal insights including:

- Tons detailed per week
- Hours per submittal
- Schedule accuracy

---

# End Goal

The end goal is a **one stop detailer assistant** that helps the user:

- Plan work
- Execute work
- Track work
- Improve productivity
- Avoid missed deadlines

The application must stay **simple, stable, and modular** so new features can be added without breaking existing ones.
