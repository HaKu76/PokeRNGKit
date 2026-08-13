# Gen 3 Spinda Painter

`gen3spindapainter` 对应 PokeFinder 4.3.2 的 `SpindaPainter`。它通过 PID 与四个斑点位置的双向确定性映射还原晃晃斑斑点，不执行 RNG 搜索，因此不创建 Wasm 或 Worker。

## 范围

- 在第三世代左侧模块导航提供 PokeFinder 的 `Spinda Painter`，简体中文名称逐字复用为 `晃晃斑的斑点`。
- 输入 PID 后将四个斑点定位到 8 像素网格；拖动斑点时保留上游的自由像素移动，PID 按位置除以 8 的截断值回写。方向键为无障碍交互扩展，每次移动 8 像素。
- 显示该 PID 的性格、晃晃斑性别和特性。性别使用 Gen III 晃晃斑 `genderRatio = 127`，特性使用 PID 最低位选择 Personal 数据中的第 1/2 特性槽。
- 不包含斑点随机生成、存档写入、第四世代或后续世代的图案规则。

## 上游映射与边界

PokeFinder 的 `SpindaPainter.cpp` 依次从 PID 的四个字节读取低半字节 `x` 和高半字节 `y`。使用固定偏移 `[(0,0), (24,1), (6,18), (18,19)]` 与原点 `(8,6)`：

```text
x = (xNibble + offsetX + 8) * 8
y = (yNibble + offsetY + 6) * 8
```

反向移动时按相同公式还原四个半字节。`GraphicsPixmapItem` 仅将位置钳制在对应斑点的边界，`updatePID()` 以 `static_cast<u32>(position / 8)` 截断坐标；Web 实现保留这一指针行为。方向键移动使用 8 像素步进，便于无障碍操作。

| 斑点 | X 范围     | Y 范围     | 上游来源                            |
| ---- | ---------- | ---------- | ----------------------------------- |
| 1    | `64..184`  | `48..168`  | `Form/Gen3/Tools/SpindaPainter.cpp` |
| 2    | `256..376` | `56..176`  | `Form/Gen3/Tools/SpindaPainter.cpp` |
| 3    | `112..232` | `192..312` | `Form/Gen3/Tools/SpindaPainter.cpp` |
| 4    | `208..328` | `200..320` | `Form/Gen3/Tools/SpindaPainter.cpp` |

| 控件 | 进制与范围 | 宽度 | 空值 | 上游来源 |
| --- | --- | --- | --- |
| `PID` | 十六进制 `0..0xFFFFFFFF` | 最多 8 位 | `TextBox::getUInt()` 按 `0` 解释；Web 保留临时空输入并用 `0` 更新画布 | `Form/Gen3/Tools/SpindaPainter.cpp`、`Form/Controls/TextBox.cpp` 的 `InputType::Seed32Bit` |

简体中文逐字复用 `PokeFinder_zh.ts` 的 `晃晃斑的斑点`、`PID`、`性格`、`性别` 和 `特性`。PokeFinder 日文 `Spinda Painter` 与 `PID` 对应翻译为 unfinished，因此日文保留英文源标签；共用性格、性别与特性词条沿用当前项目上游表。

## 图像资源

以下 GPL-3.0-or-later 原始资源从 PokeFinder 4.3.2 复制到 `src/features/spindapainter/assets/`，运行时由 Vite 打包并由 PWA 预缓存：

```text
6B9ED70B03879C0FE3FA2BB030DE369D0A7696A84A5CCA37449372DFC209EF40  Form/Images/spinda.png (512x512)
0634A7F4B042C18BBB0CEC75C801EEF389BB7DD6D7E7706CF442DB01702B9421  Form/Images/spinda_spot1.png (96x96)
0B41E98C219980433FBC3719F917E1845D9DB4F62F308ABD87C9599C8A3D689A  Form/Images/spinda_spot2.png (104x104)
107EAD1723336D3E0D5DA32AC001178AEE5DC3060FDAB991111F34D73AEA077F  Form/Images/spinda_spot3.png (56x72)
6BAF4F51D2F3983CFDCCFF8000C9C9203D3493EB08FC50D1460A3FCB7F342F33  Form/Images/spinda_spot4.png (64x72)
```

## 固定夹具与验收

`src/features/spindapainter/domain.test.ts` 覆盖以下映射和输入边界：

- PID `00000000` 对应 `(64,48)`、`(256,56)`、`(112,192)`、`(208,200)`。
- PID `FEDCBA98` 对应 `(128,120)`、`(336,144)`、`(208,296)`、`(320,320)`。
- PID 到位置再到 PID 的往返结果一致。
- 斑点越界拖动会被钳制到各自的上游范围；非网格坐标按上游规则以除以 8 的截断值写入 PID。

2026-08-13 经项目所有者授权，使用外部 Chrome 在 `https://haku76.github.io/PokeRNGKit/` 回归生产 UI：输入 PID `FEDCBA98` 后四个斑点百分比位置对应上游像素坐标 `(128,120)`、`(336,144)`、`(208,296)`、`(320,320)`；第一个斑点按一次右方向键后 PID 更新为 `FEDCBA99`。鼠标拖动、越界钳制、移动端和项目所有者最终验收仍待完成。

## 来源与许可证

- [PokeFinder 4.3.2](https://github.com/Admiral-Fish/PokeFinder)，GPL-3.0-or-later：`Form/Gen3/Tools/SpindaPainter.*`、`Form/Controls/GraphicsPixmapItem.*`、`Form/Controls/TextBox.*`、`Form/Images/spinda*.png`、`Form/i18n/PokeFinder_zh.ts` 与 `Form/i18n/PokeFinder_ja.ts`。
- 精确只读文件 SHA-256 记录在 [UPSTREAM.md](../../third_party/pokefinder/UPSTREAM.md)。
