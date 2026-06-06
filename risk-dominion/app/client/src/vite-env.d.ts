/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPACETIMEDB_URI: string;
  readonly VITE_MODULE_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
