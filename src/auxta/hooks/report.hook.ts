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
import { StatusOfStep } from "../enums/status-of.step";
import { UploadModel } from "../models/upload.model";

export async function onTestEnd(body: any, featureName: string, scenarioName: string, statusCode: number, screenshotBuffer?: Buffer, errMessage?: object) {
    let isFinal: boolean = false;
    if (process.env.ENVIRONMENT == "LIVE") {
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
                failedSteps: log.getStatusCount(StatusOfStep.FAILED),
                passedSteps: log.getStatusCount(StatusOfStep.PASSED),
                skippedSteps: log.getStatusCount(StatusOfStep.SKIPPED),
                suggestedSteps: log.getStatusCount(StatusOfStep.SUGGESTION)
            }
            isFinal = (!(body.nextSuites && body.nextSuites.length > 0));
            await updateReport(body.reportId, feature, stepCounts, isFinal);
            console.log('--- Finished uploading report data to AUXTA ---');
        } catch (error) {
            console.log('--- Failed to update report in AUXTA ---')
            console.log(error)
        }
    }
    if (isFinal) await afterComplete(body);
    else if (body && body.nextSuites) await startSuite(body.nextSuites, body.reportId);
}

export async function afterComplete(body: UploadModel) {
    if (process.env.ENVIRONMENT == "LIVE")
        await postNotifications(body);
}
