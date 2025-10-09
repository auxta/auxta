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
     * Attach console/network listeners to all existing and future tabs (pages).
     * Aggregates logs into the provided arrays. Appends a suffix like " [tab N]"
     * so you can see which tab produced the line, while preserving
     * "STATUS URL" ordering for HTTP lines.
     */
    private async attachListenersToAllTabs(consoleMessage: any[], httpsMessage: any[]) {
        let tabSeq = 0;

        const attach = async (page: puppeteer.Page, fixedIndex?: number) => {
            const id = typeof fixedIndex === 'number' ? fixedIndex : (++tabSeq);
            const suffix = ` [tab ${id}]`;

            
            if (!this._tabLogs[id]) this._tabLogs[id] = { console: [], https: [] };
page
                .on('console', (message: any) => {
                    try {
                        consoleMessage.push(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}${suffix}`);
                    this._tabLogs[id].console.push(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`);
                    } catch {
                        try {
                            // Fallback if message.text() fails
                            consoleMessage.push(`LOG ${String((message as any)?.text?.() ?? '')}${suffix}`);
                            this._tabLogs[id].console.push(`LOG ${String((message as any)?.text?.() ?? '')}`);
                        } catch {
                            consoleMessage.push(`LOG${suffix}`);
                            this._tabLogs[id].console.push(`LOG`);
                        }
                    }
                })
                // @ts-ignore - puppeteer types before v22
                .on('pageerror', ({ message }: any) => consoleMessage.push(`${message}${suffix}`))
                .on('response', (response: any) => {
                    try {
                        httpsMessage.push(`${response.status()} ${response.url()}${suffix}`);
                    this._tabLogs[id].https.push(`${response.status()} ${response.url()}`);
                    try { this._tabLogs[id].url = response.url(); } catch { }
                    } catch {
                        // ignore
                    }
                })
                .on('requestfailed', (request: any) => {
                    try {
                        const failure = request.failure();
                        const err = failure !== null && failure !== undefined ? failure.errorText : '';
                        httpsMessage.push(`${err ?? ''} ${request.url()}${suffix}`);
                    this._tabLogs[id].https.push(`${err ?? ''} ${request.url()}`);
                    try { this._tabLogs[id].url = request.url(); } catch { }
                    } catch {
                        // ignore
                    }
                });
        };

        // Attach to all currently open pages
        const pages = await this.browser.pages();
        tabSeq = pages.length - 1; // 0-based index to align with `${i} Image`
        await Promise.all(pages.map((p, idx) => attach(p, idx))); // 0-based

        // Attach to future pages
        this.browser.on('targetcreated', async (target: any) => {
            try {
                if (typeof target.page === 'function') {
                    const page = await target.page();
                    if (page) await attach(page);
                }
            } catch {
                // ignore
            }
        });
    }

    public defaultPage!: puppeteer.Page;
    private browser!: puppeteer.Browser;

    
    private _tabLogs: { [k: number]: { console: string[]; https: string[]; url?: string } } = {};
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

    private async initiateBrowser(consoleMessage: any[], httpsMessage: any []) {
        await this.startBrowser()
        await this.attachListenersToAllTabs(consoleMessage, httpsMessage);
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
                await this.initiateBrowser(consoleMessage, httpsMessage);
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
                            await this.initiateBrowser(consoleMessage, httpsMessage);
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

            
            // Pick per-tab logs for the last step instead of aggregated logs
            let activeTabIndex = undefined as unknown as number | undefined;
            try {
                const _pagesForFinish = await this.defaultPage.browser().pages();
                if (_pagesForFinish && _pagesForFinish.length) activeTabIndex = _pagesForFinish.length - 1; // last opened
            } catch {}
            const tabLogs = this.getTabLogs() as any;
            const chosen = (activeTabIndex !== undefined && tabLogs && tabLogs[activeTabIndex]) ? tabLogs[activeTabIndex] : undefined;
            const perTabConsole = chosen?.console ?? consoleMessage;
            const perTabHttps = chosen?.https ?? httpsMessage;
            const perTabUrl = chosen?.url ?? url;
return await onTestEnd(uploadModel, featureName, scenarioName, statusCode, screenshotBuffer, !errMessage ? undefined : {
                currentPageUrl: perTabUrl,
                console: perTabConsole,
                https: perTabHttps,
                error: errMessage,
                byTab: this.getTabLogs()
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
            try {
                await log.push('When', log.tag, `Starting puppeteer process`, StatusOfStep.PASSED);
                await this.startBrowser()
                await this.attachListenersToAllTabs(consoleStack, consoleStack)
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

    public getTabLogs() {
        return this._tabLogs;
    }

}

export default new Puppeteer();