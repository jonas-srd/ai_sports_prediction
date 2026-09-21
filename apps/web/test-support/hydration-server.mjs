import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const temp = await mkdtemp(join(tmpdir(), "sports-hydration-"));
const navigation = {
  name: "fixture-navigation",
  setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const useRouter=()=>({refresh(){}}); export const usePathname=()=>'/';", loader: "js" }));
  }
};
const common = { bundle: true, jsx: "automatic", plugins: [navigation], tsconfig: resolve(directory, "../tsconfig.json"), define: { "process.env.NODE_ENV": '"development"' } };
const serverPath = join(temp, "server.cjs");
await build({ ...common, platform: "node", format: "cjs", outfile: serverPath, stdin: {
  resolveDir: directory,
  contents: "import {createElement} from 'react'; import {renderToString} from 'react-dom/server'; import {HydrationFixture} from './hydration-fixture'; export const render=(locale)=>renderToString(createElement(HydrationFixture,{locale}));"
} });
const { render } = await import(pathToFileURL(serverPath).href);
const client = await build({ ...common, platform: "browser", format: "iife", write: false, stdin: {
  resolveDir: directory,
  contents: "import {createElement} from 'react'; import {hydrateRoot} from 'react-dom/client'; import {HydrationFixture} from './hydration-fixture'; window.hydrationErrors=[]; const locale=location.pathname.startsWith('/de')?'de':'en'; hydrateRoot(document.getElementById('root'),createElement(HydrationFixture,{locale}),{onRecoverableError(error,info){window.hydrationErrors.push({message:error.message,stack:info.componentStack});console.error(error.message,info.componentStack)}});"
} });
createServer((request, response) => {
  if (request.url === "/client.js") { response.setHeader("content-type", "text/javascript"); response.end(client.outputFiles[0].text); return; }
  const html = render(request.url?.startsWith("/de") ? "de" : "en");
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(`<!doctype html><html><body><div id="root">${html}</div><script>const q=new URLSearchParams(location.search);localStorage.setItem('ai-sports-prediction:model',q.get('model')||'nexus');localStorage.setItem('ai-sports-prediction-time-zone',q.get('tz')||'UTC');</script><script src="/client.js"></script></body></html>`);
}).listen(3127, "127.0.0.1", () => console.log("Hydration fixture ready: http://127.0.0.1:3127/?model=pulse&tz=Europe%2FBerlin"));
