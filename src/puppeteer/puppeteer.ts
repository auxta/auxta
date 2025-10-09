import log from "../auxta/services/log.service";
import {captureScreenshot} from "../auxta/utilities/screenshot.helper";
import {onTestEnd} from "../auxta/hooks/report.hook";
import auxta from "../AuxTA";
import {StatusOfStep} from "../auxta/enums/status-of.step";
import {UploadModel} from "../auxta/models/upload.model";
import {config} from "../auxta/configs/config";
import {retrySuite} from "../auxta/utilities/start-suite.helper";
import puppeteer = require("puppeteer");

export class Puppeteer {
    /**
     * Attach console/network listeners to all existing and future tabs.
     * Also builds per-tab debug entries matching frontend expectations:
     *   { ts, level, args?: any[], text?: string }
     */
    private async attachListenersToAllTabs(consoleMessage: any[], httpsMessage: any[], debugMessage?: any[]) {
        let tabSeq = 0;

        const serializeArgs = async (msg: any) => {
            const out: any[] = [];
            try {
                const args = msg.args && typeof msg.args === 'function' ? msg.args() : [];
                for (const a of args) {
                    try {
                        out.push(await a.jsonValue());
                    } catch {
                        try { out.push(String(a)); } catch { out.push('[unserializable]'); }
                    }
                }
            } catch { /* ignore */ }
            return out;
        };

        const attach = async (page: puppeteer.Page, fixedIndex?: number) => {
            const id = typeof fixedIndex === 'number' ? fixedIndex : (++tabSeq);
            const suffix = ` [tab ${id}]`;
            if (!this._tabLogs[id]) this._tabLogs[id] = { console: [], https: [], debug: [] };

            page
                .on('console', async (message: any) => {
                    try {
                        const entry: any = {
                            ts: Date.now(),
                            level: message.type && typeof message.type === 'function' ? message.type() : 'log',
                            text: (message.text && typeof message.text === 'function') ? message.text() : String(message)
                        };
                        try {
                            const loc = (message.location && typeof (message as any).location === 'function') ? (message as any).location() : undefined;
                            if (loc) (entry as any).location = loc;
                        } catch { /* ignore */ }
                        // collect args only for "usermessages"
                        try { entry.args = await serializeArgs(message); } catch { /* ignore */ }

                        // per-tab debug
                        this._tabLogs[id].debug.push(entry);
                        // aggregated debug if provided
                        if (debugMessage) debugMessage.push(entry);

                        // legacy short console string
                        const short = `${String(entry.level).substr(0, 3).toUpperCase()} ${entry.text}${suffix}`;
                        consoleMessage.push(short);
                        this._tabLogs[id].console.push(`${String(entry.level).substr(0, 3).toUpperCase()} ${entry.text}`);
                    } catch {
                        // ignore
                    }
                })
                // @ts-ignore
                .on('pageerror', ({ message }: any) => {
                    consoleMessage.push(`${message}${suffix}`);
                    this._tabLogs[id].console.push(`${message}`);
                })
                .on('response', (response: any) => {
                    try {
                        const line = `${response.status()} ${response.url()}${suffix}`;
                        httpsMessage.push(line);
                        this._tabLogs[id].https.push(`${response.status()} ${response.url()}`);
                        this._tabLogs[id].url = response.url();
                    } catch { /* ignore */ }
                })
                .on('requestfailed', (request: any) => {
                    try {
                        const failure = request.failure && request.failure();
                        const err = failure ? failure.errorText : '';
                        const line = `${err ?? ''} ${request.url()}${suffix}`;
                        httpsMessage.push(line);
                        this._tabLogs[id].https.push(`${err ?? ''} ${request.url()}`);
                        this._tabLogs[id].url = request.url();
                    } catch { /* ignore */ }
                });
        };

        // Attach to current pages (0-based to align with `${i} Image`)
        const pages = await this.browser.pages();
        tabSeq = pages.length - 1;
        await Promise.all(pages.map((p, idx) => attach(p, idx)));

        // Watch future pages
        this.browser.on('targetcreated', async (target: any) => {
            try {
                if (typeof target.page === 'function') {
                    const page = await target.page();
                    if (page) await attach(page);
                }
            } catch { /* ignore */ }
        });
    }

