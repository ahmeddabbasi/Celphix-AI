/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_MODE?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_DEV_MOCK_DELAY?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
