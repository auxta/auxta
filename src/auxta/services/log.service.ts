import {StatusOfStep} from "../enums/status-of.step";

export interface Step {
    keyword: string,
    tag: string,
    name: string,
    imageCompareKey: string
    result: {
        status: StatusOfStep,
        duration: number
        embedding?: {
            data: Uint8Array | Buffer,
            mime_type: string
        },
    }
}

export class LogSteps {
    public statusCounter = {
        [StatusOfStep.PASSED]: 0,
        [StatusOfStep.FAILED]: 0,
        [StatusOfStep.SKIPPED]: 0,
        [StatusOfStep.SUGGESTION]: 0,
        [StatusOfStep.PERFORMANCE_FAIL]: 0,
        [StatusOfStep.LOG]: 0
    }
    private stepLog: Step[] = [];
    private lastStepTime = new Date().getTime();
    private _tags = ['default'];

    /**
     * This method used to add a suggestion log
     * @param text
     * */
    public addSuggestion(text: string) {
        this.statusCounter[StatusOfStep.SUGGESTION]++;
        this.stepLog.push({
            keyword: 'Suggestion', tag: this.tag, name: text, imageCompareKey: '', result:
                {status: StatusOfStep.SUGGESTION, duration: 0}
        });
    }

    public addPerformanceFail(text: string, screenshot: Uint8Array | Buffer = new Uint8Array()) {
        this.statusCounter[StatusOfStep.PERFORMANCE_FAIL]++;
        const currentStep = new Date().getTime();
        if (screenshot.byteLength != 0) {
            const embedding = {
                data: screenshot,
                mime_type: "image/png"
            };
            this.stepLog.push({
                keyword: 'PerformanceFail',
                tag: this.tag,
                name: text,
                imageCompareKey: '',
                result: {status: StatusOfStep.PERFORMANCE_FAIL, duration: currentStep - this.lastStepTime, embedding}
            });
        } else {
            this.stepLog.push({
                keyword: 'PerformanceFail',
                tag: this.tag,
                name: text,
                imageCompareKey: '',
                result: {status: StatusOfStep.PERFORMANCE_FAIL, duration: currentStep - this.lastStepTime}
            });
        }
        this.lastStepTime = currentStep;
    }

    /**
     * This method used to clear all logs
     * */
    public clear() {
        this.stepLog = [];
        this.statusCounter = {
            [StatusOfStep.PASSED]: 0,
            [StatusOfStep.FAILED]: 0,
            [StatusOfStep.SKIPPED]: 0,
            [StatusOfStep.SUGGESTION]: 0,
            [StatusOfStep.PERFORMANCE_FAIL]: 0,
            [StatusOfStep.LOG]: 0
        }
    }

    /**
     * This method used to add a log, image and image compare key if present
     * @param keyword
     * @param name
     * @param status
     * @param screenshot
     * @param imageCompareKey
     * */
    public push(keyword: string, tag: string, name: string, status: StatusOfStep, screenshot: Uint8Array | Buffer = new Uint8Array(), imageCompareKey = '') {
        console.log(`System log -- status: ${status} -- tag: ${tag} -- : ${name} `);
        this.statusCounter[status]++;
        const currentStep = new Date().getTime();
        if (screenshot.byteLength != 0) {
            const embedding = {
                data: screenshot,
                mime_type: "image/png"
            };
            this.stepLog.push({
                keyword,
                tag,
                name,
                imageCompareKey,
                result: {status, duration: currentStep - this.lastStepTime, embedding}
            });
        } else {
            this.stepLog.push({
                keyword,
                tag,
                name,
                imageCompareKey,
                result: {status, duration: currentStep - this.lastStepTime}
            });
        }

        this.lastStepTime = currentStep;
    }

    public returnScenarioReport() {
        return this.stepLog;
    }

    public getStatusCount(status: StatusOfStep): number {
        return this.statusCounter[status];
    }

    get tag(): string {
        return this._tags.length === 1 ? this._tags[0] : this._tags[1];
    }

    set tag(value: string) {
        this._tags.push(value);
    }

    public clearTag() {
        this._tags.pop();
    }
}

const log = new LogSteps();
export default log;
