import { EmpireOverviewContent } from "@/app/dashboard/admin/empire/page";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export default function OperationsFinancesPage() {
  return <OperationsWorkspaceShell title="Costs & Finances" purpose="Review verified company-wide operating costs, cost recovery, and venture boundaries without estimating missing values."><EmpireOverviewContent /></OperationsWorkspaceShell>;
}
