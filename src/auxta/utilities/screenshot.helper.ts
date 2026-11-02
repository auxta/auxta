import puppeteer from "../../puppeteer/puppeteer";
import log from "../services/log.service";
import StatusOfStep from "../enums/status-of.step";
import {Page} from "puppeteer";


const RETRY_NUMBERS = 10

// Puppeteer returns a Buffer on older Node versions but a plain Uint8Array on Node 26+
function toBuffer(screenshot: Uint8Array | undefined) {
    if (screenshot instanceof Uint8Array)
        return Buffer.isBuffer(screenshot) ? screenshot : Buffer.from(screenshot.buffer, screenshot.byteOffset, screenshot.byteLength);
}

export async function captureScreenshot() {
    const pages = await puppeteer.defaultPage.browser().pages();
    if (!pages.length) return undefined;
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if ((pages.length - 1) == i || pages.length == 1) {
            let count = 0
            while (count <= RETRY_NUMBERS) {
                try {
                    const lastPage = pages[pages.length - 1] || puppeteer.defaultPage;
                    const screenshotBuffer = toBuffer(await lastPage.screenshot({
                            captureBeyondViewport: false,
                            encoding: 'binary'
                        }
                    ));
                    if (screenshotBuffer)
                        return screenshotBuffer;
                } catch (e: any) {
                    if (count == RETRY_NUMBERS) {
                        log.push('When', log.tag, e.toString(), StatusOfStep.FAILED);
                        return undefined
                    }
                }
                count++;
            }
        } else {
            let count = 0
            while (count <= RETRY_NUMBERS) {
                try {
                    const screenshotBuffer = toBuffer(await page.screenshot({
                            captureBeyondViewport: false,
                            encoding: 'binary'
                        }
                    ));
                    if (screenshotBuffer) {
                        log.push("When", log.tag, `${i} Image`, StatusOfStep.FAILED, screenshotBuffer)
                        break;
                    }
                } catch (e: any) {
                    if (count == RETRY_NUMBERS) {
                        log.push('When', log.tag, e.toString(), StatusOfStep.FAILED);
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
            log.push('When', log.tag, `Before the screenshot the number of pages are ${pages.length}`, StatusOfStep.PASSED);
            const screenshotBuffer = toBuffer(await page.screenshot({
                    fullPage: true,
                    captureBeyondViewport: false,
                    encoding: 'binary'
                }
            ));
            if (screenshotBuffer)
                return screenshotBuffer;
        } catch (e: any) {
            if (count == RETRY_NUMBERS) {
                log.push('When', log.tag, e.toString(), StatusOfStep.FAILED);
                return undefined
            }
        }
        count++;
    }
    return undefined
}
