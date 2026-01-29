import log from "../services/log.service";
import StatusOfStep from "../enums/status-of.step";
import { Page } from "playwright";
import type { PlaywrightDriver } from "../../playwright/playwright";

const RETRY_NUMBERS = 10;

export async function captureScreenshotPlaywright(playwrightDriver: PlaywrightDriver) {
    const context = playwrightDriver.getContext();
    const pages = context.pages();
    if (!pages.length) return undefined;

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if ((pages.length - 1) == i || pages.length == 1) {
            let count = 0;
            while (count <= RETRY_NUMBERS) {
                try {
                    const lastPage = pages[pages.length - 1] || playwrightDriver.defaultPage;
                    const screenshotBuffer = await lastPage.screenshot({
                        type: 'png'
                    });
                    if (Buffer.isBuffer(screenshotBuffer))
                        return screenshotBuffer;
                } catch (e: any) {
                    if (count == RETRY_NUMBERS) {
                        log.push('When', log.tag, e.toString(), StatusOfStep.FAILED);
                        return undefined;
                    }
                }
                count++;
            }
        } else {
            let count = 0;
            while (count <= RETRY_NUMBERS) {
                try {
                    const screenshotBuffer = await page.screenshot({
                        type: 'png'
                    });
                    if (Buffer.isBuffer(screenshotBuffer)) {
                        log.push("When", log.tag, `${i} Image`, StatusOfStep.FAILED, screenshotBuffer);
                        break;
                    }
                } catch (e: any) {
                    if (count == RETRY_NUMBERS) {
                        log.push('When', log.tag, e.toString(), StatusOfStep.FAILED);
                        return undefined;
                    }
                }
                count++;
            }
        }
    }
    return undefined;
}

export async function captureScreenshotPagePlaywright(page: Page) {
    let count = 0;
    while (count <= RETRY_NUMBERS) {
        try {
            log.push('When', log.tag, `Before the screenshot`, StatusOfStep.PASSED);
            const screenshotBuffer = await page.screenshot({
                fullPage: true,
                type: 'png'
            });
            if (Buffer.isBuffer(screenshotBuffer))
                return screenshotBuffer;
        } catch (e: any) {
            if (count == RETRY_NUMBERS) {
                log.push('When', log.tag, e.toString(), StatusOfStep.FAILED);
                return undefined;
            }
        }
        count++;
    }
    return undefined;
}
