import { GEN6_BANK_API_VERSION, validateGen6BankRequest } from "../domain";
import { Gen6StationaryWorker } from "../../gen6stationary/worker/Gen6StationaryWorker";

export class Gen6BankWorker extends Gen6StationaryWorker {
  constructor() {
    super({
      moduleId: "gen6bank",
      moduleFile: "gen6bank",
      workerName: "pokerngkit-gen6bank-1",
    });
  }
  override async search(...args: Parameters<Gen6StationaryWorker["search"]>) {
    validateGen6BankRequest(args[0]);
    return super.search(...args);
  }
}

export { GEN6_BANK_API_VERSION };
