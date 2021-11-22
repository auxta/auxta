import puppeteer, { Puppeteer } from "./puppeteer/puppeteer";
import { FunctionHelper } from "./macros/helpers/code.helper";
import f from "./macros/helpers/code.helper";
import run from "./auxta/run";
import { Log } from "./auxta/services/log.service";
import defaultLog from "./auxta/services/log.service";
import path from "path";
import fs from "fs";
import { StepStatusEnum } from "./auxta/enums/step-status.enum";
import { UploadModel } from "./auxta/models/upload.model";
import * as dotenv from "dotenv";
import { setupConfig } from "./auxta/configs/config";

dotenv.config();

class AuxTA {
    public puppeteer: Puppeteer = puppeteer;
    public func: FunctionHelper = f;
    public run: Function = run;
    public logger: Log.LogSteps = defaultLog;

    private readonly uploadModel: UploadModel;

    constructor() {
        let file;
        try {
            //todo find a better way to load the file
            file = path.join(__dirname, "../../../../../../", "suitesList.json");
            const jsonConfig = JSON.parse(fs.readFileSync(file).toString());
            try {
                setupConfig(jsonConfig)
            } catch (e) {
                if (e instanceof Error) console.log("Missing field in suitesList.json:", e.message)
                process.exit(1);
            }
            this.uploadModel = new UploadModel(jsonConfig.organization, jsonConfig.baseURL, jsonConfig.digitalProduct);
        } catch (e) {
            console.log("Missing or corrupted config: suitesList.json. Searching in location:", file)
            console.log(e);
            process.exit(1);
        }
    }

    public getUploadModel(): UploadModel {
        return this.uploadModel;
    }
}

export const StepStatus = StepStatusEnum;

const auxta: AuxTA = new AuxTA();

export const auxtaLogger = auxta.logger;
export const auxtaPuppeteer = auxta.puppeteer;
export const auxtaSuggest = auxta.logger.addSuggestion;
export const auxtaLog = auxta.logger.push;
export const auxtaRun = auxta.run;
export const auxtaFunc = auxta.func;

export default auxta;
