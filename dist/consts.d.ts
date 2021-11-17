import { IDslConfig } from './interface';
export declare const prettierHtmlOpt: {
    parser: string;
    printWidth: number;
    singleQuote: boolean;
};
export declare const prettierCssOpt: {
    parser: string;
};
export declare const prettierJsOpt: {
    parser: string;
    printWidth: number;
    singleQuote: boolean;
};
export declare const CSS_TYPE: {
    MODULE_CLASS: string;
    MODULE_STYLE: string;
    IMPORT_CLASS: string;
    INLINE_CSS: string;
};
export declare let DSL_CONFIG: IDslConfig;
export declare const initConfig: (cfg: any) => void;
