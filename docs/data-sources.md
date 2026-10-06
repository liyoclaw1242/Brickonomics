# 資料來源與查證紀錄（快照 2026-10-03）

查證日皆為 2026-10-03。「查無」表示找不到權威來源（基金公司官網／月報／公開說明書／交易所／台灣主要基金平台），維持原值與 `verified: false`，不使用猜測數字。

個股市值的資料日：台股上櫃／部分上市標的取自 Yahoo 奇摩股市 2026-10-02 收盤；其餘取自 companiesmarketcap.com 2026-10 初的即時頁面（首頁數值會隨時間漂移，與本快照不一定相同）。

| 資產 | 欄位 | 數值 | 狀態 | 來源（資料日） | 查證日 |
|---|---|---|---|---|---|
| QQQ | expenseRatio | 0.18%（原 0.20%，已更正） | 已驗證 | https://www.invesco.com/us/financial-products/etfs/product-detail?audienceType=Investor&ticker=QQQ （Invesco 官網，2026-06-30）；https://www.invesco.com/qqq-etf/en/performance.html | 2026-10-03 |
| QQQ | distribution.frequency | 季配 | 已驗證 | SEC Form 485BPOS 公開說明書（2025-12-22）https://www.sec.gov/Archives/edgar/data/1067839/000110465925123273/tm2529177d1_485bpos.htm 「declared and paid quarterly」；後續兩份補充（2026-04-30、2026-06-10）未改配息政策 | 2026-10-04 |
| SPY | expenseRatio | 0.0945% | 已驗證 | https://www.ssga.com/us/en/intermediary/etfs/spdr-sp-500-etf-trust-spy （SSGA 官網） | 2026-10-03 |
| SPY | distribution.frequency | 季配 | 已驗證 | 同上（Distribution Frequency: Quarterly） | 2026-10-03 |
| 0050 | holdings / asOf | 2330 56.31、2454 6.71、2308 3.35、2317 2.82、其餘 30.81；asOf 2026-10-02 | 已驗證（元大官方） | https://www.yuantaetfs.com/product/detail/0050/ratio （元大投信官網，頁面交易日期 2026/10/02）；其餘 = 100 − 前四大合計 | 2026-10-03 |
| 0050 | expenseRatio | 0.14%（≈0.136%，各項相加） | 已驗證（所載各項之和） | 簡式公開說明書（刊印 115 年 7 月 29 日）https://www.yuantafunds.com/fund/download/1066台灣卓越50-簡式公開說明書.pdf ：經理費級距（1,000 億以下 0.15%、1,000–5,000 億 0.10%、5,000 億–1 兆 0.08%）約 0.069%、保管費約 0.027%、指數授權費 0.04%；以月報（2026-08-31）規模 23,841.23 億元換算 https://www.yuantafunds.com/fund/download/1066元大台灣卓越50基金月報.pdf ；官網經理費約 0.0680%（2026-10-02）https://www.yuantaetfs.com/product/detail/0050/Basic_information 。不含交易成本（年度費用率 2025 為 0.22%，含交易成本，不採用）。規模越大費率越低 | 2026-10-04 |
| ALLIANZ_TAIWAN | expenseRatio | 1.75%（A 類型經理費 1.6% + 保管費 0.15%） | 已驗證 | 安聯投信公開說明書（刊印 2026 年 7 月，V20260731）https://tw.allianzgi.com/documents/DDO01 ；2026-08 月報 https://tw.allianzgi.com/documents/mDDO01 （經理費 1.60%）。僅契約固定費用，不含交易成本（說明書「最近五年度費用率」114 年 2.63% 含交易成本，不採用） | 2026-10-04 |
| ALLIANZ_TAIWAN | frontLoad | 4%（上限） | 已驗證（上限） | 同公開說明書：申購手續費最高不得超過發行價格 4%，現行實收由經理公司訂、較低 | 2026-10-04 |
| ALLIANZ_TAIWAN | distribution | 無配息，僅累積 | 已驗證 | 同公開說明書：「收益全部併入本基金資產，不予分配」 | 2026-10-04 |
| JH_BALANCED | expenseRatio | 1.88% | 已驗證 | https://www.janushenderson.com/en-hk/investor/product/janus-henderson-balanced-fund/ （A2 USD，2025-12-31） | 2026-10-03 |
| JH_BALANCED | holdings | OTHER_US_STOCK 38.32、US_TREASURY 7.00、BOND_MIXED_US 26.86、CASH 2.06，加前八大個股 25.76 | 已驗證 | https://www.janushenderson.com/en-hk/investor/product/janus-henderson-balanced-fund/ （境外 IIC 版，Sector Allocation 與 Top Holdings，2026-08-31）：股票 64.08、債券 33.86、現金與其他 2.06；OTHER_US_STOCK = 64.08 − 25.76；US_TREASURY = 官網 Treasuries 全部 7.00；BOND_MIXED_US = 33.86 − 7.00。股票假設皆為美股（未核對 Region 分頁）。取代原本的美國版 JANBX 代用 | 2026-10-04 |
| JH_BALANCED | frontLoad（台灣） | — | 查無 | 官網新加坡版 5%、美國離岸版 2%，皆非台灣通路；台灣總代理野村投信投資人須知未找到 | 2026-10-03 |
| JH_BALANCED_BACKLOAD（T2） | distributionFee | — | 查無 | Yahoo 顯示 T2 分銷費 0.01% 但疑為格式錯誤，無法與公開說明書核對。永豐銀行約定條款（2026.05）：駿利亨德森 T 股遞延手續費 3%／2%／1%／0%，但因分銷費查無，不新增資產 | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND | nameEn | Schroder International Selection Fund Global Credit Income | 已驗證 | https://www.schroders.com/zh-tw/tw/individual/funds-and-strategies/global-credit-income/ （台灣官網「施羅德(環)環球收息債券」對應此英文名稱） | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND | holdings | GLOBAL_BOND_MIXED 97.3 + CASH 2.7 | 已驗證 | 台灣中文月報 https://api.schroders.com/document-store/SISF-Global-Credit-Income-A-Acc-FMR-TWZH.pdf 與香港月報 https://api.schroders.com/document-store/SISF-Global-Credit-Income-A-Acc-FMR-HKEN.pdf （2026-08-31）：現金與衍生工具 2.7（名目基礎），其餘為債券。公債／公司債、投資等級／非投資等級是兩個獨立維度、無交叉表，不拆 GLOBAL_BOND_MIXED | 2026-10-04 |
| SCHRODER_GLOBAL_INCOME_BOND | expenseRatio | 1.38%（原 1.10%，僅管理費） | 已驗證 | SISF 半年報 TER 表（截至 2026-06-30）https://api.schroders.com/document-store/SISF-SAR-LUEN.pdf ：Class A Acc／A Dis 1.38%；年報 FY2025 同為 1.38%。管理費 1.10% 為其中一部分 | 2026-10-04 |
| SCHRODER_GLOBAL_INCOME_BOND | frontLoad（台灣） | — | 查無 | 台灣官網僅說明 A 級別為前收，未載明費率；香港月報的 3% 為香港通路，不採用 | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD（U） | asOf / holdings | 2026-08-31；與 A 級別相同（GLOBAL_BOND_MIXED 97.3 + CASH 2.7） | 已驗證 | 台灣中文月報（U 月配固定）https://api.schroders.com/document-store/SISF-Global-Credit-Income-U-Dis-FMR-TWZH.pdf ，資產配置與 A 級別一致 | 2026-10-04 |
| SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD（U） | distribution.frequency | 月配 | 已驗證 | 同 U 級別台灣月報：配息政策「固定」、配息頻率「每月」 | 2026-10-04 |
| SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD（U） | expenseRatio | 1.38%（原 1.10%） | 已驗證（所載數字之差） | 同半年報 https://api.schroders.com/document-store/SISF-SAR-LUEN.pdf ：Class U Dis TER 2.38%（FY2025 2.39%），台灣月報分銷費 1.00%。2.38% − 1.00% = 1.38%，兩者皆為文件所載；分銷費另放 distributionFee，所以 expenseRatio 不含分銷費；結果與 A 級別 TER 1.38% 吻合 | 2026-10-04 |
| SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD（U） | distributionFee、cdsc | 1.00%／年；3%、2%、1%（第 1、2、3 年），滿 3 年 0%；滿 3 年後自動轉 A 級別，分銷費停止（distributionFeeYears: 3） | 已驗證（新增資產） | 施羅德環球基金系列投資人須知【第二部分】 https://api.schroders.com/document-store/SISF-FS-TWZH.pdf （2026-06-30 更新，系列通則）；永豐銀行後收型基金約定條款（2026.05）同為 3/2/1/0，施羅德 U 股；台灣有「環球收息債券(美元) U-月配固定」級別 | 2026-10-03 |
| ALLIANZ_INCOME_GROWTH | 三大類對應 | 可轉債 32.0%、高收益債 30.4%、股票 31.9%、現金 5.7% | 已驗證 | 安聯 GI 新加坡 https://sg.allianzgi.com/documents/sg-allianz-income-and-growth-leaflet-en （2026-06-30），與快照 CONVERTIBLE_US 31.98／US_HIGH_YIELD 30.4／股票 31.91／CASH 5.71 一致 | 2026-10-03 |
| ALLIANZ_INCOME_GROWTH | expenseRatio | 1.56% | 已驗證 | 同上（TER 1.56%，2026-06-30） | 2026-10-03 |
| ALLIANZ_INCOME_GROWTH | frontLoad（台灣） | 3%（書面）／1.5%（網路） | 查無（資料過期，未採用） | https://tw.allianzgi.com/-/media/allianzgi/ap/taiwan/pdf/trading-info/offshore-rate.pdf 更新日 2021-01-20；新加坡版上限 5% 非台灣 | 2026-10-03 |
| ALLIANZ_INCOME_GROWTH_BACKLOAD（BM） | distributionFee、cdsc | — | 查無 | 安聯投信「境外基金配息類股規格一覽表」（2025-12-31）載明 B 類後收需支付最高每年 1% 分銷費（為上限，且含於單一行政管理費）；CDSC 級距只在永豐銀行平台文件（安聯 B 股 3/2/1）出現，無安聯官方具體級別數字，故不新增資產 | 2026-10-03 |
| 2330 | marketCapUsdB | 2452 | 已驗證 | https://companiesmarketcap.com/taiwan/largest-companies-in-taiwan-by-market-cap/（市值為 companiesmarketcap.com 以 USD 計價之數字（網站自行換算台股，未標示匯率），頁面為 2026-10 初即時資料，查證日 2026-10-03；非交易所原始新台幣市值） | 2026-10-03 |
| 2454 | marketCapUsdB | 248.4 | 已驗證 | https://companiesmarketcap.com/taiwan/largest-companies-in-taiwan-by-market-cap/（市值為 companiesmarketcap.com 以 USD 計價之數字（網站自行換算台股，未標示匯率），頁面為 2026-10 初即時資料，查證日 2026-10-03；非交易所原始新台幣市值） | 2026-10-03 |
| 2308 | marketCapUsdB | 153.8 | 已驗證 | https://companiesmarketcap.com/taiwan/largest-companies-in-taiwan-by-market-cap/（市值為 companiesmarketcap.com 以 USD 計價之數字（網站自行換算台股，未標示匯率），頁面為 2026-10 初即時資料，查證日 2026-10-03；非交易所原始新台幣市值） | 2026-10-03 |
| 2317 | marketCapUsdB | 110.5 | 已驗證 | https://companiesmarketcap.com/taiwan/largest-companies-in-taiwan-by-market-cap/（市值為 companiesmarketcap.com 以 USD 計價之數字（網站自行換算台股，未標示匯率），頁面為 2026-10 初即時資料，查證日 2026-10-03；非交易所原始新台幣市值） | 2026-10-03 |
| 6223 | marketCapUsdB | 16.3 | 已驗證 | https://tw.stock.yahoo.com/quote/6223.TWO/profile（市值 NT$520.28 十億（Yahoo 奇摩股市，資料日 2026/10/02 收盤）；匯率 1 USD = 31.895346 TWD（x-rates 2026-10 月前 3 日平均，https://www.x-rates.com/average/?from=USD&to=TWD&amount=1&year=2026）；換算 USD 16.3 十億） | 2026-10-03 |
| 3017 | marketCapUsdB | 42.3 | 已驗證 | https://tw.stock.yahoo.com/quote/3017.TW/profile（市值 NT$1,350.35 十億（Yahoo 奇摩股市，資料日 2026/10/02 收盤）；匯率 1 USD = 31.895346 TWD（x-rates 2026-10 月前 3 日平均，https://www.x-rates.com/average/?from=USD&to=TWD&amount=1&year=2026）；換算 USD 42.3 十億） | 2026-10-03 |
| 5274 | marketCapUsdB | 24.6 | 已驗證 | https://tw.stock.yahoo.com/quote/5274.TWO/profile（市值 NT$783.42 十億（Yahoo 奇摩股市，資料日 2026/10/02 收盤）；匯率 1 USD = 31.895346 TWD（x-rates 2026-10 月前 3 日平均，https://www.x-rates.com/average/?from=USD&to=TWD&amount=1&year=2026）；換算 USD 24.6 十億） | 2026-10-03 |
| 3037 | marketCapUsdB | 67.2 | 已驗證 | https://companiesmarketcap.com/taiwan/largest-companies-in-taiwan-by-market-cap/（市值為 companiesmarketcap.com 以 USD 計價之數字（網站自行換算台股，未標示匯率），頁面為 2026-10 初即時資料，查證日 2026-10-03；非交易所原始新台幣市值） | 2026-10-03 |
| 8046 | marketCapUsdB | 29.6 | 已驗證 | https://companiesmarketcap.com/taiwan/largest-companies-in-taiwan-by-market-cap/（市值為 companiesmarketcap.com 以 USD 計價之數字（網站自行換算台股，未標示匯率），頁面為 2026-10 初即時資料，查證日 2026-10-03；非交易所原始新台幣市值） | 2026-10-03 |
| 6669 | marketCapUsdB | 36.4 | 已驗證 | https://companiesmarketcap.com/taiwan/largest-companies-in-taiwan-by-market-cap/（市值為 companiesmarketcap.com 以 USD 計價之數字（網站自行換算台股，未標示匯率），頁面為 2026-10 初即時資料，查證日 2026-10-03；非交易所原始新台幣市值） | 2026-10-03 |
| 3443 | marketCapUsdB | 33.3 | 已驗證 | https://companiesmarketcap.com/taiwan/largest-companies-in-taiwan-by-market-cap/（市值為 companiesmarketcap.com 以 USD 計價之數字（網站自行換算台股，未標示匯率），頁面為 2026-10 初即時資料，查證日 2026-10-03；非交易所原始新台幣市值） | 2026-10-03 |
| 6274 | marketCapUsdB | 15.2 | 已驗證 | https://tw.stock.yahoo.com/quote/6274.TWO/profile（市值 NT$485.12 十億（Yahoo 奇摩股市，資料日 2026/10/02 收盤）；匯率 1 USD = 31.895346 TWD（x-rates 2026-10 月前 3 日平均，https://www.x-rates.com/average/?from=USD&to=TWD&amount=1&year=2026）；換算 USD 15.2 十億） | 2026-10-03 |
| 3189 | marketCapUsdB | 17.3 | 已驗證 | https://tw.stock.yahoo.com/quote/3189.TW/profile（市值 NT$553.26 十億（Yahoo 奇摩股市，資料日 2026/10/02 收盤）；匯率 1 USD = 31.895346 TWD（x-rates 2026-10 月前 3 日平均，https://www.x-rates.com/average/?from=USD&to=TWD&amount=1&year=2026）；換算 USD 17.3 十億） | 2026-10-03 |
| NVDA | marketCapUsdB | 5649 | 已驗證 | https://companiesmarketcap.com/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| TSLA | marketCapUsdB | 1463 | 已驗證 | https://companiesmarketcap.com/tesla/marketcap/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| AAPL | marketCapUsdB | 4869 | 已驗證 | https://companiesmarketcap.com/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| MSFT | marketCapUsdB | 3842 | 已驗證 | https://companiesmarketcap.com/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| MU | marketCapUsdB | 1213 | 已驗證 | https://companiesmarketcap.com/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| GOOGL | marketCapUsdB | 4162 | 已驗證 | https://companiesmarketcap.com/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| AMZN | marketCapUsdB | 2712 | 已驗證 | https://companiesmarketcap.com/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| AVGO | marketCapUsdB | 1695 | 已驗證 | https://companiesmarketcap.com/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| JPM | marketCapUsdB | 883.5 | 已驗證 | https://companiesmarketcap.com/（市值資料日 2026-10 初（companiesmarketcap.com 即時頁面，查證日 2026-10-03；頁面未標示確切時間）） | 2026-10-03 |
| TW_TRADING | brokerFee（券商手續費） | 0.1425%（公告費率，brokerFeeIsPosted：實收常打折；買、賣各收一次；畫面稱「公告費率」，不稱上限） | 已驗證（費率數字） | 財政部 台財證(二)字第10426號函（80-06-28）「按成交值千分之一．四二五計收」，登載於證交所法規知識庫 https://twse-regulation.twse.com.tw/TW/int/DAT01_print.aspx?FLCODE=FE064320 。註：該函釋已於 110-10-01 起不再作為裁罰依據，且為公告費率；是否為現行「法定上限」未能從官方條文確認，教學上僅稱公告費率 | 2026-10-03 |
| TW_TRADING | etfSellCost（ETF 賣出交易成本） | 0.1%（僅賣出時） | 已驗證 | 證交所 ETF 專區「ETF 賣方課徵 0.1%」 https://www.twse.com.tw/zh/products/securities/etf/overview/rules.html ；證券交易稅條例第 2 條（其他經政府核准之有價證券千分之一）。債券型 ETF 依條例第 2-1 條目前停徵，本模擬的 0050 為股票型，不受影響 | 2026-10-03 |
| TW_TRADING | dayTradeSellCost（現股當沖賣出交易成本） | 0.15%（僅賣出那一次；同一帳戶同一營業日買進又賣出同種類同數量的上市櫃股票；一般賣出為 0.3%）；適用至 2027-12-31（dayTradeSellCostUntil） | 已驗證 | 全國法規資料庫（法務部）證券交易稅條例第 2-2 條，修正日期民國 114 年 01 月 02 日 https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340078 ：「自中華民國一百零六年四月二十八日起至一百十六年十二月三十一日止同一證券商受託買賣……同一帳戶於同一營業日現款買進與現券賣出同種類同數量之上市或上櫃股票，於出賣時，按每次交易成交價格依千分之一點五……」。畫面上只稱「交易成本」 | 2026-10-05 |
| DAY_TRADE_RESEARCH | reliablyProfitable（能穩定賺錢的當沖客） | 不到 1%（「可預期、穩定地」在扣掉交易成本後賺到正的異常報酬；不是「當年有賺的人」）；樣本：台灣證交所 1992–2006 全部當沖 | 已驗證 | Barber, B. M., Lee, Y.-T., Liu, Y.-J., & Odean, T. (2014). The cross-section of speculator skill: Evidence from day trading. *Journal of Financial Markets*, 18, 1–24. https://doi.org/10.1016/j.finmar.2013.05.006 ；期刊版摘要（經 RePEc 逐字取得 https://ideas.repec.org/a/eee/finmar/v18y2014icp1-24.html ）：「Less than 1% of the day trader population is able to predictably and reliably earn positive abnormal returns net of fees.」論文的 net of fees 含交易稅，畫面只寫「扣掉交易成本後」。工作論文（2011）的 13%／15%、每年約 36 萬人未見於期刊版 → 未驗證、不使用 | 2026-10-05 |
| DAY_TRADE_RESEARCH | likelyToLose（未來可能賠錢的當沖客） | 97%（「可能賠錢」，不是「已經賠錢」） | 已驗證（樣本期間未驗證） | Barber, B. M., Lee, Y.-T., Liu, Y.-J., Odean, T., & Zhang, K. (2020). Learning, fast or slow. *The Review of Asset Pricing Studies*, 10(1), 61–93. https://doi.org/10.1093/rapstu/raz006 ；期刊版摘要（https://academic.oup.com/raps/article/10/1/61/5551349 ）：「97% of day traders are likely to lose money in future day trading.」摘要只寫「day traders in Taiwan」，1992–2006 來自工作論文（sampleVerified: false）。「75% 兩年內退場」只在 2017 工作論文 → 未驗證、不使用 | 2026-10-05 |

