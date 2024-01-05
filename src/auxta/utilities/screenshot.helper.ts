import puppeteer from "../../puppeteer/puppeteer";
import log from "../services/log.service";
import StatusOfStep from "../enums/status-of.step";
import {Page} from "puppeteer";


const RETRY_NUMBERS = 10

export async function captureScreenshot() {
    const pages = await puppeteer.defaultPage.browser().pages();
    if (!pages.length) return undefined;
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if ((pages.length - 1) == i) {
            let count = 0
            while (count <= RETRY_NUMBERS) {
                try {
                    const lastPage = pages[pages.length - 1] || puppeteer.defaultPage;
                    const screenshotBuffer = await lastPage.screenshot({
                            captureBeyondViewport: false,
                            encoding: 'binary'
                        }
                    );
                    if (Buffer.isBuffer(screenshotBuffer))
                        return screenshotBuffer;
                } catch (e: any) {
                    if (count == RETRY_NUMBERS) {
                        log.push('When', e.toString(), StatusOfStep.FAILED);
                        return undefined
                    }
                }
                count++;
            }
        } else {
            let count = 0
            while (count <= RETRY_NUMBERS) {
                try {
                    const screenshotBuffer = await page.screenshot({
                            captureBeyondViewport: false,
                            encoding: 'binary'
                        }
                    );
                    if (Buffer.isBuffer(screenshotBuffer))
                        log.push("When", `${i} Image`, StatusOfStep.FAILED, screenshotBuffer.toString("base64"))
                } catch (e: any) {
                    if (count == RETRY_NUMBERS) {
                        log.push('When', e.toString(), StatusOfStep.FAILED);
                        return undefined
                    }
                }
                count++;
            }
        }
    }
    return undefined
}

export async function captureScreenshotPage(page: Page) {
    let count = 0
    while (count <= RETRY_NUMBERS) {
        try {
            const pages = await puppeteer.defaultPage.browser().pages();
            log.push('When', `Before the screenshot the number of pages are ${pages.length}`, StatusOfStep.PASSED);
            const screenshotBuffer = await page.screenshot({
                    fullPage: true,
                    captureBeyondViewport: false,
                    encoding: 'binary'
                }
            );
            if (Buffer.isBuffer(screenshotBuffer))
                return screenshotBuffer;
        } catch (e: any) {
            if (count == RETRY_NUMBERS) {
                log.push('When', e.toString(), StatusOfStep.FAILED);
                return undefined
            }
        }
        count++;
    }
    return undefined
}
