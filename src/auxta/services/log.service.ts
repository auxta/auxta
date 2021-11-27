import { StatusOfStep } from "../enums/status-of.step";

export interface Step {
    keyword: string,
    name: string,
    result: {
        status: StatusOfStep,
        duration: number
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
            keyword: 'Suggestion', name: text, result:
                {status: StatusOfStep.SUGGESTION, duration: 0}
        });
    }

    public clear() {
        this.stepLog = [];
    }

    public push(keyword: string, name: string, status: StatusOfStep) {
        console.log(`System log -- status: ${status} -- : ${name} `);
        this.statusCounter[status]++;
        const currentStep = new Date().getTime();
        this.stepLog.push({keyword, name, result: {status, duration: currentStep - this.lastStepTime}});
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