## 規則：所載各項的和或差

總數若沒有任何文件直接寫出，但每一個組成項目都有官方出處，則可以用「所載各項的和或差」得到數值並標記已驗證，條件是：
- 每個運算元都有官方出處與資料日，並寫在該資產的 notes（含算式）；
- 只加總（或扣除）契約固定費用；交易成本、交易稅不計入；
- 費用不可重複計算：分銷費放 `distributionFee`，`expenseRatio` 不含分銷費。

目前用到的地方：
- 0050 expenseRatio：經理費約 0.069% + 保管費約 0.027% + 指數授權費 0.04% ≈ 0.136%，取 0.14%（和）。
- ALLIANZ_TAIWAN expenseRatio：經理費 1.6% + 保管費 0.15% = 1.75%（和）。
- SCHRODER U 級別 expenseRatio：TER 2.38% − 分銷費 1.00% = 1.38%（差）。

## 實戰課：基金體檢快照（`src/data/snapshot/practice/JFZN3.json`）

摩根投資基金－多重收益基金 (美元對沖) A 股（穩定月配），ISIN LU2347655073。研究日 2026-10-06。schema 在 `src/data/fundCheckup.ts`（zod，載入時驗證）；每個欄位都有 `source`（網址、文件、資料日）與 `verified`。數字一律由 `src/sim/checkup.ts` 從快照計算。**只用一手來源**（J.P. Morgan 資產管理的月報、投資人須知、KID、官網配息組成表與產品頁資料）；第三方基金網站不引用、不作為出處。

