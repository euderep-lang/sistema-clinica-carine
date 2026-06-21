import { Z as fmtMoney } from "./index.mjs";
const CHART_MONEY_Y_AXIS_WIDTH = 92;
function fmtChartMoneyTick(value) {
  return fmtMoney(Number(value));
}
function fmtChartMoneyTooltip(value) {
  return fmtMoney(Number(value));
}
const chartMoneyYAxisProps = {
  width: CHART_MONEY_Y_AXIS_WIDTH,
  tickMargin: 4,
  tickFormatter: fmtChartMoneyTick
};
const chartMoneyXAxisProps = {
  tickFormatter: fmtChartMoneyTick,
  tickMargin: 8
};
const chartMoneyMargin = { top: 8, right: 12, left: 4, bottom: 0 };
export {
  chartMoneyYAxisProps as a,
  chartMoneyXAxisProps as b,
  chartMoneyMargin as c,
  fmtChartMoneyTooltip as f
};
