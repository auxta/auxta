import chromium from 'chrome-aws-lambda';
import log from "../auxta/services/log.service";
import { captureScreenshot } from "../auxta/utilities/screenshot.helper";
import { AfterEach } from "../auxta/hooks/report.hook";
import auxta from "../AuxTA";
import { StepStatusEnum } from "../auxta/enums/step-status.enum";
import { UploadModel } from "../auxta/models/upload.model";
import puppeteer_core from 'puppeteer-core';
import { config } from "./../auxta/configs/config";


export class Puppeteer {
    public defaultPage!: puppeteer_core.Page;
    private browser!: puppeteer_core.Browser;

    public async startBrowser() {
        this.browser = await chromium.puppeteer.launch({
            executablePath: process.env.NODE_ENV !== 'production' ? undefined : await chromium.executablePath,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            defaultViewport: null,
            // Return back to headless for commit
            headless: process.env.ENVIRONMENT == 'LOCAL' ? false : chromium.headless
        });
        this.defaultPage = (await this.browser.pages())[0];
        await this.defaultPage.goto(config.baseURL)
        await this.defaultPage.waitForNetworkIdle();
    }

    public async close() {
        if (this.browser) {
            let pages = await this.browser.pages();
            await Promise.all(pages.map((page: { close: () => any; }) => page.close()));
            await this.browser.close();
        }
    }

    public async run(event: any, callback: any, featureName = 'Test feature', scenarioName = 'Test scenario', uploadModel?: UploadModel, close?: boolean) {
        if (uploadModel === undefined) uploadModel = auxta.getUploadModel();
        if (close === undefined) close = Puppeteer.setupHeader(event, uploadModel)
        let screenshotBuffer: Buffer;
        let errMessage: string | undefined;
        let statusCode: number = 200;

        try {
            await log.push('When', `Starting puppeteer process`, StepStatusEnum.PASSED);
            await this.startBrowser()
            await callback(event)
            screenshotBuffer = await captureScreenshot();
            await log.push('When', `Finished puppeteer process`, StepStatusEnum.PASSED);
        } catch (err: any) {
            console.log(`Error ${err}`);
            errMessage = err;
            statusCode = 500;
            screenshotBuffer = await captureScreenshot();
            await log.push('When', `Finished puppeteer process`, StepStatusEnum.FAILED);
        }
        if (close) await this.close();

        await AfterEach(uploadModel, featureName, scenarioName, statusCode, screenshotBuffer, errMessage);
    }

    private static setupHeader(event: any, uploadModel: UploadModel) {
        let close = true;
        if (process.env.ENVIRONMENT !== 'LOCAL') {
            const body = JSON.parse(event.body);
            uploadModel.reportId = body.reportId;
            uploadModel.nextSuites = body.nextSuites;
        } else if (event.queryStringParameters.close) {
            close = event.queryStringParameters.close === "true";
        }
        return close;
    }
}

export default new Puppeteer();