| 來源 | 文件 | 資料日 |
|---|---|---|
| 台灣月報 | 摩根投資基金-多重收益基金 A股 基金月報（美元對沖穩定月配）https://am.jpmorgan.com/content/dam/jpm-am-aem/asiapacific/tw/zh/literature/fact-sheet/01-0z.pdf | 2026-08-31 |
| 盧森堡月報 | J.P. Morgan AM Factsheet, JPM Global Income A (icdiv) - USD (hedged)（am.jpmorgan.com/lu 產品頁連結）https://jp.techrules.com/rebrandingPDF/LoadPdf.aspx?ShareClassId=14634&country=LU&lang=EN&paramMIFID=YES | 2026-08-31 |
| KID | PRIIPs KID, LU2347655073 https://wl.fundsquare.net/serv/down-doc/request?cdClient=jpmorgan&isin=LU2347655073&docTypeCode=KIDD&docLang=EN&docCountry=LU | 2026-04-27 |
| 投資人須知 | 摩根投資基金–多重收益基金 投資人須知【第一部分】https://am.jpmorgan.com/content/dam/jpm-am-aem/asiapacific/tw/zh/regulatory/investor-disclosure-document/mk01-0z.pdf | 刊印 115-07-31 |
| 配息組成表 | 摩根資產管理旗下基金配息組成表（境外基金）https://am.jpmorgan.com/tw/zh/asset-management/per/funds/announcements/dividend-distributions/ | 2026-09-30 |
| 產品頁資料 | 摩根台灣官網產品頁（FundsMarketingHandler/historicalData：歷史淨值、配息紀錄）https://am.jpmorgan.com/tw/zh/asset-management/per/products/jpm-global-income-a-icdiv-usd-hedged-lu2347655073 | 淨值到 2026-10-05 |

