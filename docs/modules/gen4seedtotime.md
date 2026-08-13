# Gen 4 Seed to Time

## 范围

`gen4seedtotime` 对应 PokeFinder 4.3.2 `SeedToTime4`，覆盖 DPPt 与 HGSS 的 Seed 到日期时间检索、校准、DPPt 硬币序列、HGSS Elm 电话序列、游走路线和 Roamer Map。时间枚举与游走计算位于独立 C++/Wasm Worker，React 只负责输入、筛选、分页和展示。

## 输入边界

| 输入                 | 上游边界与行为                          | 来源                                                                          |
| -------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| Seed                 | `0..0xFFFFFFFF`，32 位十六进制          | `Form/Gen4/Tools/SeedToTime4.cpp`, `TextBox::setValues(InputType::Seed32Bit)` |
| Year                 | `2000..2099`，4 位十进制                | `Form/Gen4/Tools/SeedToTime4.cpp`                                             |
| forced Second        | `0..59`，2 位十进制；勾选后限制时间枚举 | `Form/Gen4/Tools/SeedToTime4.cpp`                                             |
| Delay calibration    | `0..0xFFFFFFFF`，32 位推进值            | `Form/Gen4/Tools/SeedToTime4.cpp`                                             |
| Second calibration   | `0..500`，3 位十进制                    | `Form/Gen4/Tools/SeedToTime4.cpp`                                             |
| Raikou / Entei route | `0..46`，2 位十进制                     | `Form/Gen4/Tools/SeedToTime4.cpp`                                             |
| Lati route           | `0..28`，2 位十进制                     | `Form/Gen4/Tools/SeedToTime4.cpp`                                             |

校准结果由浏览器 Worker 保护在 `2,000,000` 条以内，避免 `delayCalibration × secondCalibration` 在页面内分配不可控数组；这个限制不改变上游单个校准状态的算法，只是 Web 运行时保护。

## 上游算法来源

- `Core/Gen4/Tools/SeedToTimeCalculator4.cpp/.hpp`
- `Core/Gen4/SeedTime4.cpp/.hpp`
- `Core/Gen4/HGSSRoamer.cpp/.hpp`
- `Core/Util/Utilities.cpp/.hpp` 的 `Utilities4::calcSeed`、`coinFlips`、`getCalls`
- `Form/Gen4/Tools/SeedToTime4.cpp/.ui`
- `Form/Gen4/Tools/SearchCoinFlips.cpp/.ui`
- `Form/Gen4/Tools/SearchCalls.cpp/.ui`
- `Form/Gen4/Tools/RoamerMap.cpp/.ui`
- `Test/Gen4/SeedToTimeCalculator4Test.cpp`
- `Test/Gen4/seedtotime4.json`
- `Form/i18n/PokeFinder_zh.ts` 的 `SeedToTime4` 词条

上游固定来源文件 SHA-256：

```text
260FF7CB9554B13DC7957EB48DF841545BF39D8D22342008831BD32840A86311  Core/Gen4/Tools/SeedToTimeCalculator4.cpp
14BCB7CBE9ABEEA1BE0D29B14002D16D56559EC3A6757544CE226560D9139FB1  Core/Gen4/SeedTime4.cpp
9DE80A23AB9C1ED0ADB588A2742A70C8EA4B4EB3BFD2DB524073A2981F6201C1  Core/Gen4/HGSSRoamer.cpp
0016770D45644DDC5A02349113EA2E170F84BA64A8780A6CEF06F25484B6A290  Form/Gen4/Tools/SeedToTime4.cpp
7D91F734E5CE4020F91B46FBE6BF4F383211BDFB3A23D97488950FEC037A9CC6  Form/Gen4/Tools/SeedToTime4.ui
564510B48A9B24F7AEAEEE314E2725578663000EF6F79D45DA02329542BFFDE7  Test/Gen4/seedtotime4.json
8113600CCB293EABD5D4DAB652C9C323492DAF4F5359548A37207CFDC1BA97CB  Form/Images/roamers.png
```

`roamers.png` 及 Entei/Raikou/Latias/Latios 图像保持上游 GPL-3.0-or-later 归属，作为静态模块资源分发，不通过 CDN 加载。

## Web 接口

Wasm API v1：`gen4seedtotime_generate`、`gen4seedtotime_calibrate`，结果使用固定宽度 `uint32_t` 记录。每项生成结果为 7 个字段（日期、时间、Delay），校准结果为 14 个字段（Seed、日期、时间、Delay、序列、游走路线和跳过次数）。Worker 在复制结果前检查指针、长度、API 版本和结果计数。

建议提交标题：`feat: 新增第四世代Seed查询时间`。
