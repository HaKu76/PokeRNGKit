# KeyBV

`keybv` 实现 3DSRNGTool 公共 `KeyBV` 工具的静态本地版本：读取两份匹配的
第六或第七世代战斗视频文件，按上游 `BVBreaker` 与 `PKX` 规则恢复队伍密钥流，
解密队伍 PKX，并显示每只记录的 Species、TSV 和 TRV。

## 范围

- 支持两份同尺寸战斗视频：Gen VI `0x6E60` 字节，Gen VII `0x6BC0` 字节。
- 第一份文件作为 `Video 1`，第二份文件作为 `Video 2`；上游要求 Video 1
  只有 1 只宝可梦，Video 2 至少有 2 只且第二只来自 Video 1。
- 文件只在浏览器内读取；不上传、不写回原文件，也不生成桌面端
  `BVKey_MyTeam.bin`。结果由右下角悬浮工具菜单中的 `KeyBV` 打开。
- 空队伍、损坏 PKX、尺寸不支持或两份尺寸不一致时拒绝解析。

## 输入限制

| 输入    | 类型/范围                                 | 空值行为   | 来源                                                                      |
| ------- | ----------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| Video 1 | 本地二进制文件，长度 `0x6E60` 或 `0x6BC0` | 不允许     | `3DSRNGTool/Subforms/KeyBV.cs::CheckFile`、`Util/BVBreaker.cs::videosize` |
| Video 2 | 本地二进制文件，必须与 Video 1 长度相同   | 不允许     | `Util/BVBreaker.cs::checkvideo`                                           |
| 版本    | `0x6E60` -> Gen VI；`0x6BC0` -> Gen VII   | 由长度确定 | `Util/BVBreaker.cs::partyoffset`、`videosize`                             |

PKX 采用上游固定 `0x104` 字节 party 记录、`0xE8` 字节 stored 区、Little-endian
字段、LCRNG 加密和四块重排。TSV 为 `(TID ^ SID) >> 4`，TRV 为
`(TID ^ SID) & 0xF`；界面沿用上游四位十进制 TSV 和一位大写十六进制 TRV 显示。

## 来源与许可证

- 主要来源：`C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN`
- 核验 revision：`359bdd7a9ff7c145fec12302cf43da932923fa62`
- 算法文件：`3DSRNGTool/Util/BVBreaker.cs`、`3DSRNGTool/Pokemon/PKX.cs`、
  `3DSRNGTool/Subforms/KeyBV.cs`
- 上游项目许可证：MIT，版权归 `wwwwwwzx` 及贡献者所有；完整来源记录见
  [`third_party/3dsrngtool/UPSTREAM.md`](../../third_party/3dsrngtool/UPSTREAM.md)。

PokeRNGKit 仅移植确定性二进制解析和解密规则，不复制 WinForms 窗体代码；MIT
声明与 GPL-3.0-or-later 项目许可证继续按仓库法律文件分发。

## 验证

- `src/features/keybv/domain.test.ts` 使用合成的加密 party PKX 覆盖 Gen VI、Gen VII
  偏移、尺寸检查、空结果和 TSV/TRV 格式。
- 浏览器文件选择与拖放只传递 `File.arrayBuffer()` 到本地解析函数；没有网络请求或
  持久化副作用。
