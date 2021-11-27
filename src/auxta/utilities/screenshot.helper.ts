import puppeteer  from "../../puppeteer/puppeteer";

export async function captureScreenshot() {
    try{
        const pages = await puppeteer.defaultPage.browser().pages();
        if (!pages.length) return undefined;
        const lastPage = pages[pages.length - 1] || puppeteer.defaultPage;

        const screenshotBuffer = await lastPage.screenshot({
                fullPage: true,
                encoding: 'binary'
            }
        );
        if (Buffer.isBuffer(screenshotBuffer))
            return screenshotBuffer;
    } catch (e){
    }
    return undefined
}
