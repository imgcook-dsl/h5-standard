
import { IDslConfig } from './interface';

// output
export const prettierHtmlOpt = {
  parser: 'html',
  printWidth: 120,
  singleQuote: true
};
export const prettierCssOpt = {
  parser: 'css'
};
export const prettierJsOpt = {
  parser: 'babel',
  printWidth: 120,
  singleQuote: true
};

export const CSS_TYPE = {
  MODULE_CLASS: 'module',
  MODULE_STYLE: 'module_style',
  IMPORT_CLASS: 'import',
  INLINE_CSS: 'inline',
}

// 记录全局参数配置，初始化时直接修改
export let DSL_CONFIG: IDslConfig = {
  globalCss: true,
  cssUnit: 'px',
  renderType: 'html',
  cssStyle: 'camelCase',
  htmlFontSize: 16
};


export const initConfig = (cfg) => {
  DSL_CONFIG = Object.assign(DSL_CONFIG, cfg)
}

