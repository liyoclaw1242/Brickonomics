/**
 * 台股交易成本（教學用）。本專案不談稅：證券交易稅只當作「賣出時的交易成本」。
 * 券商手續費 0.1425% 為公告費率（上限），實務上常有折扣。
 */
export const TW_TRADING = {
  brokerFee: 0.001425,
  etfSellCost: 0.001,
  asOf: '2026-10-03',
  source: [
    'https://twse-regulation.twse.com.tw/TW/int/DAT01_print.aspx?FLCODE=FE064320', // 財政部台財證(二)字第10426號函：手續費按成交值千分之1.425計收
    'https://www.twse.com.tw/zh/products/securities/etf/overview/rules.html', // 證交所 ETF 專區：ETF 賣方課徵 0.1%
  ] as string[],
  verified: { brokerFee: true, etfSellCost: true },
}
