import axios from "axios";
import {Step} from "./log.service";
import {config} from "../configs/config";
import {UploadModel} from "../models/upload.model";

export interface Scenarios {
    scenarioId: string,
    scenarioName: string,
    scenarioUri: string,
    status: string,
    scenariosCount: number
    lastTag: string
}

export interface Steps {
    failedSteps: number,
    passedSteps: number,
    skippedSteps: number,
    suggestedSteps: number,
    performanceFailure: number,
    log: number
}

function headers(token: string) {
    return {
        headers: {
            'Content-Type': 'application/json',
            'cookie': `authToken=${token}`
        }
    }
}

async function auth() {
    let token = await axios.post(
        config.auxtaURL + 'login',
        config.auxtaCredentials,
        {
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(({data}) => {
            return data.token
        })
        .catch(() => {
            return false;
        });
    if (token == false) {
        token = axios.post(
            config.auxtaURL + 'login',
            config.auxtaCredentials,
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(({data}) => {
                return data.token
            })
            .catch(() => {
                throw new Error("Invalid login credentials")

            });
    }
    return token;
}


export async function setTimeZone(){
    const token = await auth();
    return (await axios.post(
        config.auxtaURL + "set-timezone-organization",
        {
            organization: config.organization,
            timezone: config.timezone
        },
        headers(token)
    )).data;
}

export async function setEmailProvider() {
    const token = await auth();
    return (await axios.post(
        config.auxtaURL + "set-email-provider-organization",
        {
            organization: config.organization,
            emailProvider: config.emailProvider
        },
        headers(token)
    )).data;
}

/**
 * This method used to create empty report in the database
 * @param body
 * @return reportId - id of the report
 * */
export async function createEmptyReport(body: any): Promise<string> {
    const token = await auth();
    const moment = require('moment-timezone');
    return (await axios.post(
        config.auxtaURL + "create-empty-report",
        {
            environment: body.environment,
            digitalProductToken: body.digitalProduct,
            bucket: body.bucket,
            start: moment().tz(config.timezone),
            emailProvider: config.emailProvider,
            url: body.baseUrl
        },
        headers(token)
    )).data.reportId;
}

/**
 * This method used to create a step with the given parameters
 * @param stepLog
 * @param scenarioName
 * @param screenshot
 * @param errMessage
 * @return scenarios - array object with the parameter for the given step
 * */
export async function uploadStep(stepLog: Step[], scenarioName: string, screenshot?: Buffer, errMessage?: object) {
    let scenarios = [];
    let token = await auth();
    let lastStep = stepLog[stepLog.length - 1];
    const stepLogFormat = JSON.parse(JSON.stringify(stepLog));
    stepLogFormat.pop();
    let output = (await axios.post(
        config.auxtaURL + "create-steps",
        {
            json: {
                name: scenarioName,
                steps: [
                    ...stepLogFormat,
                    (lastStep!.result.status == 'failed')
                        ? Object.assign(lastStep, {
                            result: {
                                ...lastStep!.result,
                                error_message: JSON.stringify(errMessage)
                            }
                        })
                        : lastStep,
                    {
                        keyword: "After",
                        result: {
                            status: "passed",
                            duration: 2678000000
                        },
                        embeddings: (screenshot) ? [{
                            data: screenshot,
                            mime_type: "image/png"
                        }] : undefined,
                    }
                ],
            }
        },
        headers(token)
    )).data.scenarios;
    scenarios.push({
        stepRef: output.stepRef,
        name: output.name,
        status: output.status,
        stepsCount: output.stepsCount
    });
    return scenarios;
}

/**
 * This method used to create and upload a Scenario with the given parameters
 * @return reportId - id of the report
 * @param stepRes
 * @param scenarioName
 * @param uri
 * @param hasFailed
 @return scenario - object with the parameter for the given scenario
 *
 * */
export async function uploadScenario(stepRes: any[], scenarioName: string, uri: string, hasFailed: boolean) {
    let token = await auth();
    return (await axios.post(
        config.auxtaURL + "create-scenario",
        {
            json: {
                name: scenarioName,
                uri: uri
            },
            scenarios: stepRes,
            hasFailed: hasFailed
        },
        headers(token)
    )).data;
}

/**
 * This method used to update a report by its id
 * @param reportId
 * @param scenario
 * @param steps
 * @param isFinal
 * */
export async function updateReport(reportId: string, scenario: Scenarios, steps: Steps, isFinal: boolean) {
    let token = await auth();
    const moment = require('moment-timezone');
    await axios.post(
        config.auxtaURL + "update-inprogress-report",
        {
            reportId: reportId,
            isFinal: isFinal,
            end: moment().tz(config.timezone),
            data: {
                scenario: {
                    scenarioRef: scenario.scenarioId,
                    name: scenario.scenarioName,
                    uri: scenario.scenarioUri,
                    status: scenario.status,
                    scenariosCount: scenario.scenariosCount,
                    lastTag: scenario.lastTag
                },
                ...steps
            }
        },
        headers(token)
    );
}

export async function getReport(reportId: string): Promise<any> {
    let token = await auth();
    return (await axios.post(
        config.auxtaURL + "get-report",
        {reportId: reportId},
        headers(token)
    )).data;
}

export async function getLastDayResults(): Promise<any> {
    let token = await auth();
    return (await axios.get(
        config.auxtaURL + `get-last-day-results?url=${config.baseURL}`,
        headers(token)
    )).data.results;
}

export async function compareScreenshots(key: string, screenshot: Uint8Array | Buffer = new Uint8Array()): Promise<any> {
    let token = await auth();
    const embedding = {
        data: screenshot,
        mime_type: "image/png"
    };
    return (await axios.post(`${config.auxtaURL}save-compared-screenshot`, {
        organization: config.organization,
        key: key,
        embedding: embedding,
    }, headers(token))).data;
}

export async function postNotifications(body: UploadModel) {
    let token = await auth();
    await axios.post(`${config.auxtaURL}post-notification-after-run-background`, {
        environmentName: body.environment,
        digitalProductToken: body.digitalProduct,
        organizationName: body.organization,
        bucketName: body.bucket,
        reportId: body.reportId,
        isOfficial: body.isOfficial
    }, headers(token));
}


export async function postNotificationsOnFail(body: UploadModel) {
    let token = await auth();
    await axios.post(`${config.auxtaURL}post-notifications-after-case-fail-background`, {
        environmentName: body.environment,
        digitalProductToken: body.digitalProduct,
        organizationName: body.organization,
        bucketName: body.bucket,
        reportId: body.reportId,
        featureName: body.featureName,
        scenarioName: body.scenarioName,
        isOfficial: body.isOfficial
    }, headers(token));
}

export async function getVerifyReceivedEmail(from_name: string, from_email: string, subject: string, body: string, link: boolean) {
    let token = await auth();
    return await axios.post(`${config.auxtaURL}get-verify-received-email`, {
        from_name: from_name,
        from_email: from_email,
        subject: subject,
        body: body,
        link: link
    }, headers(token));
}
