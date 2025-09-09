import {basename} from 'path'
import log from "../services/log.service";
import {
    postNotifications,
    Scenarios,
    Steps,
    updateReport,
    uploadScenario,
    uploadStep
} from '../services/report.service';
import {startSuite} from '../utilities/start-suite.helper';
import {StatusOfStep} from "../enums/status-of.step";
import {UploadModel} from "../models/upload.model";

/**
 * This method is called when the test ends it handles the uploading of the report and uploading the error and image if any;
 * @param body
 * @param featureName
 * @param scenarioName
 * @param statusCode
 * @param screenshotBuffer
 * @param errMessage
 * @param failed
 * */
export async function onTestEnd(body: any, featureName: string, scenarioName: string, statusCode: number, screenshotBuffer?: Buffer, errMessage?: object) {
    let isFinal: boolean = false;
    if (process.env.ENVIRONMENT == "LIVE") {
        console.log('--- Uploading scenario and feature for AUXTA report ---');
        const stepsArr = log.returnScenarioReport();
        try {
            const { debugCandidate = [], ...restErrors } = (errMessage as any) || {};
            let errorPayload: any = restErrors;

            const failed = statusCode !== 200;

            const hasScreenshot = !!(
            screenshotBuffer &&
            (
                (typeof Buffer !== 'undefined' && (Buffer as any).isBuffer?.(screenshotBuffer) && (screenshotBuffer as any).length > 0) ||
                (typeof (screenshotBuffer as any).byteLength === 'number' && (screenshotBuffer as any).byteLength > 0)
            )
            );

            if (failed && hasScreenshot && Array.isArray(debugCandidate) && debugCandidate.length) {
            errorPayload = { ...restErrors, debug: debugCandidate };
            }


            const stepRes = await uploadStep(stepsArr, scenarioName, screenshotBuffer, errorPayload);
            const scenarioRes = await uploadScenario(stepRes, featureName, basename(__filename), (statusCode != 200));
            const scenario: Scenarios = {
                scenarioId: scenarioRes.scenarioRef,
                scenarioName: scenarioRes.name,
                scenarioUri: scenarioRes.uri,
                status: scenarioRes.status,
                scenariosCount: scenarioRes.scenariosCount,
                lastTag: scenarioRes.lastTag
            }
            const stepCounts: Steps = {
                failedSteps: log.getStatusCount(StatusOfStep.FAILED),
                passedSteps: log.getStatusCount(StatusOfStep.PASSED),
                skippedSteps: log.getStatusCount(StatusOfStep.SKIPPED),
                suggestedSteps: log.getStatusCount(StatusOfStep.SUGGESTION),
                performanceFailure: log.getStatusCount(StatusOfStep.PERFORMANCE_FAIL),
                log: log.getStatusCount(StatusOfStep.LOG)
            }
            isFinal = (!(body.nextSuites && body.nextSuites.length > 0));
            await updateReport(body.reportId, scenario, stepCounts, isFinal);
            console.log('--- Finished uploading report data to AUXTA ---');
        } catch (error) {
            console.log('--- Failed to update report in AUXTA ---')
            console.log(error)
        }
    }
    if (isFinal) await afterComplete(body);
    else if (body && body.nextSuites) {
        return await startSuite(body.nextSuites, body.reportId);
    }
}

export async function afterComplete(body: UploadModel) {
    if (process.env.ENVIRONMENT == "LIVE")
        await postNotifications(body);
}
