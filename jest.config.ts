import type { Config } from 'jest';
import superJest from 'super-configs/jest';

const config: Config = {
  ...superJest,
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};

export default config;
