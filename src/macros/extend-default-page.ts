import log from "../auxta/services/log.service";
import {StatusOfStep} from "../auxta/enums/status-of.step";
import {config} from "../auxta/configs/config";
import puppeteer_core from 'puppeteer-core';

const defaultTimeout = config.timeout;

export async function extend_page_functions(page: puppeteer_core.Page) {
    const {goto: original_goto, click: original_click, waitForSelector: original_waitForSelector, waitForNetworkIdle: original_waitForNetworkIdle} = page;
    page.goto = async function goto(url: any, options?: any) {
        const result = original_goto.apply(url, options);
        log.push('Then', `I go to the '${url}' page`, StatusOfStep.PASSED);
        return result
    };
    page.click = async function click(selector: any, options?: any) {
        try {
            await page.waitForSelector(selector, {
                timeout: defaultTimeout
            });
            let elementName = await page.$eval(selector, (e) => e.textContent);
            if (!elementName || elementName === ' ') elementName = selector;
            await original_click.apply(selector, options);
            log.push('Then', `I click on the '${elementName}'`, StatusOfStep.PASSED);
        } catch (e) {
            const msg = `I click on the '${selector}'`;
            log.push('Then', msg, StatusOfStep.FAILED);
            throw new Error(msg)
        }
    };
    /**
     * Wait for the `selector` to appear in page. If at the moment of calling the
     * method the `selector` already exists, the method will return immediately. If
     * the `selector` doesn't appear after the `timeout` milliseconds of waiting, the
     * function will throw.
     * @param selector - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors | selector}
     * of an element to wait for
     * @param option - Optional waiting parameters
     * @remarks
     * The optional Parameter in Arguments `options` are :
     * - `visible`: A boolean to wait for element to be present in DOM and to be
     * visible, i.e. to not have `display: none` or `visibility: hidden` CSS
     * properties. Defaults to `false`.
     *
     * - `hidden`: A boolean wait for element to not be found in the DOM or to be
     * hidden, i.e. have `display: none` or `visibility: hidden` CSS properties.
     * Defaults to `false`.
     * @param time - The time for witch it will timeout
     */
    page.waitForSelector = async function waitForSelector(option: any, selector: any, time: number = defaultTimeout) {
        let options: any
        switch (option) {
            case 'visible':
                options = {"visible": true}
                break;
            case 'hidden':
                options = {"hidden": true}
                break;
        }
        const message = `I check for the '${selector}' element to be ${option}`;
        let result
        try {
            result = await original_waitForSelector.apply(selector,options)
        } catch (e) {
            log.push('And', message, StatusOfStep.FAILED);
            throw new Error(message)
        }
        log.push('And', message, StatusOfStep.PASSED);
        return result;
    };
    page.waitForNetworkIdle = async function waitForNetworkIdle(selector: any, option?: any) {
        let message = 'I wait for the page to load'
        let result
        try {
            result = await original_waitForNetworkIdle.apply(selector, option);
            log.push('Then', message, StatusOfStep.PASSED);
        } catch (e) {
            log.push('Then', message, StatusOfStep.FAILED);
            throw new Error(message)
        }
        return result
    }
    return page;
}