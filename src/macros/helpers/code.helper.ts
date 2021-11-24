import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import { StepStatusEnum } from "../../auxta/enums/step-status.enum";

export class FunctionHelper {
    public readonly defaultTimeout: number = Number(process.env.AUXTA_TIMEOUT);

    public log(keyword: string, name: string, status: StepStatusEnum){
        log.push(keyword, name, status)
    }

    public suggest(name: string){
        log.addSuggestion(name)
    }

    private getEscapedText(text: string){
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        return `concat('${splitedQuotes}', '')`;
    }
    
    public async clickByText(selector: string, text: string, page = puppeteer.defaultPage) {
        await page.waitForTimeout(this.defaultTimeout);
        const [linkHandlers] = await page.$x(`//${selector}[. = ${this.getEscapedText(text)}]`);

        if (linkHandlers) {
            log.push('And', `I click on the ${text} ${selector}`, StepStatusEnum.PASSED);
            await linkHandlers.click();
        } else {
            log.push('And', `I click on the ${text} ${selector}`, StepStatusEnum.FAILED);
            throw new Error(`Link not found: ${text}`);
        }
    }

    public async waitForSelectorWithText(selector: string, text: string) {
        const linkHandlers = await puppeteer.defaultPage.$x(`//${selector}[. = ${this.getEscapedText(text)}]`);
        if (linkHandlers.length > 0) {
            log.push('And', `I checked for ${text} and found it.`, StepStatusEnum.PASSED);
            return true;
        } else {
            log.push('And', `I checked for ${text} and found it.`, StepStatusEnum.FAILED);
            throw new Error(`Link not found: ${text}`);
        }
    }

    public async goto(page: string) {
        await puppeteer.defaultPage.goto(page);
        log.push('And', `I go to the ${page} page`, StepStatusEnum.PASSED);
    }

    public async type(field: string, value: string) {
        await puppeteer.defaultPage.type(field, value);
        const elementName = await puppeteer.defaultPage.$eval(field, (e) => e.textContent);
        log.push('And', `I type '${value}' into the ${elementName} field`, StepStatusEnum.PASSED);
    }

    public async waitForNetwork() {
        await puppeteer.defaultPage.waitForNetworkIdle();
    }

    public async timeout(timeout = this.defaultTimeout) {
        await puppeteer.defaultPage.waitForTimeout(timeout);
    }

    /**
     * Waiting for selector with timeout 60000
     *
     * @function waitForSelector
     * @param {string} option - visible, hidden
     * @param selector - class to select
     * @param time
     * @param page
     */

    public async waitForSelector(option: string, selector: string, time: number = this.defaultTimeout, page = puppeteer.defaultPage) {
        await page.waitForSelector(selector, {
            [option]: true,
            timeout: time
        });
    }

    public async click(className: string, page = puppeteer.defaultPage) {
        await page.waitForTimeout(this.defaultTimeout);
        await page.click(className);
        const elementName = await puppeteer.defaultPage.$eval(className, (e) => e.textContent);
        log.push('Then', `I click on ${elementName}`, StepStatusEnum.PASSED);
    }

    public async urlContains(selector: string) {
        const url = puppeteer.defaultPage.url();
        if (!url.includes(selector)) {
            log.push('And', `I am on the ${selector} page`, StepStatusEnum.FAILED);
            throw new Error(`I am not at the ${selector} page`)
        }
        log.push('And', `I am on the ${selector} page`, StepStatusEnum.PASSED);
    }

}

export default new FunctionHelper();
