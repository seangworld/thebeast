import { useState } from "react";

export function useCashFlowDisclosureState() {
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showBills, setShowBills] = useState(true);
  const [showDebts, setShowDebts] = useState(true);
  const [showIncomeEvents, setShowIncomeEvents] = useState(true);
  const [showFundingSources, setShowFundingSources] = useState(true);
  const [showCashTimeline, setShowCashTimeline] = useState(false);
  const [showArchivedBills, setShowArchivedBills] = useState(false);
  const [showArchivedDebts, setShowArchivedDebts] = useState(false);

  return {
    showAddIncome,
    setShowAddIncome,
    showAddBill,
    setShowAddBill,
    showBills,
    setShowBills,
    showDebts,
    setShowDebts,
    showIncomeEvents,
    setShowIncomeEvents,
    showFundingSources,
    setShowFundingSources,
    showCashTimeline,
    setShowCashTimeline,
    showArchivedBills,
    setShowArchivedBills,
    showArchivedDebts,
    setShowArchivedDebts,
  };
}
