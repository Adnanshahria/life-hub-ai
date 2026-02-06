# FinancePage.tsx

## Overview
The Finance page provides comprehensive income and expense tracking with date range filtering, trend visualization, and AI-powered entry management.

## Features

### View Modes
- **Daily**: Single day view with pie chart for expense category breakdown
- **Weekly**: 7-day range with line chart showing income/expense trends
- **Monthly**: Full month view with daily breakdown line chart  
- **Yearly**: 12-month view with monthly data points
- **Custom**: User-defined date range
- **All Time**: All entries across all dates

### Date Controls
- Uses shadcn/ui Calendar component in Popover for consistent website-native date picking
- Navigation arrows for quick period changes
- Quick buttons: "Today", "This Week", "This Month", "This Year"

### Charts
- **Daily View**: Pie chart showing expenses grouped by category
- **Other Views**: Line chart with two trend lines (Income = green, Expense = red)
  - X-axis shows day numbers (1-31) or weekday names or month abbreviations
  - Hoverable data points with tooltips

### Entry Management
- Add new income/expense entries via dialog
- Edit existing entries (pencil icon in history modal)
- Delete entries (trash icon)
- AI can add/edit/delete entries via chat commands

### AI Integration Actions
- `ADD_EXPENSE`: Add expense entry with amount, category, description, date
- `ADD_INCOME`: Add income entry with amount, category, description, date
- `EDIT_EXPENSE` / `EDIT_INCOME`: Modify existing entries by ID
- `DELETE_EXPENSE` / `DELETE_INCOME`: Remove entries by ID

## Key Components Used
- `useFinance` hook for data management (entries, addEntry, updateEntry, deleteEntry)
- `Calendar` and `Popover` from shadcn/ui for date selection
- `LineChart`, `PieChart` from recharts for visualization
- `Tabs` for view mode selection

## Categories
Food, Transport, Entertainment, Bills, Shopping, Freelance, Salary, Other
