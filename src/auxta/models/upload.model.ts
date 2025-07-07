export class UploadModel {
    private readonly _organization: string;

    constructor(org: string, baseUrl: string, digitalProduct: string, environment: string, bucket: string, isOfficial: boolean, toRetry: boolean = false) {
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
        this._isOfficial = isOfficial;
        this._toRetry = toRetry;
    }

    private _reportId: string;

    get reportId(): string {
        return this._reportId;
    }

    set reportId(value: string) {
        this._reportId = value;
    }

    private _nextSuites: [];

    get nextSuites(): [] {
        return this._nextSuites;
    }

    set nextSuites(value: []) {
        this._nextSuites = value;
    }

    private _digitalProduct: string;

    get digitalProduct(): string {
        return this._digitalProduct;
    }

    set digitalProduct(value: string) {
        this._digitalProduct = value;
    }

    private _baseUrl: string;

    get baseUrl(): string {
        return this._baseUrl;
    }

    set baseUrl(value: string) {
        this._baseUrl = value;
    }

    private _bucket: string;

    get bucket(): string {
        return this._bucket;
    }

    set bucket(value: string) {
        this._bucket = value;
    }

    private _environment: string;

    get environment(): string {
        return this._environment;
    }

    set environment(value: string) {
        this._environment = value;
    }

    private _currentSuite: string;

    get currentSuite(): string {
        return this._currentSuite;
    }

    set currentSuite(value: string) {
        this._currentSuite = value;
    }

    private _retries: number;

    get retries(): number {
        return this._retries;
    }

    set retries(value: number) {
        this._retries = value;
    }

    private _featureName: string;

    get featureName(): string {
        return this._featureName;
    }

    set featureName(value: string) {
        this._featureName = value;
    }

    private _scenarioName: string;

    get scenarioName(): string {
        return this._scenarioName;
    }

    set scenarioName(value: string) {
        this._scenarioName = value;
    }

    private _isOfficial: boolean;

    get isOfficial(): boolean {
        return this._isOfficial;
    }

    set isOfficial(value: boolean) {
        this._isOfficial = value;
    }

    private _toRetry: boolean;

    get toRetry(): boolean {
        return this._toRetry;
    }

    set toRetry(value: boolean) {
        this._toRetry = value;
    }

    get organization(): string {
        return this._organization;
    }
}