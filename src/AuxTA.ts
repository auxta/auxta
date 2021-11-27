import puppeteer, { Puppeteer } from "./puppeteer/puppeteer";
import { FunctionHelper } from "./macros/helpers/code.helper";
import path from "path";
import fs from "fs";
import StepStatusEnum from "./auxta/enums/step-status.enum";
import { UploadModel } from "./auxta/models/upload.model";
import * as dotenv from "dotenv";
import { config, setupConfig } from "./auxta/configs/config";
import { startSuite } from "./auxta/utilities/start-suite.helper";
import { createEmptyReport } from "./auxta/services/report.service";

dotenv.config();

class AuxTA extends FunctionHelper {
    public puppeteer: Puppeteer = puppeteer;

    private readonly uploadModel: UploadModel;

    constructor() {
        super();
        let file;
        try {
            let currentDir = ""
            while (true) {
                file = path.join(__dirname, currentDir, "auxta.json");
                if (!fs.existsSync(file)) {
                    currentDir += "../"
                    if (currentDir.length >= 30) {
                        console.log("auxta.json file not found!")
                        process.exit(1);
                        return;
                    }
                    continue;
                }
                break;
            }
            const jsonConfig = JSON.parse(fs.readFileSync(file).toString());
            try {
                setupConfig(jsonConfig)
            } catch (e: any) {
                console.log("Missing field in auxta.json:", e.message)
            }
            this.uploadModel = new UploadModel(jsonConfig.organization, jsonConfig.baseURL, jsonConfig.digitalProduct);
        } catch (e: any) {
            console.log("Missing or corrupted config: auxta.json. Searching in location:", file)
            console.log(e);
            process.exit(1);
        }
    }

    public async run(event: any) {
        const model = this.uploadModel;
        let token: string = event.queryStringParameters.token;
        let reportId: string | undefined = event.queryStringParameters.reportId;
        if (token !== config.token) return {statusCode: 401, message: 'Unauthorized'}
        const suites = config.suitesList.slice(0);
        await startSuite(suites, reportId || await createEmptyReport(model));
        return {statusCode: 204}
    }

    public startBrowser(event: any, callback: any, feature: string, scenario: string) {
        this.puppeteer.run(event, callback, feature, scenario)
    }

    public getUploadModel(): UploadModel {
        return this.uploadModel;
    }
}

export const StepStatus = StepStatusEnum;

const auxta: AuxTA = new AuxTA();

export default auxta;
