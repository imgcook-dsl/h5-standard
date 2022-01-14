
export interface IPanelDisplay {
  panelName: string;
  panelValue: string;
  panelType: string;
  folder?: string;
  panelImports?: IImport[]
}

export interface IImport {
  _import: string;
  package: string;
  version: string;
}

export interface IDslConfig {
  globalCss?: boolean;
  cssUnit?: 'px' | 'vw' | 'rpx' | 'rem';
  renderType?: 'javascript' | 'html';
  cssStyle?: 'kebabCase' | 'camelCase' | 'snakeCase',
  responseWidth?: number;
  scale: number;
  htmlFontSize?: number
}