import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import { StatusOfStep } from "../../auxta/enums/status-of.step";
import { config } from "../../auxta/configs/config";

export class FunctionHelper {
    public readonly defaultTimeout: number = config.timeout;

    public log(keyword: string, name: string, status: StatusOfStep) {
        log.push(keyword, name, status)
    }

    public suggest(name: string) {
        log.addSuggestion(name)
    }

    private getEscapedText(text: string) {
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        return `concat('${splitedQuotes}', '')`;
    }

    public async clickByText(selector: string, text: string, page = puppeteer.defaultPage, dotOrText = '.') {
        const message = `I click on the '${text}' '${selector}'`;
        try {
            const [linkHandlers] = await page.$x(`//${selector}[${dotOrText} = ${this.getEscapedText(text)}]`);

            if (linkHandlers) {
                await linkHandlers.click();
                log.push('Then', message, StatusOfStep.PASSED);
                return;
            }
        } catch (e) {
        }
        log.push('Then', message, StatusOfStep.FAILED);
        throw new Error(message);
    }
    public async clickByTextWithClass(class_selector: string, class_name: string, selector: string, text: string, page = puppeteer.defaultPage, dotOrText = '.') {
        const message = `I click on the '${text}' '${selector}'`;
        try {
            const [linkHandlers] = await page.$x(`//${class_selector}[contains(@class,${this.getEscapedText(class_name)})]//${selector}[${dotOrText} = ${this.getEscapedText(text)}]`);

            if (linkHandlers) {
                await linkHandlers.click();
                log.push('Then', message, StatusOfStep.PASSED);
                return;
            }
        } catch (e) {
        }
        log.push('Then', message, StatusOfStep.FAILED);
        throw new Error(message);
    }
    //div[contains(@class,"mat-menu-content")]//button
    public async waitForSelectorWithText(selector: string, text: string, page = puppeteer.defaultPage, dotOrText = '.') {
        const message = `I check for '${text}' on the current page`;
        try {
            await page.waitForSelector(selector, {
                timeout: this.defaultTimeout
            });
            const linkHandlers = await page.$x(`//${selector}[${dotOrText} = ${this.getEscapedText(text)}]`);
            if (linkHandlers.length > 0) {
                log.push('And', message, StatusOfStep.PASSED);
                return true;
            }
        } catch (e) {
        }
        log.push('And', message, StatusOfStep.FAILED);
        throw new Error(message);
    }

    public async goto(url: string, page = puppeteer.defaultPage) {
        await page.goto(url);
        log.push('Then', `I go to the '${url}' page`, StatusOfStep.PASSED);
    }

    public async type(field: string, value: string, page = puppeteer.defaultPage) {
        try {
            await page.waitForSelector(field, {
                timeout: this.defaultTimeout
            });
            await page.type(field, value);
            let elementName = await page.$eval(field, (e) => e.textContent);
            if (!elementName || elementName === ' ') elementName = field;
            log.push('Then', `I type '${value}' into the '${elementName}' field`, StatusOfStep.PASSED);
        } catch (e) {
            const msg = `I type '${value}' into the '${field}' field`
            log.push('Then', msg, StatusOfStep.FAILED);
            throw new Error(msg)
        }
    }

    public async waitForNetwork(page = puppeteer.defaultPage) {
        let message = 'I wait for the page to load'
        try {
            await page.waitForNetworkIdle();
            log.push('Then', message, StatusOfStep.PASSED);
        } catch (e) {
            log.push('Then', message, StatusOfStep.FAILED);
            throw new Error(message)
        }
    }

    public async timeout(timeout = this.defaultTimeout, page = puppeteer.defaultPage) {
        await page.waitForTimeout(timeout);
    }

    /**
     * Waiting for selector with timeout 60000
     *
     * @function waitForSelector
     * @param {string} option - visible, hidden
     * @param selector - class to select
     * @param time
     * @param page
     * @param log_message
     */

    public async waitForSelector(option: string, selector: string, time: number = this.defaultTimeout, page = puppeteer.defaultPage, log_message = true) {
        const message = `I check for the '${selector}' element to be ${option}`;
        try {
            await page.waitForSelector(selector, {
                [option]: true,
                timeout: time
            });
        } catch (e) {
            if (log_message) {
                log.push('And', message, StatusOfStep.FAILED);
            }
            throw new Error(message)
        }
        if (log_message) {
            log.push('And', message, StatusOfStep.PASSED);
        }
    }

    public async click(selector: string, logMessages = true, page = puppeteer.defaultPage) {
        try {
            await page.waitForSelector(selector, {
                timeout: this.defaultTimeout
            });
            let elementName = await page.$eval(selector, (e) => e.textContent);
            if (!elementName || elementName === ' ') elementName = selector;
            await page.click(selector);
            log.push('Then', `I click on the '${elementName}'`, StatusOfStep.PASSED);
        } catch (e) {
            const msg = `I click on the '${selector}'`;
            log.push('Then', msg, StatusOfStep.FAILED);
            throw new Error(msg)
        }
    }

    public async urlContains(selector: string, page = puppeteer.defaultPage) {
        const url = page.url();
        let message = `I am on the ${selector} page`
        if (!url.includes(selector)) {
            log.push('And', message, StatusOfStep.FAILED);
            throw new Error(message)
        }
        log.push('And', message, StatusOfStep.PASSED);
    }

    public async pressEnter(page = puppeteer.defaultPage) {
        await page.keyboard.press('Enter');
    }

    public async waitForPageToBeCreated(selector: string,page = puppeteer.defaultPage) {
        const nav = new Promise(res => page.browser().on('targetcreated', res));
        await this.click(selector);
        await nav;
    }

    //TODO work in progress
    /*
    private async microsoftLogin(button: string, email: string, password: string) {
        const email_input = 'input[type="email"]';
        const password_input = 'input[type="password"]';
        const no_button = 'input[type="button"]';
        // click on login button
        const nav = new Promise(res => puppeteer.defaultPage.browser().on('targetcreated', res));
        await this.click(button);
        await nav;
        const pages = await puppeteer.defaultPage.browser().pages();
        const loginPage = pages[pages.length - 1];
        // enter password and submit
        await this.waitForSelector('visible', email_input, 60000, loginPage);
        await this.type(email_input, email, loginPage);
        await this.pressEnter(loginPage);
        await this.waitForNetwork(loginPage);
        // enter password and submit
        await this.waitForSelector('visible', password_input, 60000, loginPage);
        await this.type(password_input, password, loginPage);
        await this.pressEnter(loginPage);
        await this.waitForNetwork(loginPage);
        // press no
        await this.waitForSelector('visible', no_button, 60000, loginPage);
        await this.click(no_button, true, loginPage);
        await this.waitForNetwork(loginPage);
    }*/

}

export default new FunctionHelper();
