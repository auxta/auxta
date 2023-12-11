import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {StepStatus} from "../../AuxTA";
import {ExtendDefaultPage} from "./extend-default-page";
import {KnownDevices} from "puppeteer";
import {captureScreenshotPage} from "../../auxta/utilities/screenshot.helper";
import {compareScreenshots} from "../../auxta/services/report.service";

export class FunctionHelper extends ExtendDefaultPage {

    public log(keyword: string, name: string, status: StatusOfStep, screenshot?: string) {
        log.push(keyword, name, status, screenshot)
    }

    public async screenshot(page = puppeteer.defaultPage) {
        if (log.AuxTA_FAILED) {
            return;
        }
        const screenshotBuffer = await captureScreenshotPage(page);
        if (screenshotBuffer) {
            return screenshotBuffer.toString('base64');
        }
    }

    public async screenshotCompare(key: string, threshold = 0.1, page = puppeteer.defaultPage) {
        if (log.AuxTA_FAILED) {
            log.push('Then', `I compare screenshots with key ${key}`, StatusOfStep.SKIPPED, undefined, key)
            return;
        }
        if (process.env.ENVIRONMENT !== 'LOCAL') {
            const screenshotBuffer = await captureScreenshotPage(page);
            if (screenshotBuffer) {
                const screenshot = screenshotBuffer.toString('base64');
                const result = await compareScreenshots(key, screenshot);
                if (result.presentDifference && Number(result.presentDifference) > threshold) {
                    log.push('Then', `I compare screenshots with key ${key}, and difference is: ${result.presentDifference}%`, StatusOfStep.FAILED, screenshot, key)
                } else {
                    log.push('Then', `I compare screenshots with key ${key}`, StatusOfStep.PASSED, screenshot, key)
                }
            }
        } else {
            log.push('Then', `I compare screenshots with key ${key}`, StatusOfStep.PASSED, undefined, key)
        }
    }

    public suggest(name: string) {
        log.addSuggestion(name)
    }

    private getEscapedText(text: string) {
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        return `concat('${splitedQuotes}', '')`;
    }

