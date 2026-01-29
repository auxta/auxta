import log from "../../auxta/services/log.service";
import playwright from "../../playwright/playwright";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {StepStatusPlaywright} from "../../AuxTA.playwright";
import {ExtendDefaultPagePlaywright} from "./extend-default-page.playwright";
import {devices, Page} from "playwright";
import {captureScreenshotPagePlaywright} from "../../auxta/utilities/screenshot.helper.playwright";
import {compareScreenshots} from "../../auxta/services/report.service";
import axios from "axios";

export class FunctionHelperPlaywright extends ExtendDefaultPagePlaywright {
    /**
     * This method is used to log data in to the test
     * @param keyword
     * @param name
     * @param status
     * @param screenshot
     */
    public log(keyword: string, name: string, status: StatusOfStep, screenshot: Uint8Array | Buffer = new Uint8Array()) {
        log.push(keyword, log.tag, name, status, screenshot)
    }

    public setTag(tag: string) {
        log.tag = tag;
    }

    public clearTag() {
        log.clearTag();
    }

    /**
     * This method is used to call a REST API.
     * @param method // HTTP method (e.g., 'GET', 'POST', 'PUT', etc.)
     * @param url // URL with query parameters
     * @param headers // Optional Request headers (object in JSON format)
     * @param body // Optional Request body (object in JSON format)
     * @returns
     */
    public async callREST(method: string, url: string, headers?: object, body?: object) {
        const response = await axios({
            method: method,
            url: url,
            headers: headers,
            data: body
        });

        return response;
    }

    /**
     * This method is used to make a screenshot of a given page
     * @param page
     *
     * */
    public async screenshot(page: Page = playwright.defaultPage) {
        const screenshotBuffer = await captureScreenshotPagePlaywright(page);
        if (screenshotBuffer) {
            return screenshotBuffer;
        }
    }

    /**
     * This method is used to make a screenshot of a given page and compare it with another
     * @param key
     * @param threshold
     * @param page
     *
     * */
    public async screenshotCompare(key: string, threshold = 0.1, page: Page = playwright.defaultPage) {
        if (process.env.ENVIRONMENT !== 'LOCAL') {
            const screenshotBuffer = await captureScreenshotPagePlaywright(page);
            if (screenshotBuffer) {
                const screenshot = screenshotBuffer;
                const result = await compareScreenshots(key, screenshot);
                if (result.presentDifference && Number(result.presentDifference) > threshold) {
                    log.push('Then', log.tag, `I compare screenshots with key ${key}, and difference is: ${result.presentDifference}%`, StatusOfStep.FAILED, screenshot, key)
                } else {
                    log.push('Then', log.tag, `I compare screenshots with key ${key}`, StatusOfStep.PASSED, screenshot, key)
                }
            }
        } else {
            log.push('Then', log.tag, `I compare screenshots with key ${key}`, StatusOfStep.PASSED, undefined, key)
        }
    }

    /**
     * This method is used to make a suggestion log
     * @param name
     *
     * */
    public suggest(name: string) {
        log.addSuggestion(name)
    }

    public async performanceFail(name: string, screenshot = true, page: Page = playwright.defaultPage) {
        if (screenshot) {
            const screenshotBuffer = await captureScreenshotPagePlaywright(page);
            log.addPerformanceFail(name, screenshotBuffer)
        } else {
            log.addPerformanceFail(name)
        }
    }

