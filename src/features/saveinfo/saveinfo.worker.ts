import { browserCryptography } from "./browserCryptography";
import {
  MAX_SAVE_BYTES,
  type SaveInfoRequest,
  type SaveInfoResponse,
  type SaveSummary,
} from "./protocol";

interface SaveInfoExports {
  PokeRNGKit: {
    SaveInfo: {
      Program: {
        ConfigureBrowserCrypto(): void;
        ReadSummary(data: Uint8Array): string;
      };
    };
  };
}

async function readSave({
  base,
  file,
}: SaveInfoRequest): Promise<SaveInfoResponse> {
  if (file.size === 0 || file.size > MAX_SAVE_BYTES) return { status: "size" };

  let reader: SaveInfoExports["PokeRNGKit"]["SaveInfo"]["Program"];
  try {
    const url = new URL("save-info/_framework/dotnet.js", base).href;
    const { dotnet } = await import(/* @vite-ignore */ url);
    const host = await dotnet.withDiagnosticTracing(false).create();
    host.setModuleImports("save-info-crypto", browserCryptography);
    const api: SaveInfoExports = await host.getAssemblyExports(
      host.getConfig().mainAssemblyName,
    );
    reader = api.PokeRNGKit.SaveInfo.Program;
    reader.ConfigureBrowserCrypto();
  } catch {
    return { status: "runtime" };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const summary: SaveSummary | null = JSON.parse(reader.ReadSummary(bytes));
    return summary ? { status: "ready", summary } : { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  }
}

// Leave self.onmessage unset so .NET initializes as a standalone worker.
self.addEventListener(
  "message",
  async (event: MessageEvent<SaveInfoRequest>) => {
    self.postMessage(await readSave(event.data));
  },
  { once: true },
);
