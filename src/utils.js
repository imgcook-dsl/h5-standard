// 不要引入整个库
import find from 'lodash/find' 
import unset from 'lodash/unset' 
import camelCase from 'lodash/camelCase' 
const cssParser = require('css/lib/parse');

// CSS 转换工具方法
export class CssTransformer {
  constructor(options) {
    this.options = options;
    this.globalCssFile = '';
  }

  setGlobalStyle(text) {
    this.globalCssFile = text;
  }

  css2js(content) {
    const cssExtractor = /([\w-]+)\s*:\s*(.*)\s*/;
    const cssObject = {};
    (typeof content === 'string' ? content : '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const matchResult = s.match(cssExtractor);
        if (matchResult) {
          cssObject[
            matchResult[1].replace(/-(\w)/g, (_args, cap) =>
              cap.toLocaleUpperCase()
            )
          ] = matchResult[2].trim().replace(/;+$/, '');
        }
      });
    return cssObject;
  }
  js2css(cssObject) {
    return Object.keys(cssObject)
      .map(
        (s) =>
          `${
            s.startsWith('--')
              ? s
              : s.replace(/([A-Z])/g, '-$1').toLocaleLowerCase()
          }: ${cssObject[s]};`
      )
      .join('\n');
  }
  sort(cssString) {
    return cssString
      .split('\n')
      .sort()
      .filter(Boolean)
      .join('\n');
  }

  // 将 css 文本规则解析成 css样式
  file2cssRules(text) {
    if (!cssParser) {
      return [];
    }
    this.globalCssResult = cssParser(text, { source: 'source.css' });

    let rules = this.globalCssResult.stylesheet.rules;
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
  }

  // 提取样式名
  obj2class(cssObject) {
    let names = [];
    if (!(this.globalCssFile && cssParser)) {
      // 没有全局样式名
      return {
        names,
        style: cssObject,
      };
    }

    // 解析全局 css 规则
    const rules = this.file2cssRules(this.globalCssFile);

    // console.log('rules', rules)
    for (let rule of rules) {
      // 按顺序提取样式
      const isMatch = find([cssObject], rule.style);
      if (isMatch) {
        for (let key in rule.style) {
          unset(cssObject, key);
        }
        names.push(rule.selectors.replace('.',''));
      }
    }

    return {
      names,
      style: cssObject,
    };
  }
}
