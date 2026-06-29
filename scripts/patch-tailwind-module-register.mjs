import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = resolve("node_modules/@tailwindcss/node");
const packageJson = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8"),
);

if (packageJson.version !== "4.3.0") {
  process.exit(0);
}

const patches = [
  {
    file: "dist/index.js",
    before:
      'process.versions.bun||_t.register?.((0,Dt.pathToFileURL)(require.resolve("@tailwindcss/node/esm-cache-loader")));',
    after:
      'process.versions.bun||(_t.registerHooks?_t.registerHooks({resolve:(e,r,t)=>{let i=t(e,r);if(_t.isBuiltin(i.url)||!r.parentURL)return i;let o=new URL(r.parentURL).searchParams.get("id");if(o===null)return i;let l=new URL(i.url);return l.searchParams.set("id",o),{...i,url:`${l}`}}}):_t.register?.((0,Dt.pathToFileURL)(require.resolve("@tailwindcss/node/esm-cache-loader"))));',
  },
  {
    file: "dist/index.mjs",
    before:
      'if(!process.versions.bun){let e=fe.createRequire(import.meta.url);fe.register?.(Xr(e.resolve("@tailwindcss/node/esm-cache-loader")))}',
    after:
      'if(!process.versions.bun){let e=fe.createRequire(import.meta.url);fe.registerHooks?fe.registerHooks({resolve:(r,t,i)=>{let o=i(r,t);if(fe.isBuiltin(o.url)||!t.parentURL)return o;let l=new URL(t.parentURL).searchParams.get("id");if(l===null)return o;let n=new URL(o.url);return n.searchParams.set("id",l),{...o,url:`${n}`}}}):fe.register?.(Xr(e.resolve("@tailwindcss/node/esm-cache-loader")))}',
  },
];

for (const patch of patches) {
  const path = resolve(packageRoot, patch.file);
  const source = await readFile(path, "utf8");

  if (source.includes(patch.after)) continue;
  if (!source.includes(patch.before)) {
    throw new Error(`Could not locate Tailwind's module.register call in ${patch.file}`);
  }

  await writeFile(path, source.replace(patch.before, patch.after));
}
