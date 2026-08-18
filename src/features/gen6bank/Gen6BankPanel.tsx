import { useMemo } from "react";
import type { ThreeDsProfile } from "../3dsprofiles/domain";
import { Gen6StationaryPanel } from "../gen6stationary/Gen6StationaryPanel";
import type { Gen6StationaryEngine } from "../gen6stationary/search";
import { Gen6BankUiPreviewEngine } from "./preview/Gen6BankUiPreviewEngine";
import { Gen6BankWorker } from "./worker/Gen6BankWorker";

export function Gen6BankPanel({
  profile,
  uiPreviewMode,
}: {
  profile: ThreeDsProfile | undefined;
  uiPreviewMode: boolean;
}) {
  const engine = useMemo<Gen6StationaryEngine>(
    () =>
      uiPreviewMode ? new Gen6BankUiPreviewEngine() : new Gen6BankWorker(),
    [uiPreviewMode],
  );
  return (
    <Gen6StationaryPanel
      bankOnly
      engineOverride={engine}
      profile={profile}
      uiPreviewMode={uiPreviewMode}
    />
  );
}
