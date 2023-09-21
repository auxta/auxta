import puppeteer  from "../../puppeteer/puppeteer";
import log from "../services/log.service";
import StatusOfStep from "../enums/status-of.step";

export async function captureScreenshot() {
    try{
        const pages = await puppeteer.defaultPage.browser().pages();
        console.log(pages.length);
        if (!pages.length) return undefined;
        const lastPage = pages[pages.length - 1] || puppeteer.defaultPage;

        const screenshotBuffer = await lastPage.screenshot({
                fullPage: true,
                encoding: 'binary'
            }
        );
        console.log('screenshotBuffer');
        console.log(screenshotBuffer);
        if (Buffer.isBuffer(screenshotBuffer))
            return screenshotBuffer;
    } catch (e:any){
        const pages = await puppeteer.defaultPage.browser().pages();
        console.log(pages.length);
        console.log(e);
        log.push('When', e.toString(), StatusOfStep.FAILED);
        return undefined
    }
    return undefined
}
