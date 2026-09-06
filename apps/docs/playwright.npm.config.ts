import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests-npm',workers:1,timeout:30000,reporter:[['list']],use:{browserName:'chromium'}});
