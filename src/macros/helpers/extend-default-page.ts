import log from "../../auxta/services/log.service";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {config} from "../../auxta/configs/config";

export class ExtendDefaultPage {
    public defaultTimeout: number = config.timeout;

    public async extend_page_functions(page: any, time = this.defaultTimeout) {
        this.defaultTimeout = config.timeout
        const {goto: original_goto,$: original_$,$$: original_$$, click: original_click, type: original_type, waitForNetworkIdle: original_waitForNetworkIdle} = page;
        page.goto = function goto(url: any, options?: any) {
            log.push('Then', `I go to the '${url}' page`, log.AuxTA_FAILED ? StatusOfStep.SKIPPED: StatusOfStep.PASSED);
            if (log.AuxTA_FAILED) {
                return;
            }
            return original_goto.apply(page, arguments);
        };
        page.$ = function $(selector: any) {
            if (log.AuxTA_FAILED) {
                return;
            }
            return original_$.apply(page, arguments);
        }
        page.$$ = function $$(selector: any) {
            if (log.AuxTA_FAILED) {
                return;
            }
            original_$$.click = async function click(selector: any, options?: any) {
                try {
                    if (log.AuxTA_FAILED) {
                        log.push('Then', `I click on the '${selector}'`, StatusOfStep.SKIPPED);
                        return;
                    }
                    await page.waitForSelector(selector, {
                        timeout: time
                    });
                    let elementName = await page.$eval(selector, (e: { textContent: any; }) => e.textContent);
                    if (!elementName || elementName === ' ') elementName = selector;
                    await original_$$.apply(page, arguments);
                    log.push('Then', `I click on the '${elementName}'`, StatusOfStep.PASSED);
                } catch (e) {
                    const msg = `I click on the '${selector}'`;
                    log.push('Then', msg, StatusOfStep.FAILED);
                }
            }
            return original_$$.apply(page, arguments);
        }
        page.click = async function click(selector: any, options?: any) {
            try {
                if (log.AuxTA_FAILED) {
                    log.push('Then', `I click on the '${selector}'`, StatusOfStep.SKIPPED);
                    return;
                }
                await page.waitForSelector(selector, {
                    timeout: time
                });
                let elementName = await page.$eval(selector, (e: { textContent: any; }) => e.textContent);
                if (!elementName || elementName === ' ') elementName = selector;
                await original_click.apply(page, arguments);
                log.push('Then', `I click on the '${elementName}'`, StatusOfStep.PASSED);
            } catch (e) {
                const msg = `I click on the '${selector}'`;
                log.push('Then', msg, StatusOfStep.FAILED);
            }
        };
        page.waitForNetworkIdle = async function waitForNetworkIdle(selector: any, option?: any) {
            let message = 'I wait for the page to load'
            let result
            if (log.AuxTA_FAILED) {
                log.push('Then', message, StatusOfStep.SKIPPED);
                return;
            }
            try {
                result = await original_waitForNetworkIdle.apply(page, arguments);
                log.push('Then', message, StatusOfStep.PASSED);
            } catch (e) {
                log.push('Then', message, StatusOfStep.FAILED);
            }
            return result
        }
        page.type = async function type(field: any, value?: any) {
            if (log.AuxTA_FAILED) {
                log.push('Then', `I type '${value}' into the '${field}' field`, StatusOfStep.SKIPPED);
                return;
            }
            try {
                await page.waitForSelector(field, {
                    timeout: time
                });
                await original_type.apply(page, arguments);
                let elementName = await page.$eval(field, (e: { textContent: any; }) => e.textContent);
                if (!elementName || elementName === ' ') elementName = field;
                log.push('Then', `I type '${value}' into the '${elementName}' field`, StatusOfStep.PASSED);
            } catch (e) {
                const msg = `I type '${value}' into the '${field}' field`
                log.push('Then', msg, StatusOfStep.FAILED);
            }
        }
        return page;
    }


}

export default new ExtendDefaultPage();