做法與決定：
- **規模**：22,185.5 百萬美元是**整檔基金**（所有級別合計，2026-08-31），不是這個級別；畫面寫「整檔基金規模」。
- **風險**：台灣 RR3；KID 的 SRI 3/7。產品頁資料的 `srriValue` 寫 4，和 KID 衝突，不用。
- **費用**：經理費 1.25%＋保管費（行政管理費）0.20%（上限）＝ 1.45%，和 KID 的每年持續費用 1.45% 一致；畫面的「每年先扣」用 1.45%。KID 的交易成本 0.22% 另外列（多說一點），不加進去。最高申購手續費 5%，實際看通路（✎）。
- **資產三大類**（`sim/checkup` 的 `ASSET_GROUP_OF`）：股票（環球、歐洲、新興市場股票，含美國股票掩護性買權）49.7%；借據與特別股（美國／歐洲非投資等級債、新興市場債、非機構證券、投資等級信貸、短期固定收益、特別股）44.4%；現金 5.8%；各項之和 99.9%（四捨五入）。不是股票＝ 50.2%，超過一半。特別股若算股票，股票是 54.6%，結論就相反——課文寫出用哪種分法。
- **近 12 個月**：月底淨值 74.99（2025-09-30）→ 72.87（2026-09-30），變化 −2.12；12 次配息合計 8.254（各項之和）。2025-12-31 的 74.68 來自同一產品的盧森堡站資料（台灣站沒有 12-31 這一列）。
- **年化配息率** 11.70%（2026-09-08 那次）是配出去的比例，不是報酬；畫面不把它當報酬。
- **配息組成**：台灣的表把每次配息標在基準日的前一個月（標「2026年08月 0.6850」＝基準日 2026-09-08）；`payoutSources` 以「下個月＋金額相同」對到配息紀錄，金額不同就丟錯。2025-10 到 2026-01 的 4 次全是可分配淨利益；2026-02-09 起每次 56–76% 是本金。這一年跨過財務年度，不算整年平均。
- **曆年報酬 vs 基金自己的指標**（盧森堡月報，美元、含配息再投入）：2022 −11.93 vs −13.16；2023 8.35 vs 16.14；2024 8.16 vs 11.89；2025 10.90 vs 11.89。指標＝40% Bloomberg US High Yield 2% Issuer Cap / 35% MSCI World / 25% Bloomberg Global Credit（皆避險至美元）。月報註明這檔「不以贏過指標為目標」。
- **掩護性買權**：月報只寫名稱與 9.6%，沒有一句說明；說明欄位是 null（未查證），課程用 x-cc 的示意舞台講觀念。
