import { basename } from 'path'
import log from "../services/log.service";
import {
    Feature,
    postNotifications,
    Steps,
    updateReport,
    uploadFeature,
    uploadScenario
} from '../services/report.service';
import { startSuite } from '../utilities/start-suite.helper';
import { StepStatusEnum } from "../enums/step-status.enum";
import { UploadModel } from "../models/upload.model";

export async function AfterEach(body: any, featureName: string, scenarioName: string, statusCode: number, screenshotBuffer: Buffer, errMessage?: string) {
    let isFinal: boolean = false;
    if (process.env.ENVIRONMENT == "LIVE") {
        console.log('asc ' + errMessage);
        console.log('--- Uploading scenario and feature for AUXTA report ---');
        const stepsArr = log.returnScenarioReport();
        try {
            const scenarioRes = await uploadScenario(stepsArr, scenarioName, screenshotBuffer, errMessage);
            const featureRes = await uploadFeature(scenarioRes, featureName, basename(__filename), (statusCode != 200));
            const feature: Feature = {
                featureId: featureRes.featureRef,
                featureName: featureRes.name,
                featureUri: featureRes.uri,
                status: featureRes.status,
                scenariosCount: featureRes.scenariosCount
            }
            const stepCounts: Steps = {
                failedSteps: log.getStatusCount(StepStatusEnum.FAILED),
                passedSteps: log.getStatusCount(StepStatusEnum.PASSED),
                skippedSteps: log.getStatusCount(StepStatusEnum.SKIPPED),
                suggestedSteps: log.getStatusCount(StepStatusEnum.SUGGESTION)
            }
            isFinal = (!(body.nextSuites && body.nextSuites.length > 0));
            await updateReport(body.reportId, feature, stepCounts, isFinal);
            console.log('--- Finished uploading report data to AUXTA ---');
        } catch (error) {
            console.log('--- Failed to update report in AUXTA ---')
            console.log(error)
        }
    }
    if (isFinal) await AfterComplete(body.reportId, body.endEmail, body);
    else if (body && body.nextSuites && body.nextSuites.length > 0)
        try {
            await startSuite(body.nextSuites, body.reportId);
        } catch {
        }
}

export async function AfterComplete(reportId: string, endEmail: string, body: UploadModel) {
    if (process.env.ENVIRONMENT == "LIVE") {
        await postNotifications(reportId, body);
    }
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
