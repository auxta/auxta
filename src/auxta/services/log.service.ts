import { StepStatusEnum } from "../enums/step-status.enum";

export namespace Log {
    export interface Step {
        keyword: string,
        name: string,
        result: {
            status: StepStatusEnum,
            duration: number
        }
    }

    export class LogSteps {
        private stepLog: Log.Step[] = [];
        private statusCounter = {
            [StepStatusEnum.PASSED]: 0,
            [StepStatusEnum.FAILED]: 0,
            [StepStatusEnum.SKIPPED]: 0,
            [StepStatusEnum.SUGGESTION]: 0,
        }

        public addSuggestion(text: string) {
            this.push('Suggest', text, StepStatusEnum.SUGGESTION, 1000000);
        }

        public clear() {
            this.stepLog = [];
        }
        
        public push(keyword: string, name: string, status: StepStatusEnum, duration: number) {
            console.log(`System log -- status: ${status} -- : ${name} `);
            this.statusCounter[status] = this.statusCounter[status] + 1;
            this.stepLog.push({ keyword: keyword, name: name, result: { status: status, duration: duration } });
        }
        
        public returnScenarioReport() {
            return this.stepLog;
        }

        public getStatusCount(status: StepStatusEnum): number{
            return this.statusCounter[status];
        }
    }
}

export default new Log.LogSteps();
