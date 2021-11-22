import { auxtaPuppeteer } from "../../AuxTA";

export async function captureScreenshot() {
    const pages = await auxtaPuppeteer.defaultPage.browser().pages();
    const lastPage = pages[pages.length - 1];

    const screenshotBuffer = await lastPage.screenshot({
            fullPage: true,
            encoding: 'binary'
        }
    );
    if (Buffer.isBuffer(screenshotBuffer)) 
        return screenshotBuffer;
    else throw `Failed to capture buffer screenshot`;
}