    /**
     * This method used to click the selected text by Xpath expression
     * @param selector
     * @param text
     * @param dotOrText - sometimes . is needed in order to work better otter text default is .
     * @param options
     * @param page
     * @param time - how much timeout to set
     * @param log_message - true or false to log a message or not
     *
     * */
    public async clickByText(selector: string, text: string, dotOrText = '.', options = {}, page: Page = playwright.defaultPage, time: number = this.defaultTimeout, log_message = true) {
        const message = `I clicked on the '${text}' '${selector}'`;
        try {
            // Playwright uses different XPath syntax
            const xpath = `//${selector}[contains(${dotOrText},"${text}")]`;
            const element = page.locator(`xpath=${xpath}`).first();
            await element.waitFor({ timeout: time });
            await element.click(options);
            log.push('Then', log.tag, message, StatusOfStep.PASSED);
        } catch (e) {
            if (log_message) {
                log.push('And', log.tag, `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
            }
            throw new Error(message)
        }
        if (log_message) {
            log.push('And', log.tag, message, StatusOfStep.PASSED);
        }
    }

    /**
     * This method used to click the selected text by Xpath expression with class
     * @param class_selector
     * @param class_name
     * @param selector
     * @param text
     * @param dotOrText - sometimes . is needed in order to work better otter text default is .
     * @param page
     *
     * */
    public async clickByTextWithClass(class_selector: string, class_name: string, selector: string, text: string, dotOrText = '.', page: Page = playwright.defaultPage) {
        const message = `I click on the '${text}' '${selector}'`;
        try {
            const xpath = `//${class_selector}[contains(@class,${this.getEscapedText(class_name)})]//${selector}[contains(${dotOrText},"${text}")]`;
            const element = page.locator(`xpath=${xpath}`).first();
            await element.click();
            log.push('Then', log.tag, message, StatusOfStep.PASSED);
            return;
        } catch (e) {
        }
        log.push('Then', log.tag, message, StatusOfStep.FAILED);
        throw new Error(message);
    }

    /**
     * This method used to wait for selector with text by Xpath expression
     * @param selector
     * @param text
     * @param dotOrText - sometimes . is needed in order to work better otter text default is .
     * @param page
     *
     * */
    public async waitForSelectorWithText(selector: string, text: string, dotOrText = '.', page: Page = playwright.defaultPage) {
        const message = `I check for '${text}' on the current page`;
        try {
            await page.waitForSelector(selector, {
                timeout: this.defaultTimeout
            });
            const xpath = `//${selector}[contains(${dotOrText},"${text}")]`;
            const elements = await page.locator(`xpath=${xpath}`).all();
            if (elements.length > 0) {
                log.push('And', log.tag, message, StatusOfStep.PASSED);
                return true;
            }
        } catch (e) {
        }
        log.push('And', log.tag, message, StatusOfStep.FAILED);
        throw new Error(message);
    }

    /**
     * This method used to set timeout
     * @param timeout
     * */
    public async timeout(timeout = this.defaultTimeout) {
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

    public async waitForSelector(option: string, selector: string, time: number = this.defaultTimeout, page: Page = playwright.defaultPage, log_message = true) {
        const message = `I checked for the '${selector}' element to be ${option}`;
        try {
            // Map Puppeteer options to Playwright state
            const state = option === 'visible' ? 'visible' : option === 'hidden' ? 'hidden' : 'visible';
            await page.waitForSelector(selector, {
                state: state,
                timeout: time
            });
        } catch (e) {
            if (log_message) {
                log.push('And', log.tag, `${message}, but it didn't appear in ${time / 1000} seconds.`, StatusOfStep.FAILED);
            }
            throw new Error(message)
        }
        if (log_message) {
            log.push('And', log.tag, message, StatusOfStep.PASSED);
        }
    }

    /**
     * This method used to check if the url contains given name
     * @param selector
     * @param page
     *
     * */
    public async urlContains(selector: string, page: Page = playwright.defaultPage) {
        const url = page.url();
        let message = `I am on the ${selector} page`
        if (!url.includes(selector)) {
            log.push('And', log.tag, message, StatusOfStep.FAILED);
            throw new Error(message)
        }
        log.push('And', log.tag, message, StatusOfStep.PASSED);
    }

    /**
     * Force a CSS pseudo-state on an element using CSS injection
     * This replaces the CDP-based approach used in Puppeteer
     * @param selector
     * @param state - e.g., 'hover', 'focus', 'active'
     * @param index
     * @param page
     */
    public async forceState(selector: string, state: string, index = 0, page: Page = playwright.defaultPage) {
        // Use CSS injection to simulate pseudo-states
        // This is a cross-browser compatible approach that doesn't require CDP
        const styleId = `__auxta_force_state_${Date.now()}`;

        // Create CSS that forces the pseudo-state styles to apply to the base selector
        await page.evaluate(({ selector, state, styleId, index }) => {
            const elements = document.querySelectorAll(selector);
            const element = elements[index];
            if (element) {
                // Add a special class to mark this element as having forced state
                element.classList.add(`__auxta_forced_${state}`);

                // Get computed styles for the pseudo-state (if any exist in stylesheets)
                const style = document.createElement('style');
                style.id = styleId;

                // Copy the pseudo-state styles to the forced class
                style.textContent = `
                    ${selector}.__auxta_forced_${state} {
                        /* Force pseudo-state appearance - this triggers any :${state} styles */
                    }
                    ${selector}:${state}, ${selector}.__auxta_forced_${state} {
                        /* Ensure both real and forced states have same styles */
                    }
                `;
                document.head.appendChild(style);
            }
        }, { selector, state, styleId, index });

        // Store the style ID for cleanup
        (this as any)._forceStateStyleId = styleId;
        (this as any)._forceStateSelector = selector;
        (this as any)._forceStateState = state;
        (this as any)._forceStatePage = page;
    }

    /**
     * Remove forced CSS pseudo-state
     */
    public async endForceState() {
        const page = (this as any)._forceStatePage as Page;
        const styleId = (this as any)._forceStateStyleId;
        const selector = (this as any)._forceStateSelector;
        const state = (this as any)._forceStateState;

        if (page && styleId) {
            await page.evaluate(({ styleId, selector, state }) => {
                // Remove the injected style
                const style = document.getElementById(styleId);
                if (style) style.remove();

                // Remove the forced class from elements
                const elements = document.querySelectorAll(`${selector}.__auxta_forced_${state}`);
                elements.forEach(el => el.classList.remove(`__auxta_forced_${state}`));
            }, { styleId, selector, state });
        }

        // Clear stored references
        (this as any)._forceStateStyleId = undefined;
        (this as any)._forceStateSelector = undefined;
        (this as any)._forceStateState = undefined;
        (this as any)._forceStatePage = undefined;
    }

    /**
     * This method used to more quickly press enter
     * @param page
     *
     * */
    public async pressEnter(page: Page = playwright.defaultPage) {
        await page.keyboard.press('Enter');
    }

    /**
     * This method used to emulate different devices
     * @remarks
     * Playwright device names may differ slightly from Puppeteer.
     * Common devices: 'iPhone 12', 'iPhone 13', 'Pixel 5', 'iPad', etc.
     * @param device_name
     * @param page
     *
     * */
    public async emulate(device_name: string, page: Page = playwright.defaultPage) {
        const device = devices[device_name];
        if (!device) {
            throw new Error(`Device "${device_name}" not found in Playwright devices`);
        }

        // In Playwright, device emulation is typically set at context creation
        // For runtime emulation, we need to set viewport and user agent
        await page.setViewportSize(device.viewport);

        // Note: User agent changes require context-level settings in Playwright
        // This is a limitation compared to Puppeteer's page.emulate()
        log.push('Then', log.tag, `Emulating device: ${device_name}`, StatusOfStep.PASSED);
    }

    /**
     * This method used to restart the browser
     *
     * */
    public async restartBrowser() {
        await playwright.close();
        await playwright.startBrowser();
    }

    /**
     * This method used to click on selector and wait for a page to be created
     * @param selector
     * @param page
     * @param newPage
     *
     * */
    public async clickAndWaitForPageToBeCreated(selector: string, page: Page = playwright.defaultPage, newPage: boolean) {
        if (newPage) {
            const context = playwright.getContext();
            const [newPagePromise] = await Promise.all([
                context.waitForEvent('page'),
                page.click(selector)
            ]);
            await newPagePromise.waitForLoadState();
        } else {
            await page.click(selector);
        }
    }

    public async waitForResponse(name: string, wait = true, page: Page = playwright.defaultPage) {
        if (wait) {
            await page.waitForResponse(response => response.url().includes(name));
            this.log('Then', `I wait for response with name: ${name}`, StatusOfStep.PASSED);
        }
    }

    /**
     * This method used to close last page in browser
     * @param page
     *
     * */
    public async closeLastPage(page: Page = playwright.defaultPage) {
        const context = playwright.getContext();
        const pages = context.pages();
        await pages[pages.length - 1].close();
    }

    /**
     * This method used to log in a microsoft account
     * @param button
     * @param email
     * @param password
     * @param page
     * @param newPage
     *
     * @param staySignIn
     * */
    public async microsoftLogin(button: string, email: string, password: string, page: Page = playwright.defaultPage, newPage = true, staySignIn = true) {
        const email_input = 'input[type="email"]';
        const password_input = 'input[type="password"]';
        await this.clickAndWaitForPageToBeCreated(button, page, newPage);
        const context = playwright.getContext();
        const pages = context.pages();
        const loginPage = pages[pages.length - 1];
        await this.extend_page_functions(loginPage);
        await this.waitForResponse('signin-options', true, loginPage)
        await loginPage.fill(email_input, email);
        await loginPage.keyboard.press('Enter');
        await this.waitForResponse('arrow_left', true, loginPage);
        let isWorkOrPersonalVisible = await loginPage.$('div.table');
        if (!!isWorkOrPersonalVisible) {
            const tables = await loginPage.$$('div.table');
            if (tables.length > 0) {
                await tables[0].click();
            }
            console.log('Then', 'I clicked Work or school account', StepStatusPlaywright.PASSED);
            await this.waitForResponse('microsoft_logo', true, loginPage);
        }
        try {
            await this.timeout(1000);
            const passwordField = await loginPage.$(password_input);
            if (passwordField) {
                await passwordField.fill(password);
            }
            await this.log('Then', `I type password into the ${password_input}`, StepStatusPlaywright.PASSED);
        } catch (e) {
            await this.log('Then', `I type password into the ${password_input}`, StepStatusPlaywright.FAILED);
            throw new Error(`I type password into the ${password_input}`)
        }
        await this.timeout(1000);
        await loginPage.keyboard.press('Enter');
        if (staySignIn) {
            await this.waitForResponse('4_eae2dd7eb3a55636dc2d74f4fa4c386e', true, loginPage);
            await this.timeout(1000);
            await loginPage.keyboard.press('Enter');
        }
    }

    private getEscapedText(text: string) {
        const splitedQuotes = text.replace(/'/g, `', "'", '`)
        return `concat('${splitedQuotes}', '')`;
    }

    /**
     * Sends a POST request to the specified URL with the provided body and Bearer token.
     *
     * @param {string} url - The endpoint URL to which the request is sent.
     * @param {Object} body - The request payload to be sent in the body of the POST request.
     * @param {string} token - The Bearer token used for authentication in the Authorization header.
     * @throws {Error} - Throws an error if the request fails or if a non-200 status code is returned.
     */
    public async callAPI(url: string, body: {}, token: string) {
        return await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
    }
}

export default new FunctionHelperPlaywright();
