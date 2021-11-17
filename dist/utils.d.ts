export declare const getCssRules: (text: string) => {
    selectors: string;
    style: any;
}[];
export declare const getGlobalClassNames: (cssObject: any, globalCssString: any) => {
    names: string[];
    style: any;
};
export declare const isExpression: (value: any) => boolean;
export declare const line2Hump: (str: any) => any;
export declare const isEmptyObj: (o: any) => boolean;
interface IComp {
    list?: {
        name: string;
        packageName: string;
        dependenceVersion: string;
        dependence: string;
    }[];
}
export declare const transComponentsMap: (compsMap?: IComp) => {};
export declare const toString: (value: any) => any;
export declare const toUpperCaseStart: (value: any) => any;
export declare const initSchema: (schema: any) => void;
export declare const traverse: (json: any, callback: any) => void;
export declare const genStyleClass: (string: any, type: any) => any;
export declare const genStyleCode: (styles: any, key: any) => string;
export declare const parseNumberValue: (value: any, { cssUnit, scale }: {
    cssUnit?: string | undefined;
    scale: any;
}) => any;
export declare const parseStyle: (style: any, params: any) => {};
export declare const parseFunction: (func: any) => {
    params: any;
    content: any;
};
export declare const parseProps: (value: any, isReactNode?: any) => any;
export declare const parseCondition: (condition: any, render: any) => string | undefined;
export declare const parseCamelToLine: (string: any) => any;
export declare const generateCSS: (style: any, prefix: any) => string;
export declare const parseLoop: (loop: any, loopArg: any, render: any, { formatRender }: {
    formatRender: any;
}) => {
    hookState: never[];
    value: string;
};
export declare const parseState: (states: any) => string;
export declare const replaceState: (render: any) => any;
export declare const parseLifeCycles: (schema: any, init: any) => string[];
export declare const existImport: (imports: any, singleImport: any) => boolean;
export declare const parseDataSource: (data: any, imports?: {
    _import: string;
    package: string;
    version: string;
}[]) => {
    value: string;
    functionName: any;
    functionBody: string;
    imports: {
        _import: string;
        package: string;
        version: string;
    }[];
};
export declare const transAnimation: (animation: any) => string;
export declare const addAnimation: (schema: any) => string;
export {};
