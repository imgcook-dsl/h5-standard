const {
  parseStyle,
  parseProps,
  isExpression
} = require('./utils');
const { getGlobalClassNames, genStyleClass }  = require('./cssUtils');

function exportMod(schema, option) {
  const { prettier, scale = 1, _, responsive, imgcookConfig } = option;

  const fileName = schema.fileName || 'index';

  const isExportGlobalFile = _.get(option, 'imgcookConfig.globalCss');

  const globalCss = schema.css || '';

  // imports
  let imports = [];

  // styles
  const styles = [];

  const links = [];
  if (isExportGlobalFile) {
    links.push(` <link rel="stylesheet" href="./global.css" />`);
  }
  links.push(`<link rel="stylesheet" href="./${fileName}.css" />`);


  // Global Public Functions
  const utils = [];

  const width = responsive.width || 750;
  const viewportWidth = responsive.viewportWidth || 375;
  const htmlFontsize = viewportWidth ? viewportWidth / 10 : null;

  // 1vw = width / 100
  const _w = width / 100;

  const _ratio = width / viewportWidth;

  let isPage = false;
  let htmlBody = '';

  let classNames = [];

  // generate render xml
  const generateRender = (schema) => {
    const componentName = schema.componentName;
    const type = schema.componentName.toLowerCase();
    const className = schema.props && schema.props.className;
    let classString = '';
    

    if (imgcookConfig.globalCss) {
      const cssResults = getGlobalClassNames(schema.props.style, globalCss);
      if (cssResults.names.length > 0) {
        
        
        classString = ` class="${cssResults.names.join(' ')} ${className}"`;


      } else {
        className && (classString = ` class="${className}"`);
      }
      schema.props.style = cssResults.style;
    }else{
      className && (classString = ` class="${className}"`);
    }


    let commonStyles = {};
    let codeStyles = {};
    Object.keys(schema.props.style || {}).forEach((key) => {
      if (key === 'lines') return;
      if (isExpression(schema.props.style[key])) {
        codeStyles[key] = schema.props.style[key];
      } else {
        commonStyles[key] = schema.props.style[key];
      }
    });

    schema.props.codeStyle = codeStyles;

    if (className && classNames.indexOf(className) === -1) {
      classNames.push(className);
      styles.push(`
        .${className} {
          ${parseStyle(commonStyles, { cssUnit: _.get(option, 'imgcookConfig.cssUnit'), _, responsive })}
        }
      `);
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
  const transform = (schema, flag) => {
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
  // output
  const prettierHtmlOpt = {
    parser: 'html',
    printWidth: 120,
    singleQuote: true
  };
  const prettierCssOpt = {
    parser: 'css'
  };
  const prettierJsOpt = {
    parser: 'babel',
    printWidth: 120,
    singleQuote: true
  };
  const indexValue = prettier.format(
    `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
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
      panelValue: prettier.format(styles.join('\n'), prettierCssOpt),
      panelType: 'css'
    }
  ]

// 只有一个模块时，生成到当前模块
if (isExportGlobalFile && schema.css) {
  panelDisplay.push({
    panelName: `global.css`,
    panelValue: prettier.format(schema.css || '', prettierCssOpt),
    panelType: 'css',
    // folder: folderName,
  });
}

    
  return panelDisplay;
}

module.exports = exportMod;
