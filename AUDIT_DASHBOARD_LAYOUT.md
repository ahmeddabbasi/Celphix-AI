# Dashboard Layout Audit (pre-change)

File: `src/pages/Dashboard.tsx`

## Components rendered (top → bottom)

1. **Header zone**
   - Title: `Dashboard`
   - Subtitle: `<window> overview`
   - Period filter pill group (`Today`, `7 Days`, `30 Days`, `90 Days`) — updates local `window` state.

2. **Summary metrics row**
   - `StatCard` ×3:
     - Total Calls
     - Total Time
     - Active Assistants

3. **Row: Active assistants + Dialing**
   - Left panel: `ActiveAssistants`
   - Spacer column: `div.hidden.lg:block` (1/12 width) for visual separation
   - Right panel: `Dialing`

4. **Row: Top performers + Activity trends**
   - Left panel: `TopPerformers`
   - Spacer column: `div.hidden.lg:block` (1/12 width)
   - Right panel: `ActivityTrendsChart`

## Current grid / sizing behavior

- Overall page uses `space-y-[clamp(...)]` for vertical spacing.
- Summary metrics uses `grid` + `gap-[clamp(...)]` and `sm:grid-cols-3`.
- The two lower rows use a 12-column grid with explicit `col-span-*` plus a hidden spacer column to create separation.

## Potential misalignment / inconsistency sources

- Multiple `clamp(...)`-based spacing values (not aligned to Tailwind spacing scale).
- Hidden spacer columns can make column alignment feel incidental rather than driven by a shared grid.
- `StatCard` uses a `clamp(...)` padding and gap, which can create inconsistent rhythm versus the rest of the app.

## Responsive behavior observed

- Header stacks on small screens (`sm:flex-row` for header).
- Summary metrics becomes 3 columns at `sm`.
- Lower rows become a single column at smaller than `lg` (because `col-span-12` and `lg:col-span-*`).

## Dynamic vs always-present

- All widgets are always rendered.
- Data is dynamic via:
  - `useDashboardSummary(window)`
  - `useDashboardAssistantsKpis(window)`
  - `TopPerformers` receives assistants data from query.
