import axios from "axios";
import {Step} from "./log.service";
import {config} from "../configs/config";
import {UploadModel} from "../models/upload.model";
import {limitErrorMessage} from "../utilities/limit-error-message.helper";

// The backend stores all steps of a scenario in one MongoDB document (16 MB cap), so the logs are kept small here
const MAX_TAB_ERROR_BYTES = 256 * 1024;
const MAX_FINAL_ERROR_BYTES = 1024 * 1024;

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

// Screenshots go over the wire as base64. A Buffer serialised as JSON becomes an array of
// numbers, which is close to three times larger and overflows the maximum string length on
// scenarios with many full-page comparisons.
function toBase64(data: Uint8Array | Buffer) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64');
}

function encodeStep(step: Step): any {
    const embedding = step.result.embedding;
    if (!embedding) return {...step, result: {...step.result}};
    return {...step, result: {...step.result, embedding: {...embedding, data: toBase64(embedding.data)}}};
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
    const stepLogFormat = stepLog.map(encodeStep);
    const lastStep = stepLogFormat.pop();

    // Attach per-tab error messages (including debug) to 'Image' steps
    try {
        const byTab = (errMessage as any)?.byTab || undefined;
        if (byTab) {
            for (let idx = 0; idx < stepLogFormat.length; idx++) {
                const step: any = stepLogFormat[idx];
                if (typeof step?.name === 'string') {
                    const m = step.name.match(/^(\d+)\s+Image/i);
                    if (m) {
                        const tabNum = Number(m[1]);
                        const tabErr = byTab[String(tabNum)] || byTab[tabNum];
                        if (tabErr) {
                            stepLogFormat[idx] = Object.assign({}, step, {
                                result: Object.assign({}, step.result, {
                                    error_message: limitErrorMessage(JSON.stringify(tabErr), MAX_TAB_ERROR_BYTES)
                                })
                            });
                        }
                    }
                }
            }
        }
    } catch {/* no-op */}

    let output = (await axios.post(
        config.auxtaURL + "create-steps",
        {
            json: {
                name: scenarioName,
                steps: [
                    ...stepLogFormat,
                    (lastStep.result.status == 'failed')
                        ? {
                            ...lastStep,
                            result: {
                                ...lastStep.result,
                                // byTab is already attached to the Image steps above and the report page does not read it
                                error_message: limitErrorMessage(JSON.stringify({...(errMessage as any), byTab: undefined}), MAX_FINAL_ERROR_BYTES)
                            }
                        }
                        : lastStep,
                    {
                        keyword: "After",
                        result: {
                            status: "passed",
                            duration: 2678000000
                        },
                        embeddings: (screenshot) ? [{
                            data: toBase64(screenshot),
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

/**
 * This method used to upload a log file produced by a scenario. The log is compressed
 * here and stored in AUXTA blob storage; it is not written to the database.
 * @param reportId - id of the report the run belongs to
 * @param scenarioName - name of the scenario
 * @param content - the log text or bytes
 * @param options.fileName - file name shown when the log is downloaded
 * @param options.stepRef - optional step document id
 * @param options.contentType - type of the uncompressed log, default text/plain
 * @return logId - id of the stored log
 * */
export async function uploadScenarioLog(
    reportId: string,
    scenarioName: string,
    content: string | Buffer,
    options: { fileName?: string, stepRef?: string, contentType?: string } = {}
): Promise<string> {
    const {gzipSync} = require('zlib');
    const token = await auth();
    const fileName = options.fileName || 'scenario.log';
    const compressed: Buffer = gzipSync(typeof content === 'string' ? Buffer.from(content, 'utf8') : content);

    const form = new FormData();
    form.append('reportId', reportId);
    form.append('scenarioName', scenarioName);
    form.append('fileName', fileName);
    form.append('contentType', options.contentType || 'text/plain; charset=utf-8');
    if (options.stepRef) form.append('stepRef', options.stepRef);
    form.append('file', new Blob([new Uint8Array(compressed)], {type: 'application/gzip'}), `${fileName}.gz`);

    return (await axios.post(`${config.auxtaURL}upload-scenario-log`, form, {
        headers: {'cookie': `authToken=${token}`},
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    })).data.logId;
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
