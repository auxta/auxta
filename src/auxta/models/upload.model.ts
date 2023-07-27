
export class UploadModel {
    private _reportId: string;
    private _nextSuites: [];
    private _digitalProduct: string;
    private _baseUrl: string;
    private readonly _organization: string;
    private _bucket: string;
    private _environment: string;
    private _currentSuite: string;
    private _retries: number;
    private _featureName: string;
    private _scenarioName: string;

    constructor(org: string, baseUrl: string, digitalProduct: string, environment: string, bucket: string) {
        this._reportId = '';
        this._nextSuites = [];
        this._currentSuite = '';
        this._retries = 0
        this._organization = org;
        this._bucket = bucket
        this._digitalProduct = digitalProduct;
        this._environment = environment;
        this._baseUrl = baseUrl;
        this._featureName = '';
        this._scenarioName = '';
    }

    set currentSuite(value: string) {
        this._currentSuite = value;
    }

    set retries(value: number) {
        this._retries = value;
    }

    get currentSuite(): string {
        return this._currentSuite;
    }

    get bucket(): string {
        return this._bucket;
    }

    set bucket(value: string) {
        this._bucket = value;
    }

    get retries(): number {
        return this._retries;
    }

    get reportId(): string {
        return this._reportId;
    }

    set reportId(value: string) {
        this._reportId = value;
    }

    get nextSuites(): [] {
        return this._nextSuites;
    }

    set nextSuites(value: []) {
        this._nextSuites = value;
    }

    get digitalProduct(): string {
        return this._digitalProduct;
    }

    set digitalProduct(value: string) {
        this._digitalProduct = value;
    }

    get organization(): string {
        return this._organization;
    }

    get baseUrl(): string {
        return this._baseUrl;
    }

    set baseUrl(value: string) {
        this._baseUrl = value;
    }

    get environment(): string {
        return this._environment;
    }

    set environment(value: string) {
        this._environment = value;
    }
    get featureName(): string {
        return this._featureName;
    }

    set featureName(value: string) {
        this._featureName = value;
    }

    get scenarioName(): string {
        return this._scenarioName;
    }

    set scenarioName(value: string) {
        this._scenarioName = value;
    }
}