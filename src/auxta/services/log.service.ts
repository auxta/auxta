import { StepStatusEnum } from "../enums/step-status.enum";

export interface Step {
    keyword: string,
    name: string,
    result: {
        status: StepStatusEnum,
        duration: number
    }
}

export class LogSteps {
    private stepLog: Step[] = [];
    private lastStepTime = new Date().getTime();
    public statusCounter = {
        [StepStatusEnum.PASSED]: 0,
        [StepStatusEnum.FAILED]: 0,
        [StepStatusEnum.SKIPPED]: 0,
        [StepStatusEnum.SUGGESTION]: 0,
    }

    public addSuggestion(text: string) {
        this.statusCounter[StepStatusEnum.SUGGESTION]++;
        this.stepLog.push({
            keyword: 'Suggestion', name: text, result:
                {status: StepStatusEnum.SUGGESTION, duration: 0}
        });
    }

    public clear() {
        this.stepLog = [];
    }

    public push(keyword: string, name: string, status: StepStatusEnum) {
        console.log(`System log -- status: ${status} -- : ${name} `);
        this.statusCounter[status]++;
        const currentStep = new Date().getTime();
        this.stepLog.push({keyword, name, result: {status, duration: currentStep - this.lastStepTime}});
        this.lastStepTime = currentStep;
    }

    public returnScenarioReport() {
        return this.stepLog;
    }

    public getStatusCount(status: StepStatusEnum): number {
        return this.statusCounter[status];
    }
}

const log = new LogSteps();
export default log;