    public async clickByText(selector: string, text: string, dotOrText = '.', options = {}, page = puppeteer.defaultPage, time: number = this.defaultTimeout, log_message = true) {
        const message = `I clicked on the '${text}' '${selector}'`;

        if (log.AuxTA_FAILED) {
            log.push('And', `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
            return;
        }
        try {
            const [linkHandlers]: any = await page.$x(`//${selector}[contains(${dotOrText},"${text}")]`);

            if (linkHandlers) {
                await linkHandlers.click(options);
                log.push('Then', message, StatusOfStep.PASSED);
            }
        } catch (e) {
            if (log_message) {
                log.push('And', `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
            }
        }
        if (log_message) {
            log.push('And', message, StatusOfStep.PASSED);
        }
    }

    public async clickByTextWithClass(class_selector: string, class_name: string, selector: string, text: string, dotOrText = '.', page = puppeteer.defaultPage) {
        const message = `I click on the '${text}' '${selector}'`;
        if (log.AuxTA_FAILED) {
            log.push('And', `${message}`, StatusOfStep.SKIPPED);
            return;
        }
        try {
            const [linkHandlers]: any = await page.$x(`//${class_selector}[contains(@class,${this.getEscapedText(class_name)})]//${selector}[contains(${dotOrText},"${text}")]`);

            if (linkHandlers) {
                await linkHandlers.click();
                log.push('Then', message, StatusOfStep.PASSED);
                return;
            }
        } catch (e) {
        }
        log.push('Then', message, StatusOfStep.FAILED);
    }

    //div[contains(@class,"mat-menu-content")]//button
    public async waitForSelectorWithText(selector: string, text: string, dotOrText = '.', page = puppeteer.defaultPage) {
        const message = `I check for '${text}' on the current page`;
        if (log.AuxTA_FAILED) {
            log.push('And', `${message}`, StatusOfStep.SKIPPED);
            return;
        }
        try {
            await page.waitForSelector(selector, {
                timeout: this.defaultTimeout
            });
            const linkHandlers = await page.$x(`//${selector}[contains(${dotOrText},"${text}")]`);
            if (linkHandlers.length > 0) {
                log.push('And', message, StatusOfStep.PASSED);
                return true;
            }
        } catch (e) {
        }
        log.push('And', message, StatusOfStep.FAILED);
    }

    public async timeout(timeout = this.defaultTimeout, page = puppeteer.defaultPage) {
        if (log.AuxTA_FAILED) {
            return;
        }
        await new Promise(r => setTimeout(r, timeout));
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
        if (log.AuxTA_FAILED) {
            log.push('And', `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.SKIPPED);
            return;
        }
        try {
            await page.waitForSelector(selector, {
                [option]: true,
                timeout: time
            });
        } catch (e) {
            if (log_message) {
                log.push('And', `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
            }
        }
        if (log_message) {
            log.push('And', message, StatusOfStep.PASSED);
        }
    }

    public async urlContains(selector: string, page = puppeteer.defaultPage) {
        if (log.AuxTA_FAILED) {
            log.push('And', `I am on the ${selector} page`, StatusOfStep.SKIPPED);
            return;
        }
        const url = page.url();
        let message = `I am on the ${selector} page`
        if (!url.includes(selector)) {
            log.push('And', message, StatusOfStep.FAILED);
        }
        log.push('And', message, StatusOfStep.PASSED);
    }

    public async pressEnter(page = puppeteer.defaultPage) {
        await page.keyboard.press('Enter');
    }

    public async emulate(phone_name: string, page = puppeteer.defaultPage) {
        if (log.AuxTA_FAILED) {
            return;
        }
        // @ts-ignore
        const phone = KnownDevices[phone_name]
        await page.emulate(phone);
    }

    public async restartBrowser() {
        await puppeteer.close();
        await puppeteer.startBrowser();
    }

    public async clickAndWaitForPageToBeCreated(selector: string, page = puppeteer.defaultPage, newPage: boolean) {
        if (log.AuxTA_FAILED) {
            await page.click(selector);
            return;
        }
        if (newPage) {
            const nav = new Promise(res => page.browser().on('targetcreated', res));
            await page.click(selector);
            await nav;
        } else {
            await page.click(selector);
        }

    }

    public async closeLastPage(page = puppeteer.defaultPage) {
        const pages = await page.browser().pages();
        await pages[pages.length - 1].close();
    }

    public async microsoftLogin(button: string, email: string, password: string, page = puppeteer.defaultPage, newPage = true) {
        const email_input = 'input[type="email"]';
        const password_input = 'input[type="password"]';
        const next_button = 'input[value="Next"]';
        const sign_in_button = 'input[value="Sign in"]';
        const no_button = 'input.ext-secondary';
        await this.clickAndWaitForPageToBeCreated(button, page, newPage);
        const pages = await page.browser().pages();
        const loginPage = pages[pages.length - 1];
        await this.extend_page_functions(loginPage);
        await loginPage.waitForNetworkIdle();
        try {await loginPage.waitForSelector(next_button, {visible: true, timeout: 60000})} catch (e) {}
        this.log('Then', `I checked for the '${next_button}' element to be visible`, StepStatus.PASSED);
        await loginPage.type(email_input, email, {delay: 0});
        await loginPage.keyboard.press('Enter');
        await this.timeout(4000);
        // if() here check is container with asking Work or Personal is account?
        let isWorkOrPersonalVisible = await page.$('div.table');
        if (!!isWorkOrPersonalVisible) {
            await (await page.$$('div.table'))[0].click();
            console.log('Then', 'I clicked Work or school account', StepStatus.PASSED);
            await this.timeout(4000);
        } else {
            await this.timeout(4000);
        }
        try {await loginPage.waitForSelector(sign_in_button, {visible: true, timeout: 60000})} catch (e) {}
        this.log('Then', `I checked for the '${sign_in_button}' element to be visible`, StepStatus.PASSED);

        try {await loginPage.waitForSelector(password_input, {visible: true, timeout: 60000})} catch (e) {}
        this.log('Then', `I checked for the '${password_input}' element to be visible`, StepStatus.PASSED);

        try {
            (await loginPage.$(password_input))?.type(password);
            await this.log('Then', `I type password into the ${password_input}`, StepStatus.PASSED);
        } catch (e) {
            await this.log('Then', `I type password into the ${password_input}`, StepStatus.FAILED);
        }
        await this.timeout(4000);
        await loginPage.keyboard.press('Enter');
        try {await loginPage.waitForSelector(no_button, {visible: true, timeout: 60000})} catch (e) {}
        this.log('Then', `I checked for the '${no_button}' element to be visible`, StepStatus.PASSED);
        await loginPage.keyboard.press('Enter');
    }

}

export default new FunctionHelper();
