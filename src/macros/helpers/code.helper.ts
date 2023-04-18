import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import { StatusOfStep } from "../../auxta/enums/status-of.step";
import auxta, { StepStatus } from "../../AuxTA";
import { ExtendDefaultPage } from "./extend-default-page";
import { KnownDevices, Page } from "puppeteer";

export class FunctionHelper extends ExtendDefaultPage {

    /**
     * Pushes information to AuxTA log for `auxta.live`.
     * @example Then I click on button Passed
     * @param keyword 
     * @param name 
     * @param status 
     */
    public log(keyword: string, name: string, status: StatusOfStep) {
        log.push(keyword, name, status)
    }

    /**
     * 
     * @param name 
     */
    public suggest(name: string) {
        log.addSuggestion(name)
    }

    /**
     * 
     * @param text 
     * @returns 
     */
    private getEscapedText(text: string) {
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        return `concat('${splitedQuotes}', '')`;
    }

    /**
     * Waits for a selector to be hidden.
     * @param selector 
     * @param page 
     * @param timeout 
     */
    public async selectorWait(selector: string, page: Page = auxta.puppeteer.defaultPage, timeout: number = this.defaultTimeout) {
        // TODO: add selector in config
        this.waitForSelector('hidden', selector)
    }

    /**
     * Waits for the selector to be visible on the current page and clicks it.
     * @param selector which to click.
     * @param selectorElement if there are multiple selectors on the same page, choose the number of the selector.
     * @param page which page to click on.
     */
    public async click(selector: string, selectorElement: number = 0, page = puppeteer.defaultPage) {
        const message = `I clicked on the '${selector}'`;

        try {
            await this.waitForSelector('visible', selector, this.defaultTimeout)
        }
        catch {
            log.push('Then', message + `, but it didn't appear in ${this.defaultTimeout / 1000}`, StatusOfStep.FAILED);
            throw Error(message + `, but it didn't appear in ${this.defaultTimeout / 1000}`)
        }

        const findElement = (await page.$$(selector))[selectorElement]

        try {
            // await this.selectorWait()
            await findElement.click()
            log.push('Then', message, StatusOfStep.PASSED);
        }
        catch (e: any) {
            log.push('Error', e, StatusOfStep.FAILED)
            throw Error(e)
        }
    }

    /**
     * Waits for an element with the given xPath to be visible and clicks it. 
     * @param xPath to search for on the given page. 
     * @param page (optional) to click on (defaults to current). 
     * @param message (optional) to log into AuxTA.
     * @param timeout (optional) time to wait before throwing an `Error`.
     */
    public async clickXpath(xPath: string, page: Page = auxta.puppeteer.defaultPage, message: string = "", timeout: number = this.defaultTimeout) {

        try {
            await page.waitForXPath(xPath, { visible: true, timeout: timeout })
        }
        catch {
            log.push('Then', message + `, but it didn't appear in ${this.defaultTimeout / 1000}`, StatusOfStep.FAILED);
            throw Error(message + `, but it didn't appear in ${this.defaultTimeout / 1000}`)
        }

        try {
            const [linkHandler]: any = await page.$x(xPath);
            // await this.selectorWait()
            await linkHandler.click()
            log.push('Then', message, StatusOfStep.PASSED);
        }
        catch (e: any) {
            log.push('Error', e, StatusOfStep.FAILED)
            throw Error(e)
        }
    }

    /**
     * Waits for an Element with given `selector` and `text` inside the `selector`.
     * @param selector 
     * @param text 
     * @param dotOrText 
     * @param page 
     * @param time 
     * @param log_message 
     */
    public async clickByText(selector: string, text: string, dotOrText = '.', page = puppeteer.defaultPage, time: number = this.defaultTimeout, log_message = true) {
        const message = `I clicked on the '${text}' '${selector}'`;

        const xPath = `//${selector}[contains(${dotOrText},"${text}")]`

        await this.clickXpath(xPath, page, message)
    }

    /**
     * Waits for an Element with given `class_selector`, `class_name`, `selector` and `text`.
     * @param class_selector 
     * @param class_name 
     * @param selector 
     * @param text 
     * @param dotOrText 
     * @param page 
     */
    public async clickByTextWithClass(class_selector: string, class_name: string, selector: string, text: string, dotOrText = '.', page = puppeteer.defaultPage) {
        const message = `I click on the '${text}' '${selector}'`;

        const xPath = `//${class_selector}[contains(@class,${this.getEscapedText(class_name)})]//${selector}[contains(${dotOrText},"${text}")]`

        await this.clickXpath(xPath, page, message)
    }

