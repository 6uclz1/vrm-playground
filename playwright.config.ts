import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests',timeout:90000,use:{browserName:'chromium',headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH},viewport:{width:1440,height:1080}},workers:1});
