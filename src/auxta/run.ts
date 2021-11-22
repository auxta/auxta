import { createEmptyReport } from "./services/report.service";
import { startSuite } from "./utilities/start-suite.helper";
import auxta from "../AuxTA";
import { config } from "./configs/config";

export default async function run(event: any) {
    const model = auxta.getUploadModel();
    let token: string = event.queryStringParameters.token;
    let reportId: string | undefined = event.queryStringParameters.reportId;
    if (token !== config.token) return {statusCode: 401, message: 'Unauthorized'}
    const suites = config.suitesList.slice(0);
    await startSuite(suites, reportId || await createEmptyReport(model));
    return {statusCode: 204}
}
