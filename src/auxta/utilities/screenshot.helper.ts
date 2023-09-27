import puppeteer  from "../../puppeteer/puppeteer";
import log from "../services/log.service";
import StatusOfStep from "../enums/status-of.step";

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
    } catch (e:any){
        log.push('When', e.toString(), StatusOfStep.FAILED);
        return undefined
    }
    return undefined
}
