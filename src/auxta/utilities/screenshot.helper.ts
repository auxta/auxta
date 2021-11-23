import puppeteer  from "../../puppeteer/puppeteer";

export async function captureScreenshot() {
    const pages = await puppeteer.defaultPage.browser().pages();
    if (!pages.length) throw `Browser is closed`;
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
