import log from "../../auxta/services/log.service";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {config} from "../../auxta/configs/config";

export class ExtendDefaultPage {
    public defaultTimeout: number = config.timeout;

    public async extend_page_functions(page: any, time = this.defaultTimeout) {
        this.defaultTimeout = config.timeout
        const {
            goto: original_goto,
            click: original_click,
            type: original_type,
            waitForNetworkIdle: original_waitForNetworkIdle
        } = page;
        page.goto = function goto(url: any, options?: any) {
            log.push('Then', `I go to the '${url}' page`, StatusOfStep.PASSED);
            return original_goto.apply(page, arguments);
        };
        page.click = async function click(selector: any, options?: any) {
            try {
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
                throw new Error(msg)
            }
        };
        page.waitForNetworkIdle = async function waitForNetworkIdle(selector: any, option?: any) {
            let message = 'I wait for the page to load'
            let result
            try {
                result = await original_waitForNetworkIdle.apply(page, arguments);
                log.push('Then', message, StatusOfStep.PASSED);
            } catch (e) {
                log.push('Then', message, StatusOfStep.FAILED);
                throw new Error(message)
            }
            return result
        }
        page.type = async function type(field: any, value?: any) {
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
                throw new Error(msg)
            }
        }
        return page;
    }


}

export default new ExtendDefaultPage();