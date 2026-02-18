# Developer Specification: Detailer Central

**Goal:** Build "Detailer Central", a local-first, premium HTML/JS application for tracking commercial rebar detailing projects.
**Tech Stack:** Vanilla HTML5, CSS3 (Variables), JavaScript (ES6+). No frameworks, no build steps.
**Data:** Persistence via `localStorage`.

---

## 1. File Structure
> **CRITICAL INSTRUCTION**: Please build this as a **SINGLE HTML FILE** (`index.html`). 
> Embed the CSS in `<style>` tags and the JS in `<script>` tags. 
> This makes it easy for the user to move and run the tool.

## 2. Data Model (`store.js` logic)
The application must handle complex relationships. Use this exact data structure:

```javascript
/* State Shape */
{
  projects: [
    {
      id: "uuid",
      name: "Office Tower A",
      number: "25-001",
      client: "Big Builder Corp",
      // Metrics
      rfis: [
        { id: "r1", number: "1", subject: "Beam Clash", status: "Drafting" | "Sent" | "Answered", changeOrderId: "co1" }
      ],
      changeOrders: [
        { id: "co1", rfiId: "r1", description: "Added couplers", weightImpact: 500, hoursImpact: 4, status: "Pending" }
      ],
      scopes: [
        {
          id: "s1",
          name: "Level 1 Deck",
          estimatedTons: 100,
          actualTons: 102, // Variance calculated on fly
          hoursBudget: 40,
          hoursSpent: 42,
          submittals: [
            {
              id: "sub1",
              title: "L1 Deck - Area A",
              status: "Drafting" | "Submitted" | "Returned Approved" | "Revise & Resubmit" | "Released",
              targetDate: "2026-02-01",
              sentDate: "2026-01-29",
              currentRev: "0",
              history: [ { date: "...", action: "Created" } ]
            }
          ]
        }
      ]
    }
  ]
}
```

## 3. UI Requirements & CSS System (`styles.css`)

**Design Philosophy:** Dark, Technical, Premium. Think "Engineering Dashboard".

**Key Variables:**
```css
:root {
    --bg-app: #0f1115;
    --bg-panel: #181b21;
    --primary: #3b82f6;      /* Action Blue */
    --success: #10b981;      /* Approved/Released */
    --warning: #f59e0b;      /* Submitted/Pending */
    --danger: #ef4444;       /* Revise/Overdue */
    --text-main: #f3f4f6;
    --text-muted: #9ca3af;
    --radius: 8px;
}
```

**Required Views:**
1.  **Dashboard:**
    *   **Calendar Widget**: Show upcoming `targetDate` for submittals.
    *   **Alerts**: List of "Overdue" items or "Returned - Action Required".
2.  **Project Detail:**
    *   Header: Project Info + Aggregate Metrics (Total Tons Est vs Act).
    *   **Tabs:** Scopes, RFIs, Change Orders.
3.  **Scopes Tab**:
    *   List of Scopes. Expand a scope to see its Submittals.
    *   Inline editing for "Actual Tons" and "Hours Spent".

## 4. Key Logic Requirements

**A. Navigation (Single Page App)**
*   Use a simple "Tab/View" system.
*   Do NOT reload the page. usage: `<div id="dashboard-view" class="view active">`
*   Menu buttons should simply toggle the `active` class on the relevant view container.

**B. RFI to Change Order Pipeline**
1.  User clicks "Create CO" on an Answered RFI.
2.  System creates a new CO entry linked to that RFI.
3.  System pre-fills CO description with RFI subject.
4.  RFI status updates to "Closed (CO Created)".


**C. Edit & Delete Functionality (CRITICAL)**
*   **Projects**: Add "Edit" (rename) and "Delete" (remove project) buttons on the Dashboard or Project Detail view.
*   **Scopes**: Add "Delete Scope" button (with confirmation).
*   **RFIs/Change Orders**: Add "Delete" button.
*   **Submittals**: Ensure "Delete" button exists in the "Edit Submittal" modal.
*   **Logic**: Deleting a parent (e.g. Project) must strictly remove all children (Scopes, etc.) from LocalStorage to prevent data orphans.

**D. Variance Calculation**
*   `Weight Variance %` = `((Actual - Est) / Est) * 100`
*   Display this in **Red** if positive (over-weight/over-budget) and **Green** if negative (under-budget).

**E. Submittal Status Helper**
*   If Status is `Released`, unlock the "Release Date" field.
*   If Status is `Revise & Resubmit`, prompt to increment Revision # (e.g., Rev 0 -> Rev 1).

## 5. Implementation Prompt for Claude
*Copy and paste this to Claude:*

## 6. Phase 2: Advanced Task & Knowledge Management (New Requirements)

The user needs a "OS for their role" - not just a project tracker. Implement these modules:

