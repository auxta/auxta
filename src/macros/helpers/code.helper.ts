import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import { StepStatusEnum } from "../../auxta/enums/step-status.enum";
import { config } from "../../auxta/configs/config";

export class FunctionHelper {
    public readonly defaultTimeout: number = config.timeout;

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

        const message = `I click on the ${text} ${selector}`;
        if (linkHandlers) {
            log.push('Then', message, StepStatusEnum.PASSED);
            await linkHandlers.click();
        } else {
            log.push('Then', message, StepStatusEnum.FAILED);
            throw new Error(`Link not found: ${text}`);
        }
    }

    public async waitForSelectorWithText(selector: string, text: string) {
        const linkHandlers = await puppeteer.defaultPage.$x(`//${selector}[. = ${this.getEscapedText(text)}]`);
        const message = `I check for ${text}`;
        if (linkHandlers.length > 0) {
            log.push('And', message, StepStatusEnum.PASSED);
            return true;
        } else {
            log.push('And', message, StepStatusEnum.FAILED);
            throw new Error(`Link not found: ${text}`);
        }
    }

    public async goto(page: string) {
        await puppeteer.defaultPage.goto(page);
        log.push('Then', `I go to the ${page} page`, StepStatusEnum.PASSED);
    }

    public async type(field: string, value: string) {
        await puppeteer.defaultPage.type(field, value);
        let elementName = await puppeteer.defaultPage.$eval(field, (e) => e.textContent);
        if (!elementName || elementName === ' ') elementName = field;
        log.push('Then', `I type '${value}' into the ${elementName} field`, StepStatusEnum.PASSED);
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
        const message = `I check for the ${selector} element to be ${option}`;
        try{
            await page.waitForSelector(selector, {
                [option]: true,
                timeout: time
            });
        } catch (e){
            log.push('And', message, StepStatusEnum.FAILED);
            throw new Error(message)
        }
        log.push('And', message, StepStatusEnum.PASSED);
    }

    public async click(className: string, page = puppeteer.defaultPage) {
        await page.waitForTimeout(this.defaultTimeout);
        let elementName = await puppeteer.defaultPage.$eval(className, (e) => e.textContent);
        if (!elementName || elementName === ' ') elementName = className;
        await page.click(className);
        log.push('Then', `I click on ${elementName}`, StepStatusEnum.PASSED);
    }

    public async urlContains(selector: string) {
        const url = puppeteer.defaultPage.url();
        let message = `I am on the ${selector} page`
        if (!url.includes(selector)) {
            log.push('And', message, StepStatusEnum.FAILED);
            throw new Error(`I am not at the ${selector} page`)
        }
        log.push('And', message, StepStatusEnum.PASSED);
    }

}

export default new FunctionHelper();
