const find = require('lodash/find');
const unset = require('lodash/unset');
const camelCase = require('lodash/camelCase');
const kebabCase = require('lodash/kebabCase');
const snakeCase = require('lodash/snakeCase');
const cssParser = require('css/lib/parse');

export const genStyleClass = (string = '', type)=>{
  let classArray = string.split(' ');
  classArray = classArray.filter(name=> !!name);
  classArray = classArray.map(name=>{
    switch(type){
      case 'camelCase': return camelCase(name);
      case 'kebabCase': return kebabCase(name);
      case 'snakeCase': return snakeCase(name);
      default:
        return camelCase(name);
    }
  });
  return classArray.join(' ')
}

// 从 css 解析样式规则饿
export const getCssRules = (text) => {
  if (!cssParser) {
    return [];
  }
  const globalCssResult = cssParser(text, { source: 'global.css' });

  let rules = globalCssResult.stylesheet.rules;
  rules = rules.filter((item) => item.type === 'rule');
  rules = rules.map((item) => {
    let style = {};
    for (let dec of item.declarations) {
      const property = camelCase(dec.property);
      style[property] = dec.value;
    }

    return {
      selectors: item.selectors[0],
      style: style,
    };
  });

  return rules;
};

//  提取全局样式
export const getGlobalClassNames = (cssObject, globalCssString) => {
  let names = [];
  if (!(globalCssString && cssParser)) {
    // 没有全局样式名
    return {
      names,
      style: cssObject,
    };
  }

  // 解析全局 css 规则
  const rules = getCssRules(globalCssString);

  for (let rule of rules) {
    // 按顺序提取样式
    // 仅提取 . 选择符
    const isMatch = find([cssObject], rule.style) && rule.selectors.startsWith('.');
    if (isMatch) {
      for (let key in rule.style) {
        unset(cssObject, key);
      }
      names.push(rule.selectors.replace('.', ''));
    }
  }

  return {
    names,
    style: cssObject,
  };
};