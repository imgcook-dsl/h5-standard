export default function exportMod(schema: any, option: any): ({
    panelName: string;
    panelValue: any;
    panelType: string;
    panelImports: never[];
} | {
    panelName: string;
    panelValue: any;
    panelType: string;
    panelImports?: undefined;
})[];
