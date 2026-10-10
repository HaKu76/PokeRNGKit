export const misc5Words = {
  zh: {
    read: "读取杂项",
    records: "记录",
    field: "项目",
    area: "区域",
    slot: "格位",
    gender: "性别",
    male: "雄",
    female: "雌",
    genderless: "无性别",
    exp: "经验值",
    bits32: "32 位记录",
    bits16: "16 位记录",
    current: "当前对战与标记",
    deepest: "最深处",
    areaPrefix: "区域",
    left: "左",
    right: "右",
    center: "中间",
    invalid: "杂项字段、格位、候选或数值无效，请核对输入。",
    stale: "存档或预览已变化，请重新读取并预览。",
    fileSize: "请选择精确 488 字节的 BW fc5 文件。",
    recordNote:
      "32 位记录允许输入到 4294967295，实际保存由 Core 截到 999999999；未修改的旧值保持。",
    subwayNote:
      "标记7修改会同时写标记3；连胜修改保留当前组勾选状态，预览显示实际组数和原始变化。",
    expNote:
      "白侧等级变化会重算双方经验上限，超限旧经验会截顶。黑侧等级单独变化沿用原窗口不立即重算的行为。",
    bulkNote:
      "批量操作先预览。全部配饰会清末字节保留高位；任务解锁沿用来源循环，编号44不会由该操作额外解锁。",
    randomNote:
      "随机全部530格，保留动画，按来源重写种类、形态、性别和招式。预览固定实际结果，确认不会重抽。",
    forestNote:
      "种类变化会选择对应的首个形态与性别候选，预览显示实际保存值。未修改的异常旧值保留。",
    yes: "是",
    no: "否",
    range: "可输入范围",
    saved: "实际保存结果",
    sourceDraws: "冻结来源抽取",
    rawValue: "原始值",
    fcNote: "黑／白的白森林／黑色市完整数据块，可互相导入。原件保持，可撤销。",
  },
  en: {
    read: "Read misc data",
    records: "Records",
    field: "Entry",
    area: "Area",
    slot: "Slot",
    gender: "Gender",
    male: "Male",
    female: "Female",
    genderless: "Genderless",
    exp: "Experience",
    bits32: "32-bit records",
    bits16: "16-bit records",
    current: "Current run and flags",
    deepest: "Deepest",
    areaPrefix: "Area",
    left: "Left",
    right: "Right",
    center: "Center",
    invalid: "Invalid misc fields, slot, choice or value. Check the input.",
    stale: "The save or preview changed. Read and preview it again.",
    fileSize: "Select an exact 488-byte BW fc5 file.",
    recordNote:
      "32-bit records accept up to 4294967295; Core caps storage at 999999999. Unchanged stored values stay intact.",
    subwayNote:
      "Editing Flag7 also writes Flag3. Streak changes preserve the active-run choice; inspect the stored set count and raw changes.",
    expNote:
      "White level changes recalculate both experience limits and cap excessive stored experience. Black level changes alone preserve the original window's delayed recalculation.",
    bulkNote:
      "Preview batch operations. All Props clears reserved high bits in the final byte. Mission unlocking uses the source loop and does not additionally unlock index 44.",
    randomNote:
      "Randomize all 530 slots, preserving animation and rewriting species, form, gender and move using the source rules. Confirmation uses the frozen preview without rerolling.",
    forestNote:
      "Changing species selects its first form and gender choices. Inspect the stored result. Unchanged unusual stored values stay intact.",
    yes: "Yes",
    no: "No",
    range: "Input range",
    saved: "Stored result",
    sourceDraws: "Frozen source draws",
    rawValue: "Raw value",
    fcNote:
      "Complete White Forest / Black City block for Black and White, supporting cross-import. The original stays intact; changes can be undone.",
  },
  ja: {
    read: "各種データを読み込む",
    records: "記録",
    field: "項目",
    area: "エリア",
    slot: "スロット",
    gender: "性別",
    male: "♂",
    female: "♀",
    genderless: "性別不明",
    exp: "経験値",
    bits32: "32ビット記録",
    bits16: "16ビット記録",
    current: "現在の対戦とフラグ",
    deepest: "最奥",
    areaPrefix: "エリア",
    left: "左",
    right: "右",
    center: "中央",
    invalid: "項目、スロット、候補または値が無効です。入力を確認してください。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
    fileSize: "488バイトのBW fc5ファイルを選択してください。",
    recordNote:
      "32ビット記録は4294967295まで入力できますが、Coreは保存値を999999999に制限します。未変更の保存値を維持します。",
    subwayNote:
      "フラグ7の変更はフラグ3も書き換えます。連勝数の変更は現在のセット選択を維持します。保存値と元データの変化を確認してください。",
    expNote:
      "白側レベルの変更は両側の経験値上限を再計算し、超過値を制限します。黒側のみの変更は元の画面の遅延再計算を維持します。",
    bulkNote:
      "一括操作をプレビューで確認してください。全アクセサリーは末尾バイトの予約上位ビットを消去します。ミッション解放は元のループを使い、番号44を追加解放しません。",
    randomNote:
      "全530スロットをランダム化します。動きを維持し、元のルールでポケモン、姿、性別、技を更新します。確定時はプレビューを使い、再抽選しません。",
    forestNote:
      "ポケモン変更時は最初の姿と性別候補を選択します。保存結果を確認してください。未変更の異常な旧値を維持します。",
    yes: "はい",
    no: "いいえ",
    range: "入力範囲",
    saved: "保存結果",
    sourceDraws: "固定した抽選元",
    rawValue: "元の値",
    fcNote:
      "ブラック／ホワイトのホワイトフォレスト／ブラックシティ全データ。相互インポートでき、元ファイルは維持されます。元に戻せます。",
  },
};
