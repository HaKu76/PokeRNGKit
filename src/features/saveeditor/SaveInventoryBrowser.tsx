import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { BagEdit, BagOperation, BagReport } from "./domain";
import { SaveInventoryBatch } from "./SaveInventoryBatch";
import { SaveInventoryEditor } from "./SaveInventoryEditor";
import { ApricornEditor } from "./ApricornEditor";
import { apricornWords } from "./apricorns";
import { ItemImage } from "./ItemImage";
import type { saveEditorResources } from "./locales";

export function SaveInventoryBrowser({
  busy,
  onRead,
  canEdit,
  onApply,
  onBatch,
}: {
  busy: boolean;
  onRead(): Promise<BagReport | undefined>;
  canEdit: boolean;
  onApply(edit: BagEdit): Promise<void>;
  onBatch(edit: BagOperation): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const [report, setReport] = useState<BagReport>();
  const [apricornDirty, setApricornDirty] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [pouchIndex, setPouchIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number>();
  const request = useRef(0);
  useEffect(() => {
    const lifecycle = request;
    return () => {
      lifecycle.current++;
    };
  }, []);
  const load = async () => {
    const id = ++request.current;
    const value = await onRead();
    if (!value || id !== request.current) return;
    setReport(value);
    setPouchIndex(0);
    setPage(0);
  };
  const pouch = report?.pouches[pouchIndex];
  const query = search.trim().toLocaleLowerCase();
  const items =
    pouch?.items.filter(
      (item) =>
        (showEmpty || item.id !== 0 || item.count !== 0) &&
        (!query ||
          `${item.id} ${item.name[lang]}`.toLocaleLowerCase().includes(query)),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(items.length / 50));
  const currentPage = Math.min(page, pages - 1);
  const name = (type: string) =>
    words.bagPouches[type as keyof typeof words.bagPouches] ?? type;
  return (
    <section className="save-inventory" aria-label={words.inventory}>
      <p className="save-editor-note">{words.inventoryReadNote}</p>
      {!report ? (
        <div className="save-editor-toolbar">
          <button type="button" disabled={busy} onClick={() => void load()}>
            {words.loadInventory}
          </button>
        </div>
      ) : report.pouches.length === 0 ? (
        <p>{words.noInventory}</p>
      ) : (
        <>
          <div className="save-editor-fields">
            <label className="field">
              <span>{words.bagPouch}</span>
              <Select
                value={pouchIndex}
                disabled={busy || apricornDirty}
                onChange={(e) => {
                  setPouchIndex(Number(e.target.value));
                  setPage(0);
                  setSelectedSlot(undefined);
                }}
              >
                {report.apricorns && (
                  <option value={-1}>{apricornWords[lang].title}</option>
                )}
                {report.pouches.map((p) => (
                  <option key={p.index} value={p.index}>
                    {name(p.type)}
                  </option>
                ))}
              </Select>
            </label>
            {pouchIndex !== -1 && (
              <label className="field">
                <span>{words.searchInventory}</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
            )}
          </div>
          {pouchIndex === -1 && report.apricorns ? (
            <ApricornEditor
              items={report.apricorns}
              lang={lang}
              disabled={busy || !canEdit}
              onApply={onBatch}
              onDirty={setApricornDirty}
            />
          ) : (
            <>
              {pouch && (
                <label className="save-inventory-empty">
                  <input
                    type="checkbox"
                    checked={advanced}
                    disabled={busy}
                    onChange={(e) => setAdvanced(e.target.checked)}
                  />
                  {words.bagAdvanced}
                </label>
              )}
              {advanced && (
                <p className="save-editor-note">{words.bagAdvancedNote}</p>
              )}
              {pouch && (
                <SaveInventoryBatch
                  key={`${pouch.index}:${advanced}`}
                  pouch={pouch}
                  advanced={advanced}
                  disabled={busy || !canEdit}
                  onApply={onBatch}
                />
              )}
              <label className="save-inventory-empty">
                <input
                  type="checkbox"
                  checked={showEmpty}
                  onChange={(e) => {
                    setShowEmpty(e.target.checked);
                    setPage(0);
                  }}
                />
                {words.showEmptyInventory}
              </label>
              <div
                className="save-inventory-table"
                tabIndex={0}
                role="region"
                aria-label={words.inventory}
              >
                <table>
                  <caption>
                    {name(pouch!.type)} · {items.length} / {pouch!.items.length}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{words.slot}</th>
                      <th scope="col">{words.bagItem}</th>
                      <th scope="col">{words.bagCount}</th>
                      <th scope="col">{words.bagFlags}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .slice(currentPage * 50, (currentPage + 1) * 50)
                      .map((item) => {
                        const flags = [
                          item.favorite ? words.bagFavorite : "",
                          item.isNew ? words.bagNew : "",
                          item.freeSpace ? words.bagFreeSpace : "",
                          item.newShop ? words.bagNewShop : "",
                          item.held ? words.bagHeld : "",
                          item.freeSpaceIndex !== null
                            ? `${words.bagFreeSpaceIndex}: ${item.freeSpaceIndex}`
                            : "",
                        ].filter(Boolean);
                        const unusual =
                          !item.allowed ||
                          item.count < 0 ||
                          item.count > item.maxCount ||
                          (item.id === 0 && item.count !== 0);
                        return (
                          <tr key={item.slot}>
                            <td>{item.slot + 1}</td>
                            <td>
                              <button
                                className="save-inventory-select"
                                type="button"
                                aria-pressed={selectedSlot === item.slot}
                                disabled={busy}
                                onClick={() => setSelectedSlot(item.slot)}
                              >
                                <ItemImage sprite={item.sprite} />
                                <span>{item.name[lang]}</span>
                              </button>
                              <span className="save-inventory-meta">
                                #{item.id}
                              </span>
                              {unusual && (
                                <span className="save-inventory-warning">
                                  {words.bagUnusual}
                                </span>
                              )}
                            </td>
                            <td>
                              {item.count}
                              <span className="save-inventory-meta">
                                {words.bagMax}: {item.maxCount}
                              </span>
                            </td>
                            <td>{flags.join(" · ") || "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {items.length === 0 && <p>{words.noInventoryResults}</p>}
              {pouch &&
                selectedSlot !== undefined &&
                pouch.items[selectedSlot] && (
                  <SaveInventoryEditor
                    key={`${pouchIndex}:${selectedSlot}:${advanced}`}
                    item={pouch.items[selectedSlot]}
                    pouch={pouch}
                    advanced={advanced}
                    advancedChoices={report.advancedChoices}
                    disabled={busy || !canEdit}
                    onApply={onApply}
                  />
                )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  {words.bagPrevious}
                </button>
                <span aria-live="polite">
                  {currentPage + 1} / {pages}
                </span>
                <button
                  type="button"
                  disabled={currentPage + 1 >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  {words.bagNext}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
