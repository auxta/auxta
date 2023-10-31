import {StatusOfStep} from "../enums/status-of.step";

export interface Step {
    keyword: string,
    name: string,
    imageCompareKey: string
    result: {
        status: StatusOfStep,
        duration: number
        embedding?: {
            data: string,
            mime_type: string
        },
    }
}

export class LogSteps {
    private stepLog: Step[] = [];
    private lastStepTime = new Date().getTime();
    public statusCounter = {
        [StatusOfStep.PASSED]: 0,
        [StatusOfStep.FAILED]: 0,
        [StatusOfStep.SKIPPED]: 0,
        [StatusOfStep.SUGGESTION]: 0,
    }

    public addSuggestion(text: string) {
        this.statusCounter[StatusOfStep.SUGGESTION]++;
        this.stepLog.push({
            keyword: 'Suggestion', name: text, imageCompareKey: '', result:
                {status: StatusOfStep.SUGGESTION, duration: 0}
        });
    }

    public clear() {
        this.stepLog = [];
        this.statusCounter = {
            [StatusOfStep.PASSED]: 0,
            [StatusOfStep.FAILED]: 0,
            [StatusOfStep.SKIPPED]: 0,
            [StatusOfStep.SUGGESTION]: 0,
        }
    }

    public push(keyword: string, name: string, status: StatusOfStep, screenshot = '', imageCompareKey = '') {
        console.log(`System log -- status: ${status} -- : ${name} `);
        this.statusCounter[status]++;
        const currentStep = new Date().getTime();
        if (screenshot != '') {
            const embedding = {
                data: screenshot,
                mime_type: "image/png"
            };
            this.stepLog.push({
                keyword,
                name,
                imageCompareKey,
                result: {status, duration: currentStep - this.lastStepTime, embedding: embedding}
            });
        } else {
            this.stepLog.push({keyword, name, imageCompareKey ,result: {status, duration: currentStep - this.lastStepTime}});
        }

        this.lastStepTime = currentStep;
    }

    public returnScenarioReport() {
        return this.stepLog;
    }

    public getStatusCount(status: StatusOfStep): number {
        return this.statusCounter[status];
    }
}

const log = new LogSteps();
export default log;
