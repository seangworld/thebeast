export type {
  PayoffDebt,
  PayoffMonth,
  PayoffResult,
  PayoffStrategy,
} from "./unifiedStrategyEngine";
export {
  getInclusivePayoffDate,
  runUnifiedStrategyEngine,
} from "./unifiedStrategyEngine";
export { runUnifiedStrategyEngine as simulatePayoffPlan } from "./unifiedStrategyEngine";