    public getTabLogs() {
        return this._tabLogs;
    }

    public defaultPage!: puppeteer.Page;
    private browser!: puppeteer.Browser;

    
    private _tabLogs: { [k: number]: { console: string[]; https: string[]; debug: any[]; url?: string } } = {};
private static setupHeader(event: any, uploadModel: UploadModel) {
        let close = true;
        if (process.env.ENVIRONMENT !== 'LOCAL' && event) {
            uploadModel.reportId = event.reportId;
            uploadModel.nextSuites = event.nextSuites;
            uploadModel.currentSuite = event.currentSuite;
            uploadModel.retries = Number(event.retries);
        }
        try {
            if (event.close) {
                close = event.close === "true";
            }
            return close;
        } catch (e) {
            return true
        }
    }

    /**
     * Start the Browser with puppeteer
     *
     * @remarks
     * Starts the puppeteer with the given parameters either with browser or in headless mode
     *
     *
     */
    public async startBrowser() {
        let args = [];
        if (process.env.ENVIRONMENT === 'LOCAL') {
            args.push('--start-maximized');
        }

        args.push(`--window-size=${config.screenWidth ? config.screenWidth : 1920},${config.screenHeight ? config.screenHeight : 1080}`)
        // needed because without these tree tags in doesn't work
        args.push("--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu")
        args.push('--enable-automation=false');
        let env = {
            DISPLAY: ":10.0"
        }

        this.browser = await puppeteer.default.launch({
            slowMo: process.env.slowMo ? Number(process.env.slowMo) : 0,
            executablePath: puppeteer.default.executablePath(),
            args,
            env,
            ignoreDefaultArgs: ["--enable-automation"],
            defaultViewport: process.env.ENVIRONMENT === 'LOCAL' ? null : {
                width: config.screenWidth,
                height: config.screenHeight
            },
            // Return back to headless for netlify
            headless: process.env.ENVIRONMENT === 'LOCAL' ? (process.env.headless === 'true') : true
        });
        this.defaultPage = (await this.browser.pages())[0];
        await auxta.extend_page_functions(this.defaultPage);
        await this.defaultPage.goto(config.baseURL, {waitUntil: 'networkidle0'})
        await this.defaultPage.waitForNetworkIdle();
    }

    /**
     * Closers all browsers
     *
     * @remarks
     * This method closers all browsers
     *
     *
     */
    public async close() {
        if (this.browser) {
            let pages = await this.browser.pages();
            await Promise.all(pages.map((page: { close: () => any; }) => page.close()));
            await this.browser.close();
        }
    }

    private async initiateBrowser(consoleMessage: any[], httpsMessage: any[], debugStack: any[]) {
        await this.startBrowser();
        await this.attachListenersToAllTabs(consoleMessage, httpsMessage, debugStack);
    }

    private async logFail(consoleMessage: any[]) {
        const pages = await this.defaultPage.browser().pages();
        consoleMessage.push('pages');
        consoleMessage.push(pages.length);
    }

