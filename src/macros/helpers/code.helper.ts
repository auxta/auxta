import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import { StepStatusEnum } from "../../auxta/enums/step-status.enum";

export class FunctionHelper {
    public readonly timeout: number = Number(process.env.AUXTA_TIMEOUT);

    public async clickByText(selector: string, text: string, page = puppeteer.defaultPage) {
        await page.waitForTimeout(this.timeout);
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        const escapedText = `concat('${splitedQuotes}', '')`;
        const [linkHandlers] = await page.$x(`//${selector}[. = ${escapedText}]`);

        if (linkHandlers) {
            log.push('And', `I click ${selector} with text ${text}`, StepStatusEnum.PASSED, 1000000);
            await linkHandlers.click();
        } else {
            log.push('And', `I click ${selector} with text ${text}`, StepStatusEnum.FAILED, 1000000);
            throw new Error(`Link not found: ${text}`);
        }
    }

    public async waitForSelectorWithText(selector: string, text: string) {
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        const escapedText = `concat('${splitedQuotes}', '')`;
        const linkHandlers = await puppeteer.defaultPage.$x(`//${selector}[. = ${escapedText}]`);
        if (linkHandlers.length > 0) {
            log.push('And', `I checked for ${text} and found it.`, StepStatusEnum.PASSED, 1000000);
            return true;
        } else {
            log.push('And', `I checked for ${text} and found it.`, StepStatusEnum.FAILED, 1000000);
            throw new Error(`Link not found: ${text}`);
        }
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

    public async waitForSelector(option: string, selector: string, time: number = this.timeout, page = puppeteer.defaultPage) {
        await page.waitForSelector(selector, {
            [option]: true,
            timeout: time
        });
    }

    public async click(className: string, page = puppeteer.defaultPage) {
        await page.waitForTimeout(this.timeout);
        await page.click(className);
    }

    public async urlContains(selector: string) {
        const url = puppeteer.defaultPage.url();
        if (!url.includes(selector)) {
            await log.push('And', `I am on the ${selector} page`, StepStatusEnum.FAILED, 1000000);
            throw new Error(`I am not at the ${selector} page`)
        }
        await log.push('And', `I am on the ${selector} page`, StepStatusEnum.PASSED, 1000000);
    }

}

export default new FunctionHelper();
