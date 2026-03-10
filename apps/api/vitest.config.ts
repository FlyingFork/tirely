import { baseVitestConfig } from '@tirely/testing';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  baseVitestConfig,
  defineConfig({
    test: {
      setupFiles: [],
    },
  }),
);
