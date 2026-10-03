# Plan 3 待辦（Plan 2 審查帶過來的事項）

Plan 3 撰寫前必讀。來源：Plan 2 最終審查（2026-10-03）。

## Plan 3 必做
- `useExplodeKey`：文字輸入元素（input 非 range/button/checkbox/radio、textarea、select、contenteditable）一律不攔截空白鍵；pointer／:focus-visible 判斷只套用在 button 與 a。新增任何文字欄位前必須先修。
- store 新增 `resetSandbox()`：`selectProduct` 對同一商品已改成 no-op，關卡需要明確的重設動作。
- 斜切：`CutSpec` 目前只有 x/y/z，要改成以平面（法向量 + 偏移）定義，連動 `isHidden`、`cutPlanePosition`、`LaserPlane`。
- store 加入關卡／鎖定模式，讓關卡可以停用沙盒控制。
- 決定畫面上多個籃子（第 5 關）是否共用 slice/explode/picked 狀態。
- 標籤：籃子後方或被擋住的 drei Html 標籤要隱藏或淡出；美國大陸標籤在手機與桌機都偏擠。
- 新增 drei Html 一律透過 `useAfterFirstTick`（開發模式 StrictMode 會吞掉第一個 Html）。

## Plan 4
- `frameloop="demand"` 搭配 `invalidate()`；陰影貼圖改為只在版面變動時更新。
- 畫質放進 store，依幀率自動降級。
- 0050 快照改用元大官方數據（目前為 Yahoo 2026-08-01）。

## 可延後（目前資料下無害）
- 配色亮度位移在大量同色持股時可能接近白色；etf/fund 白色底無法往上調亮。
- `?slice=`（空值）解析為 0；最高大樓排序測試只檢查第一棟。
- 720px 斷點在 TS 與 CSS 重複；721–760px 寬度時場景偏小。
