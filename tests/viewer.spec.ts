import { test, expect } from '@playwright/test';
const avatar = process.env.VRM_TEST_FILE;
test('empty state and stage controls', async ({page}) => {
 await page.goto('http://127.0.0.1:5173');
 await expect(page.locator('canvas')).toBeVisible();
 const bounds=await page.locator('canvas').boundingBox();expect(bounds?.width).toBe(1440);expect(bounds?.height).toBe(1080);
 await page.locator('#toggle-controls').click();
 await expect(page.locator('[data-motion="stand"]')).toBeDisabled();
 await page.getByRole('button',{name:'ダーク背景'}).click();
 await expect(page.locator('#viewport')).toHaveClass(/dark-stage/);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
test('actual avatar, local-only loading, motions and capture', async ({page}) => {
 test.skip(!avatar, 'Set VRM_TEST_FILE to a local VRM (never committed).');
 const errors:string[]=[]; const external:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:5173'))external.push(r.url());});
 await page.goto('http://127.0.0.1:5173');
 await page.locator('#file').setInputFiles(avatar!);
 await expect(page.locator('#status')).toContainText('読み込み完了',{timeout:60000});
 await page.screenshot({path:'.local/glass-avatar.png'});
 await page.locator('#toggle-controls').click();
 for(const motion of ['idle','walk','wave','tpose','stand']) {await page.locator(`[data-motion="${motion}"]`).click();await page.waitForTimeout(200);}
 await page.locator('[data-motion="tpose"]').click();await expect(page.locator('#arm-angle')).toHaveValue('0');
 await page.locator('#arm-angle').fill('45');await expect(page.locator('#arm-angle-value')).toHaveText('45°');await expect(page.locator('[data-motion="stand"]')).toHaveClass('active');
 await page.locator('#arm-angle').fill('90');await expect(page.locator('#arm-angle-value')).toHaveText('90°');
 await page.locator('#arm-angle').fill('65');
 await page.locator('#pause').click();await expect(page.locator('#pause')).toContainText('再開');
 await page.locator('#pos-x').fill('0.5');await page.locator('#reset-model').click();await expect(page.locator('#pos-x')).toHaveValue('0');
 for(const view of ['face','side','back','full']) await page.locator(`[data-view="${view}"]`).click();
 const download=page.waitForEvent('download');await page.locator('#capture').click();expect((await download).suggestedFilename()).toBe('vrm-playground.png');
 await page.locator('#close-controls').click();
 await page.locator('#toggle-ui').click();await expect(page.locator('.camera-bar')).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.locator('.camera-bar')).toBeVisible();
 await page.screenshot({path:'.local/avatar.png'});
 await page.locator('#file').setInputFiles(avatar!);await expect(page.locator('#status')).toContainText('読み込み完了',{timeout:60000});
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
