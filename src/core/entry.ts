import {
  line2Hump,
  transComponentsMap,
  initSchema,
  traverse,
  genStyleClass,
  getGlobalClassNames,
  genStyleCode,
} from './utils';

import { CSS_TYPE, DSL_CONFIG,initConfig } from './consts';

import exportStatic from './exportStatic';
import exportDynamic from './exportDynamic';
import exportGlobalCss from './exportGlobalCss'

module.exports = function (schema, option) {

  const dslConfig = Object.assign({}, DSL_CONFIG, option._.get(schema, 'imgcook.dslConfig')); 
  option.scale = 750 / ((option.responsive && option.responsive.width) || 750);
  option.dslConfig = dslConfig;
  initConfig(dslConfig);

    // clear schema
  initSchema(schema);


  // 样式名处理：指定命名风格
  traverse(schema, (json) => {
    if (json.props && json.props.className) {
      json.props.className = genStyleClass(
        json.props.className,
        dslConfig.cssStyle
      );
    }
  });

  // 提取全局样式，类名数组存于 json.classString , 剩余样式覆盖 style
  traverse(schema, (json) => {
    let className = json.props && json.props.className;
    let classString = '';
    let style = json.props.style;
   
    // inline 
    let classnames: string[] = []
    let enableGlobalCss = dslConfig.globalCss && schema.css
 
    // 计算全局样式类名
    if (enableGlobalCss) {
      const cssResults = getGlobalClassNames(style, schema.css);
      if (cssResults.names.length > 0) {
        classnames = cssResults.names
      } 
      style = cssResults.style;
    } 
    
    classnames.push(className);
    classString = ` class="${classnames.join(' ')}"`;
    
    json.props.style = style;
    json.classString = classString;
  });



  let panelDisplay;

  schema.fileName = 'index';
  if (dslConfig.renderType == 'javascript') {
    panelDisplay = exportDynamic(schema, option);
  } else {
    panelDisplay = exportStatic(schema, option);
  }


      
  // 全局样式
  panelDisplay = panelDisplay.concat(exportGlobalCss(schema, option));


  return {
    panelDisplay: panelDisplay,
    noTemplate: true,
  };
};