**A. The "Focus" Task System**
*   **Data Model**:
    *   `Task`: { id, title, priority (Low/Med/High), status (Active, Done, Archived), targetDate, projectId (optional link), timeSpent, isFocus (bool), sortOrder (int) }
*   **Kanban/List UI**:
    *   **Drag & Drop**: Users must be able to re-order tasks vertically to set their daily stack.
    *   **Focus Mode**: A "Focus" button on a task highlights it (e.g., glows gold) and maybe starts a timer.
    *   **Time Tracking**: A "Play/Pause" button on the task. If linked to a Project Scope, this time rolls up to the Project's "Actual Hours".
    *   **Auto-Archive**: Completed tasks move to an "Archive" state after 24h or via a "Clean Up" button.
*   **Weekly Timesheet View**:
    *   **Logic**: Group all completed tasks/logs by "Week of [Date]" (e.g., Week of Jan 19th).
    *   **Purpose**: User needs this to fill out their official Time Card.
    *   **Display**: Show total hours per Project per Day for that week.
    *   **Navigation**: Arrows to go back to "Previous Week" to see past logs.

**B. The "Brain" Notes System**
*   **Data Model**:
    *   `Note`: { id, title, content (HTML/Markdown), type (QuickNote, Log, DeepDive), tags [], createdAt, pinned (bool) }
*   **Organization**:
    *   **Quick Notes**: Sidebar widget for sticky-note style scratchpad.
    *   **Logs**: Date-stamped entries (good for "Called Architect, said X").
    *   **Structured Notes**: Folders/Notebooks for "Code Snippets", "Standards", "Meetings".
    *   **Global Search**: Must search across Projects, RFIs, Tasks, and Notes.

**C. Dashboard Integration**
*   **Today's Focus**: Show the top 3 items from the Task List on the main Dashboard.
*   **Quick Capture**: A generic "+" button in the header to add a Task or Note from anywhere.

**D. Data Portability (CRITICAL)**
*   **Problem**: `localStorage` is stuck in one browser on one machine.
*   **Solution**: Add a "Settings" or "Data" tab.
    *   **Export Data**: Button to download the entire `store` state as a `.json` file (e.g., `rebar-tracker-backup-DATE.json`).
    *   **Import Data**: Button to upload a `.json` file and overwrite the current state.
*   **Why**: This allows the user to email the file to work, import it, work on it, export it, and email it back home.

**Implementation Prompt Update for Claude:**
> "Phase 2 Update: Add a `tasks` and `notes` array to the `store.js`.
> Build a 'Tasks' view with Drag-and-Drop capabilities (use native HTML5 DnD API).
> Build a 'Notes' view with a categorization sidebar.
> Link the Task Timer to the Project Scope hours logic."


## 7. Phase 3: Tools & Extensions (New Requirements)

The user wants this to be an extensible "OS". Add a **Tools** Tab to the Sidebar.

**A. Tools Data Model**
*   `Tool`: { id, name, url (or 'internal'), description, icon (emoji), category (Internal/External) }
*   **Logic**:
    *   **Internal Tools**: Rendered directly in a modal or a special view (e.g., Pomodoro).
    *   **External Tools**: Opened in a new tab (or iframe). Perfect for user adding local folders like `./tools/calculator/index.html`.

**B. Feature: The "Pomodoro Forge" (Internal Tool)**
*   **Design**: A dedicated view with a large countdown timer.
*   **Modes**: "Detailing Block" (25m), "Coffee Break" (5m), "Lunch" (30m).
*   **Integration**:
    *   When Timer starts, ask user to select a **Task** to focus on.
    *   Log the completed session time to that Task's `timeSpent`.
*   **Sound**: Simple 'ding' at end (optional/browser native API).

**C. Feature: The Tool Library**
*   **Grid View**: Show cards for all registered tools.
*   **"Add Tool" Button**:
    *   Form: Name, URL/Path, Description.
    *   *User Use Case*: User will drop folders into their project directory and link them here (e.g., `Link: ./tools/my-script/index.html`).

**D. Folder Structure Strategy (The "Toolbox")**
To support many standalone HTML tools, use this exact directory structure. Detailer Central will serve as the "Launcher" for these.

```text
/rebar_detailer_deep_dive
    /index.html          <-- DETAIL CENTRAL (The Main App)
    /developer_spec.md
    /tools/              <-- The "Toolbox" Folder
        /calculators/
            /beam-weight/
                index.html
            /overlap-calc/
                index.html
        /generators/
            /rfi-template/
                index.html
        /reference/
            /aci-codes/
                index.html
```

*   **Rule**: Each tool gets its own subfolder inside `/tools/`.
*   **Integration**: In the "Tools" tab of Detailer Central, the user will add a tool by simply pasting the relative path (e.g., `tools/calculators/beam-weight/index.html`).