    /**
     * Waits for a `selector` with `text`. Throws `Error` if it doesn't appear.
     * @param selector 
     * @param text 
     * @param dotOrText 
     * @param page 
     */
    public async waitForSelectorWithText(selector: string, text: string, dotOrText = '.', timeout: number = this.defaultTimeout, page = puppeteer.defaultPage) {
        const message = `I check for '${text}' on the current page`;

        const xPath = `//${selector}[contains(${dotOrText},"${text}")]`

        try {
            await page.waitForXPath(xPath, { visible: true, timeout: this.defaultTimeout })
            log.push('Then', message, StatusOfStep.PASSED);
        }
        catch {
            log.push('Then', message + `, but it did not appear in ${timeout / 1000}`, StatusOfStep.FAILED);
            throw Error(message + `, but it did not appear in ${timeout / 1000}`)
        }
    }

    // TODO: deprecated, FIX!
    /**
     * 
     * @param timeout 
     * @param page 
     */
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
        const message = `I checked for the '${selector}' element to be ${option}`;

        try {
            await page.waitForSelector(`${selector}`, {
                [option]: true,
                timeout: time
            });
            if (log_message) {
                log.push('And', message, StatusOfStep.PASSED);
            }
        } catch {
            log.push('And', `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
            throw Error(`${message}, but it didn't appear in ${time / 1000} seconds.`)
        }
    }

    /**
     * Checks if current url contains a `selector` name.
     * @param selector 
     * @param page 
     */
    public async urlContains(selector: string, page = puppeteer.defaultPage) {
        const url = page.url();
        let message = `I am on the ${selector} page`
        if (!url.includes(selector)) {
            log.push('And', `I am not on the ${selector} page`, StatusOfStep.FAILED);
            log.push('And', `I am on ${page.url()}`, StatusOfStep.FAILED);
            throw new Error(message)
        }
        log.push('And', message, StatusOfStep.PASSED);
    }

    /**
     * Presses `Enter`.
     * @param page 
     */
    public async pressEnter(page = puppeteer.defaultPage) {
        await page.keyboard.press('Enter');
    }

    /**
     * 
     * @param phone_name 
     * @param page 
     */
    public async emulate(phone_name: string, page = puppeteer.defaultPage) {
        // @ts-ignore
        const phone = KnownDevices[phone_name]
        await page.emulate(phone);
    }

    /**
     * Restarts browser.
     */
    public async restartBrowser() {
        await puppeteer.close();
        await puppeteer.startBrowser();
    }
    /**
     * 
     * @param selector 
     * @param page 
     */
    public async clickAndWaitForPageToBeCreated(selector: string, page = puppeteer.defaultPage) {
        const nav = new Promise(res => page.browser().on('targetcreated', res));
        await page.click(selector);
        await nav;
    }
    /**
     * 
     * @param page 
     */
    public async closeLastPage(page = puppeteer.defaultPage) {
        const pages = await page.browser().pages();
        await pages[pages.length - 1].close();
    }

    /**
     * Handles Microsoft Login after clicking a given `button` with credentials `email`, `password`.
     * @param button 
     * @param email 
     * @param password 
     */
    public async microsoftLogin(button: string, email: string, password: string) {
        const email_input = 'input[type="email"]';
        const password_input = 'input[type="password"]';
        const next_button = 'input[value="Next"]';
        const sign_in_button = 'input[value="Sign in"]';
        const no_button = 'input.ext-secondary';
        await this.clickAndWaitForPageToBeCreated(button);
        const pages = await puppeteer.defaultPage.browser().pages();
        const loginPage = pages[pages.length - 1];
        await this.extend_page_functions(loginPage);
        await loginPage.waitForNetworkIdle();
        await this.waitForSelector('visible', next_button, 60000, loginPage);
        await loginPage.type(email_input, email);
        await loginPage.keyboard.press('Enter');
        await loginPage.waitForNetworkIdle();
        await this.waitForSelector('visible', sign_in_button, 60000, loginPage);
        await this.waitForSelector('visible', password_input, 6000, loginPage);
        try {
            (await loginPage.$(password_input))?.type(password);
            await this.log('Then', `I type password into the ${password_input}`, StepStatus.PASSED);
        } catch (e) {
            await this.log('Then', `I type password into the ${password_input}`, StepStatus.FAILED);
            throw new Error(`I type password into the ${password_input}`)
        }
        await this.timeout(3000);
        await loginPage.keyboard.press('Enter');
        await this.waitForSelector('visible', no_button, 60000, loginPage);
        await loginPage.keyboard.press('Enter');
        await loginPage.waitForNetworkIdle();
    }
}

export default new FunctionHelper();
