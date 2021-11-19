import {
  parseStyle,
  parseProps,
  generateCSS,
  getGlobalClassNames, genStyleClass 
}from './utils';

import { prettierHtmlOpt, prettierJsOpt, prettierCssOpt } from './consts';

export default function exportMod(schema, option) {
  const { prettier, scale = 1, _, responsive, dslConfig } = option;
  const { cssUnit } = dslConfig;

  const fileName = schema.fileName || 'index';

  const isExportGlobalFile = _.get(option, 'dslConfig.globalCss');

  const globalCss = schema.css || '';

  // imports
  let imports = [];

  let style = {}

  // styles

  const links: string[] = [];
  if (isExportGlobalFile) {
    links.push(` <link rel="stylesheet" href="./global.css" />`);
  }
  links.push(`<link rel="stylesheet" href="./${fileName}.css" />`);


  // Global Public Functions
  const utils: string[] = [];

  const width = responsive.width || 750;
  const viewportWidth = responsive.viewportWidth || 375;
  const htmlFontsize = viewportWidth ? viewportWidth / 10 : null;

  // 1vw = width / 100
  const _w = width / 100;

  const _ratio = width / viewportWidth;

  let isPage = false;
  let htmlBody = '';

  // generate render xml
  const generateRender = (schema) => {
    let componentName = schema.componentName || '';
    const type = componentName.toLowerCase();
    const className = schema.props && schema.props.className;
    let classString = schema.classString;

    if (className) {
      style[className] = parseStyle(schema.props.style, {
        scale,
        cssUnit,
      });
    }

    let xml;
    let props = '';

    Object.keys(schema.props).forEach((key) => {
      if ([ 'className', 'style', 'text', 'key', 'codeStyle', 'onClick', 'lines', 'dealGradient' ].indexOf(key) === -1) {
        props += ` ${key}=${parseProps(schema.props[key])}`;
      }
      if (key === 'codeStyle') {
        if (JSON.stringify(schema.props[key]) !== '{}') {
          props += ` style={${parseProps(schema.props[key])}}`;
        }
      }
    });
    switch (type) {
      case 'text':
        let innerText = parseProps(schema.props.text || schema.text, true);
        if (innerText.match(/this\.props/)) {
          innerText = innerText.replace(/this\./, '');
        }
        xml = `<span ${classString}${props}>${innerText || ''}</span>`;
        break;
      case 'image':
      case 'picture':
        if (schema.props.source && schema.props.source.uri) {
          xml = `<img ${classString}${props} />`;
        } else {
          xml = `<img ${classString}${props} />`;
        }
        break;
      case 'div':
      case 'view':
      case 'page':
      case 'block':
      case 'component':
        if (schema.children && schema.children.length) {
          xml = `<div${classString}${props}>${transform(schema.children)}</div>`;
        } else {
          xml = `<div${classString}${props} ></div>`;
        }
        break;
      default:
        componentName = 'div'
        if (schema.children && schema.children.length && Array.isArray(schema.children)) {
          xml = `<${componentName}${classString}${props}>${transform(schema.children)}</${componentName}>`;
        } else if (typeof schema.children === 'string') {
          xml = `<${componentName}${classString}${props} >${schema.children}</${componentName}>`;
        } else {
          xml = `<${componentName}${classString}${props} />`;
        }
    }
    return xml;
  };

  // parse schema
  const transform = (schema, flag = false) => {
    let result = '';
    const blockName = schema.fileName || schema.id;
    if (flag && schema.componentName === 'Page') {
      isPage = true;
    }
    if (Array.isArray(schema)) {
      schema.forEach((layer) => {
        result += transform(layer);
      });
    } else {
      // let type = schema.componentName.toLowerCase();
      // if (isPage && type === 'block') {
      //   type = 'div';
      // }
      result += generateRender(schema);
    }
    return result;
  };

  // option.utils
  if (option.utils) {
    Object.keys(option.utils).forEach((name) => {
      utils.push(`const ${name} = ${option.utils[name]}`);
    });
  }

  // start parse schema
  htmlBody = transform(schema, true);

  const indexValue = prettier.format(
    `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${schema.name || 'Page Title'}</title>
    ${links.map((i) => i).join('\n')}
    <script src="./index.js"></script>
  </head>
  <body>
  ${htmlBody}
  </body>
  </html>
  `,
    prettierHtmlOpt
  );

  const indexValueJs = prettier.format(`window.onload = () => {
  const data = {};
  const $ = window.document.querySelector.bind(window.document);
};`, prettierJsOpt);


const panelDisplay =  [
    {
      panelName: `${fileName}.html`,
      panelValue: indexValue,
      panelType: 'html',
      panelImports: imports
    },
    {
      panelName: `${fileName}.js`,
      panelValue: indexValueJs,
      panelType: 'js'
    },
    {
      panelName: `${fileName}.css`,
      panelValue: prettier.format(
        `${generateCSS(style, '')}`,
        prettierCssOpt
      ),
      panelType: 'css'
    }
  ]


    
  return panelDisplay;
}

