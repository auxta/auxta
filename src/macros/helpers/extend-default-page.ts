import log from "../../auxta/services/log.service";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {config} from "../../auxta/configs/config";

const isManualChecklist = process.argv.includes('--create-manual-checklist');
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
            log.push('Then', log.tag, `I go to the '${url}' page`, StatusOfStep.PASSED);
            if (!isManualChecklist) {
                return original_goto.apply(page, arguments);
            }
        };
        page.click = async function click(selector: any, options?: any) {
            try {
                await page.waitForSelector(selector, {
                    timeout: time
                });
                let elementName = await page.$eval(selector, (e: { textContent: any; }) => e.textContent);
                if (!elementName || elementName === ' ') elementName = selector;
                if (!isManualChecklist) {
                    await original_click.apply(page, arguments);
                }
                log.push('Then', log.tag, `I click on the '${elementName}'`, StatusOfStep.PASSED);
            } catch (e) {
                const msg = `I click on the '${selector}'`;
                log.push('Then', log.tag, msg, StatusOfStep.FAILED);
                if (!isManualChecklist) {
                    throw new Error(msg)
                }
            }
        };
        page.waitForNetworkIdle = async function waitForNetworkIdle(selector: any, option?: any) {
            let message = 'I wait for the page to load'
            let result
            try {
                if (!isManualChecklist) {
                    result = await original_waitForNetworkIdle.apply(page, arguments);
                }
                log.push('Then', log.tag, message, StatusOfStep.PASSED);
            } catch (e) {
                log.push('Then', log.tag, message, StatusOfStep.FAILED);
                if (!isManualChecklist) {
                    throw new Error(message)
                }
            }
            return result
        }
        page.type = async function type(field: any, value?: any) {
            try {
                await page.waitForSelector(field, {
                    timeout: time
                });
                if (!isManualChecklist) {
                    await original_type.apply(page, arguments);
                }
                let elementName = await page.$eval(field, (e: { textContent: any; }) => e.textContent);
                if (!elementName || elementName === ' ') elementName = field;
                log.push('Then', log.tag, `I type '${value}' into the '${elementName}' field`, StatusOfStep.PASSED);
            } catch (e) {
                const msg = `I type '${value}' into the '${field}' field`
                log.push('Then', log.tag, msg, StatusOfStep.FAILED);
                if (!isManualChecklist) {
                    throw new Error(msg)
                }
            }
        }
        return page;
    }


}

export default new ExtendDefaultPage();