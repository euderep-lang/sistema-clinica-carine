import { fmtMoney } from "@/lib/locale";

/** Recharts usa width=60 no eixo Y e corta o "R" de "R$", exibindo "$". */
export const CHART_MONEY_Y_AXIS_WIDTH = 92;

export function fmtChartMoneyTick(value: number | string): string {
  return fmtMoney(Number(value));
}

export function fmtChartMoneyTooltip(value: number | string): string {
  return fmtMoney(Number(value));
}

export const chartMoneyYAxisProps = {
  width: CHART_MONEY_Y_AXIS_WIDTH,
  tickMargin: 4,
  tickFormatter: fmtChartMoneyTick,
} as const;

export const chartMoneyXAxisProps = {
  tickFormatter: fmtChartMoneyTick,
  tickMargin: 8,
} as const;

export const chartMoneyMargin = { top: 8, right: 12, left: 4, bottom: 0 } as const;
