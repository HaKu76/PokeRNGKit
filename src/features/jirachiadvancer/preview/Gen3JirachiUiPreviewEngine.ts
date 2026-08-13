import type { Gen3JirachiRequest } from "../domain";
import type { Gen3JirachiSearchEngine } from "../search";

export class Gen3JirachiUiPreviewEngine implements Gen3JirachiSearchEngine {
  async search(_request: Gen3JirachiRequest) {
    return {
      actions: [1, 0, 1, 2, 3] as (0 | 1 | 2 | 3)[],
      targetAdvances: 53,
      elapsedMs: 0,
      workerCount: 0,
      cancelled: false,
    };
  }
  cancel() {}
  dispose() {}
}
