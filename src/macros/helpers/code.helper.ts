import log from "../../auxta/services/log.service";
import puppeteer from "../../puppeteer/puppeteer";
import { StatusOfStep } from "../../auxta/enums/status-of.step";
import { StepStatus } from "../../AuxTA";
import { ExtendDefaultPage } from "./extend-default-page";
import { KnownDevices } from "puppeteer";

export class FunctionHelper extends ExtendDefaultPage {

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

    public async clickByText(selector: string, text: string, dotOrText = '.', options = {}, page = puppeteer.defaultPage, time: number = this.defaultTimeout, log_message = true) {
        const message = `I clicked on the '${text}' '${selector}'`;
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
            throw new Error(message)
        }
        if (log_message) {
            log.push('And', message, StatusOfStep.PASSED);
        }
    }

    public async clickByTextWithClass(class_selector: string, class_name: string, selector: string, text: string, dotOrText = '.', page = puppeteer.defaultPage) {
    const message = `I click on the '${text}' '${selector}'`;
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
    throw new Error(message);
}

    //div[contains(@class,"mat-menu-content")]//button
    public async waitForSelectorWithText(selector: string, text: string, dotOrText = '.', page = puppeteer.defaultPage) {
    const message = `I check for '${text}' on the current page`;
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
    throw new Error(message);
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
    const message = `I checked for the '${selector}' element to be ${option}`;
    try {
        await page.waitForSelector(selector, {
            [option]: true,
            timeout: time
        });
    } catch (e) {
        if (log_message) {
            log.push('And', `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
        }
        throw new Error(message)
    }
    if (log_message) {
        log.push('And', message, StatusOfStep.PASSED);
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

    public async emulate(phone_name: string, page = puppeteer.defaultPage) {
    // @ts-ignore
    const phone = KnownDevices[phone_name]
    await page.emulate(phone);
}

    public async restartBrowser() {
    await puppeteer.close();
    await puppeteer.startBrowser();
}

    public async clickAndWaitForPageToBeCreated(selector: string, page = puppeteer.defaultPage) {
    const nav = new Promise(res => page.browser().on('targetcreated', res));
    await page.click(selector);
    await nav;
}

    public async closeLastPage(page = puppeteer.defaultPage) {
    const pages = await page.browser().pages();
    await pages[pages.length - 1].close();
}

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
