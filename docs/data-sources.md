# 資料來源與查證紀錄（快照 2026-10-03）

查證日皆為 2026-10-03。「查無」表示找不到權威來源（基金公司官網／月報／公開說明書／交易所／台灣主要基金平台），維持原值與 `verified: false`，不使用猜測數字。

個股市值的資料日：台股上櫃／部分上市標的取自 Yahoo 奇摩股市 2026-10-02 收盤；其餘取自 companiesmarketcap.com 2026-10 初的即時頁面（首頁數值會隨時間漂移，與本快照不一定相同）。

| 資產 | 欄位 | 數值 | 狀態 | 來源（資料日） | 查證日 |
|---|---|---|---|---|---|
| QQQ | expenseRatio | 0.18%（原 0.20%，已更正） | 已驗證 | https://www.invesco.com/us/financial-products/etfs/product-detail?audienceType=Investor&ticker=QQQ （Invesco 官網，2026-06-30）；https://www.invesco.com/qqq-etf/en/performance.html | 2026-10-03 |
| QQQ | distribution.frequency | 季配 | 查無（官方） | Invesco 官網產品頁與績效頁皆未載明配息頻率；僅第三方（stockanalysis 等）顯示為季配，不採為已驗證 | 2026-10-03 |
| SPY | expenseRatio | 0.0945% | 已驗證 | https://www.ssga.com/us/en/intermediary/etfs/spdr-sp-500-etf-trust-spy （SSGA 官網） | 2026-10-03 |
| SPY | distribution.frequency | 季配 | 已驗證 | 同上（Distribution Frequency: Quarterly） | 2026-10-03 |
| 0050 | asOf | 2026-08-01 | Yahoo 2026-08-01 資料；元大官方 2026-10-02 數字不同 | 權重為 Yahoo 持股頁 2026-08-01 資料；元大投信 2026-10-02 官網顯示 2330 約 56.31%，日後更新快照時改用元大官方數據 | 2026-10-03 |
| 0050 | expenseRatio 0.14% | 0.14% | 本次未重新查證（verified: false） | 元大官網頁面未顯示費率；沿用原標記 | 2026-10-03 |
| ALLIANZ_TAIWAN | expenseRatio | 1.75%（經理費 1.60% + 保管費 0.15%） | 未驗證（依 2018 公開說明書） | 簡式公開說明書 https://www.fundrich.com.tw/rpt/SmartManual/ALI005_S.pdf （刊印 2018-07-30）；2026-08 月報 https://tw.allianzgi.com/documents/mDDO01 （經理費 1.60%）。含交易稅的實際費用率 106 年度為 2.76%，最新年度總費用率查無 | 2026-10-03 |
| ALLIANZ_TAIWAN | frontLoad | 4%（上限） | 未驗證（依 2018 公開說明書） | 同簡式公開說明書：申購手續費最高不得超過發行價格 4%；現行實收較低、確切數字查無 | 2026-10-03 |
| ALLIANZ_TAIWAN | distribution | 無配息，僅累積 | 未驗證（依 2018 公開說明書） | 說明書「收益分配：無」；2026-08 月報只列 A 新臺幣類股 | 2026-10-03 |
| JH_BALANCED | expenseRatio | 1.88% | 已驗證 | https://www.janushenderson.com/en-hk/investor/product/janus-henderson-balanced-fund/ （A2 USD，2025-12-31） | 2026-10-03 |
| JH_BALANCED | 股債比例 | 股 64.15／債 34.55／現金 1.30（美國版 JANBX） | 查無 | 境外版（Janus Henderson Capital Funds plc）官網只載明股票 35–70%／債券 30–65% 的區間，無實際月報比例；前十大 NVDA 5.86、MSFT 4.46、GOOGL 4.11 與官網 2026-08-31 一致。搜尋：官網 en-hk／en-sg／en-us offshore／zh-hk、Yahoo 持股頁（數值異常不可用） | 2026-10-03 |
| JH_BALANCED | frontLoad（台灣） | — | 查無 | 官網新加坡版 5%、美國離岸版 2%，皆非台灣通路；台灣總代理野村投信投資人須知未找到 | 2026-10-03 |
| JH_BALANCED_BACKLOAD（T2） | distributionFee | — | 查無 | Yahoo 顯示 T2 分銷費 0.01% 但疑為格式錯誤，無法與公開說明書核對。永豐銀行約定條款（2026.05）：駿利亨德森 T 股遞延手續費 3%／2%／1%／0%，但因分銷費查無，不新增資產 | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND | nameEn | Schroder International Selection Fund Global Credit Income | 已驗證 | https://www.schroders.com/zh-tw/tw/individual/funds-and-strategies/global-credit-income/ （台灣官網「施羅德(環)環球收息債券」對應此英文名稱） | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND | 公債／公司債、投資等級／非投資等級比例 | — | 查無 | 台灣官網僅文字描述（政府債／公司債／證券化、投資等級與非投資等級兼具）；香港月報（2026-08-31）https://api.schroders.com/document-store/SISF-Global-Credit-Income-A-Acc-FMR-HKEN.pdf 的圖表文字抽取後無法可靠對應基金與比較指數欄位，故不拆分 `GLOBAL_BOND_MIXED`，也未新增 buckets | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND | expenseRatio | 1.10%（僅管理費） | 部分／總費用率查無 | 同香港月報：管理費 1.10%；台灣總費用率未找到 | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND | frontLoad（台灣） | — | 查無 | 台灣官網僅說明 A 級別為前收，未載明費率；香港月報的 3% 為香港通路，不採用 | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD（U） | asOf | 2026-10-02 | 對齊主級別 | 持股與主級別（SCHRODER_GLOBAL_INCOME_BOND）相同；級別費用資料：2026-06-30 投資人通知 | 2026-10-03 |
| SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD（U） | distribution.frequency | 月配 | 未驗證 | 月配推論自級別名稱『U 月配固定』，級別費用資料：2026-06-30 投資人通知 | 2026-10-03 |
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
| TW_TRADING | brokerFee（券商手續費） | 0.1425%（買、賣各收一次；實務常有折扣） | 已驗證（費率數字） | 財政部 台財證(二)字第10426號函（80-06-28）「按成交值千分之一．四二五計收」，登載於證交所法規知識庫 https://twse-regulation.twse.com.tw/TW/int/DAT01_print.aspx?FLCODE=FE064320 。註：該函釋已於 110-10-01 起不再作為裁罰依據，且為公告費率；是否為現行「法定上限」未能從官方條文確認，教學上僅稱公告費率 | 2026-10-03 |
| TW_TRADING | etfSellCost（ETF 賣出交易成本） | 0.1%（僅賣出時） | 已驗證 | 證交所 ETF 專區「ETF 賣方課徵 0.1%」 https://www.twse.com.tw/zh/products/securities/etf/overview/rules.html ；證券交易稅條例第 2 條（其他經政府核准之有價證券千分之一）。債券型 ETF 依條例第 2-1 條目前停徵，本模擬的 0050 為股票型，不受影響 | 2026-10-03 |