    /**
     * This method is the main method that starts the given test
     *
     * @param event
     * @param callback - the main function code that need to be run in the browser
     * @param featureName
     * @param scenarioName
     * @param uploadModel - the given configuration that is going to be used to upload the test
     *
     *
     */
    public async run(event: any, callback: any, featureName = 'Test feature', scenarioName = 'Test scenario', uploadModel?: UploadModel) {
        let close;
        let debugStack: any[] = [];
        try {
            if (uploadModel === undefined) {
                uploadModel = auxta.getUploadModel();
                uploadModel.featureName = featureName;
                uploadModel.scenarioName = scenarioName;
            }
            if (event.close === undefined) close = Puppeteer.setupHeader(event, uploadModel)
            let screenshotBuffer: Buffer | undefined;
            let errMessage: any;
            let statusCode: number = 200;

            let consoleMessage: any [] = [];
            let httpsMessage: any [] = [];

            log.push('When', log.tag, `Starting puppeteer process`, StatusOfStep.PASSED);
            
            try {
                await this.initiateBrowser(consoleMessage, httpsMessage, debugStack);
                await callback(event)
                log.push('When', log.tag, `Finished puppeteer process`, StatusOfStep.PASSED);
            } catch (err: any) {
                console.log("Error message: \n", err);
                if (process.env.ENVIRONMENT !== 'LOCAL') {
                    if (uploadModel.toRetry) {
                        log.clear(); // Clear the logs to avoid the scenario being flagged as FAILED
                        log.clearTag();
                        log.push('When', log.tag, `Retrying puppeteer process`, StatusOfStep.PASSED);
                        try {
                            await this.close();
                            await this.initiateBrowser(consoleMessage, httpsMessage, debugStack);
                            await callback(event);
                            log.push('When', log.tag, `Finished puppeteer process from the 2nd try`, StatusOfStep.PASSED);
                        } catch (err: any) {
                            this.logFail(consoleMessage)
                            errMessage = err;
                            statusCode = 500;
                            screenshotBuffer = await captureScreenshot();
                            log.push('When', log.tag, `Failed puppeteer process from the 2nd try`, StatusOfStep.FAILED);
                        }
                    } else {
                        this.logFail(consoleMessage)
                        errMessage = err;
                        statusCode = 500;
                        screenshotBuffer = await captureScreenshot();

                        log.push('When', log.tag, `Finished puppeteer process`, StatusOfStep.FAILED);
                    }
                }
            }
            let url = this.defaultPage.url();
            if (close) await this.close();

            // Per-tab selection for final errorMessage
            let activeTabIndex: number | undefined = undefined;
            try {
                const _pagesForFinish = await this.defaultPage.browser().pages();
                if (_pagesForFinish && _pagesForFinish.length) activeTabIndex = _pagesForFinish.length - 1;
            } catch {}
            const tabLogs = this.getTabLogs() as any;
            const chosen = (activeTabIndex !== undefined && tabLogs && tabLogs[activeTabIndex]) ? tabLogs[activeTabIndex] : undefined;
            const perTabConsole = chosen?.console ?? consoleMessage;
            const perTabHttps = chosen?.https ?? httpsMessage;
            const perTabUrl = chosen?.url ?? url;
            const perTabDebug = chosen?.debug ?? debugStack;

            return await onTestEnd(uploadModel, featureName, scenarioName, statusCode, screenshotBuffer, !errMessage ? undefined : {
                currentPageUrl: perTabUrl,
                console: perTabConsole,
                https: perTabHttps,
                error: errMessage, debug: perTabDebug, byTab: this.getTabLogs()
            });
        } catch (e) {
            console.log("Lib error:", e);
        } finally {
            log.clear();
        }
    }

    /**
     * This method can be used to start the browser and run the test when live without uploading them
     *
     * @param event
     * @param callback - the main function code that need to be run in the browser
     * @param uploadModel - the given configuration that is going to be used to upload the test
     * @param close
     *
     */
    public async runRPA(event: any, callback: any, uploadModel?: UploadModel, close?: boolean) {
        let errMessage: any;
        try {
            if (uploadModel === undefined) uploadModel = auxta.getUploadModel();
            if (close === undefined) {
                try {
                    if (event.close) {
                        close = event.close === "true";
                    } else {
                        close = true
                    }
                    if (event.retries) {
                        uploadModel.retries = Number(event.retries)
                    }
                } catch (e) {
                    close = true;
                }
            }
            let consoleStack: any[] = [];
            let debugStack: any[] = [];
            try {
                await log.push('When', log.tag, `Starting puppeteer process`, StatusOfStep.PASSED);
                await this.startBrowser()
                await this.attachListenersToAllTabs(consoleStack, consoleStack, debugStack)
                await callback(event)
                log.push('When', log.tag, `Finished puppeteer process`, StatusOfStep.PASSED);
            } catch (err: any) {
                console.log("Error message: \n", err);
                let browser_start_retry = err.toString().includes("Failed to launch the browser process!");

                if (browser_start_retry) {
                    await retrySuite([], '', uploadModel.currentSuite, uploadModel.retries);
                    return {statusCode: 204}
                }
                errMessage = err;
                log.push('When', log.tag, `Finished puppeteer process`, StatusOfStep.FAILED);
                return errMessage;
            }
            if (close) await this.close();
        } catch (e) {
            console.log("Lib error:", e);
        } finally {
            log.clear();
        }
        return {statusCode: 200}
    }
}

export default new Puppeteer();