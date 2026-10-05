/**
 * 台股交易成本（教學用）。本專案不談稅：證券交易稅只當作「賣出時的交易成本」。
 * 券商手續費 0.1425% 為公告費率上限（brokerFeeIsCap；買、賣各收一次），實務上常有折扣。
 * dayTradeSellCost：同一天買進又賣出同一檔股票（現股當沖）時，賣出那一次的交易成本 0.15%（一般股票為 0.3%）；
 * 只適用到 dayTradeSellCostUntil（之後依當時規定）。
 */
export const TW_TRADING = {
  brokerFee: 0.001425,
  /** brokerFee 是公告的上限，不是實收費率 */
  brokerFeeIsCap: true,
  etfSellCost: 0.001,
  dayTradeSellCost: 0.0015,
  dayTradeSellCostUntil: '2027-12-31',
  asOf: '2026-10-05',
  source: [
    'https://twse-regulation.twse.com.tw/TW/int/DAT01_print.aspx?FLCODE=FE064320', // 財政部台財證(二)字第10426號函：手續費按成交值千分之1.425計收
    'https://www.twse.com.tw/zh/products/securities/etf/overview/rules.html', // 證交所 ETF 專區：ETF 賣方課徵 0.1%
    'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340078', // 全國法規資料庫，證券交易稅條例第 2-2 條（修正日期 114-01-02）：現股當日沖銷於出賣時千分之一點五，至 116-12-31
  ] as string[],
  verified: { brokerFee: true, etfSellCost: true, dayTradeSellCost: true },
}
