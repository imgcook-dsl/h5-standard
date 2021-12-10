import {
  toString,
  isExpression,
  parseFunction,
  parseProps as _parseProps,
  parseCondition,
  parseLoop,
  parseStyle,
  generateCSS
} from './utils';

import { prettierJsOpt, prettierHtmlOpt, prettierCssOpt } from './consts';


const parseProps =  function(value, isReactNode?){
  const result = _parseProps(value, isReactNode);
  if(isExpression(value)){
    return `\$\{${result}\}`
  }else{
    return result
  }

}

export default function (schema, option) {
  const { prettier, scale = 1, _, responsive, dslConfig } = option;

  const fileName = schema.fileName || 'index';
  const cssUnit = _.get(option, 'dslConfig.cssUnit');

  // imports
  const imports: string[]  = [];

  // inline style
  const style = {};

  // Global Public Functions
  const utils: string[]  = [];

  const isExportGlobalFile = _.get(option, 'dslConfig.globalCss');
  const links: string[] = [];
  if (isExportGlobalFile) {
    links.push(` <link rel="stylesheet" href="./global.css" />`);
  }
  links.push(`<link rel="stylesheet" href="./${fileName}.css" />`);


  // Classes
  const classes: string[]  = [];

  // events
  const events: string[]  = [];

  let classNames: string[]  = [];

  const globalCss = schema.css || '';

  // 1vw = width / 100
  const _w = ((option.responsive && option.responsive.width) || 750) / 100;



  // parse async dataSource
  const parseDataSource = (data) => {
    const name = data.id;
    const { uri, method, params } = data.options;
    const action = data.type;
    let payload = {};

    switch (action) {
      case 'fetch':
        payload = {
          method: method,
        };

        break;
      case 'jsonp':
        if (
          imports.indexOf(
            `<script src="https://cdn.bootcss.com/fetch-jsonp/1.1.3/fetch-jsonp.js"></script>`
          ) === -1
        ) {
          imports.push(
            `<script src="https://cdn.bootcss.com/fetch-jsonp/1.1.3/fetch-jsonp.js"></script>`
          );
        }
        break;
    }

    Object.keys(data.options).forEach((key) => {
      if (['uri', 'method', 'params'].indexOf(key) === -1) {
        payload[key] = toString(data.options[key]);
      }
    });

    // params parse should in string template
    if (params && method !== 'GET') {
      payload = `${toString(payload).slice(0, -1)} ,body: ${isExpression(params) ? parseProps(params) : toString(params)
        }}`;
    } else {
      payload = toString(payload);
    }

    let result = `{
      return ${action !== 'jsonp' ? action : 'fetchJsonp'}(${parseProps(
      uri
    )}, ${toString(payload)})
        .then((response) => response.json())
    `;

    if (data.dataHandler) {
      const { params, content } = parseFunction(data.dataHandler);
      result += `.then((${params}) => {${content}})
        .catch((e) => {
          console.log('error', e);
        })
      `;
    }

    result += '}';

    return `${name}() ${result}`;
  };

  // generate render xml
  const generateRender = (schema) => {
    const type = schema.componentName.toLowerCase();
    const className = schema.props && schema.props.className;
    let elementId = '';
    let elementIdString = '';

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
      if (['className', 'style', 'text', 'src', 'lines'].indexOf(key) === -1) {
        if (/^on/.test(key) && typeof schema.props[key] === 'function') {
          const { params, content } = parseFunction(schema.props[key]);
          elementId = `${schema.componentName.toLowerCase()}_${parseInt(
            String(Math.random() * 1000)
          )}`;
          elementIdString = ` data-id="${elementId}"`;
          events.push(`
            document.querySelectorAll('[data-id="${elementId}"]').forEach(function(element) {
              element.addEventListener('${key
              .slice(2)
              .toLowerCase()}', function(${params}) {
                ${content}
              });
            });
          `);
        } else {

          if (key === 'codeStyle') {
            if (JSON.stringify(schema.props[key]) !== '{}') {
              props += ` style={${parseProps(schema.props[key])}}`;
            }
          } else {
            props += ` ${key}=${parseProps(schema.props[key])}`;
          }

        }
      }
    });
    switch (type) {
      case 'text':
        const innerText = parseProps(schema.props.text, true);
        xml = `<span ${elementIdString} ${classString} ${props}>${innerText}</span>`;
        break;
      case 'image':
      case 'picture':
        const source = parseProps(_.get(schema, 'props.src') || _.get(schema, 'props.source.uri'));
        xml = `<img ${elementIdString} ${classString} ${props} src=${source} />`;
        break;
      case 'div':
      case 'page':
      case 'block':
      case 'component':
        if (schema.children && schema.children.length) {
          xml = `<div ${elementIdString} ${classString} ${props} >${transform(
            schema.children
          )}</div>`;
        } else {
          xml = `<div${elementIdString}${classString}${props}></div>`;
        }
        break;
      default:
        if (schema.children && schema.children.length) {
          xml = `<div${elementIdString}${classString}${props}>${transform(
            schema.children
          )}</div>`;
        } else {
          xml = `<div${elementIdString}${classString}${props}></div>`;
        }
    }

    if (schema.loop) {
      const parseLoopData = parseLoop(schema.loop, schema.loopArgs, xml, {
        formatRender: (str)=>{
          return '`' + str + '`'
        }
      });
      xml = parseLoopData.value + '.join("")';
    }
    if (schema.condition) {
      xml = parseCondition(schema.condition, xml);
    }
    if (schema.loop || schema.condition) {
      xml = `\$\{${xml}\}`;
    }


    return xml;
  };

  // parse schema
  const transform = (schema) => {
    let result = '';

    if (Array.isArray(schema)) {
      schema.forEach((layer) => {
        result += transform(layer);
      });
    } else {
      const type = schema.componentName.toLowerCase();

      if (['page', 'block', 'component'].indexOf(type) !== -1) {
        // 容器组件处理: state/method/dataSource/lifeCycle/render
        const states: string[]  = [];
        const lifeCycles: string[]  = [];
        const methods: string[]  = [];
        const init: string[]  = [];
        let  html = '';
        const render = [
          `render(){ 
          const state = this.state;
          const html = \``,
        ];
        let classData = [`class ${schema.componentName}_${classes.length} {`];
        if (schema.state) {
          states.push(`state = ${toString(schema.state)}`);
        }

        if (schema.methods) {
          Object.keys(schema.methods).forEach((name) => {
            const { params, content } = parseFunction(schema.methods[name]);
            methods.push(`${name}(${params}) {${content}}`);
          });
        }

        if (schema.dataSource && Array.isArray(schema.dataSource.list)) {
          schema.dataSource.list.forEach((item) => {
            if (typeof item.isInit === 'boolean' && item.isInit) {
              init.push(`this.state.${item.id} =  await this.${item.id}();`);
            } else if (typeof item.isInit === 'string') {
              init.push(
                `if (${parseProps(item.isInit)}) { this.state.${item.id
                } =  await this.${item.id}(); }`
              );
            }
            methods.push(parseDataSource(item));
          });

          if (schema.dataSource.dataHandler) {
            const { params, content } = parseFunction(
              schema.dataSource.dataHandler
            );
            methods.push(`dataHandler(${params}) {${content}}`);
          }
        }

        methods.push(`async __init(){
          ${init.join('\n')}
          ${schema.dataSource && schema.dataSource.dataHandler
            ? `this.state = this.dataHandler(this.state)`
            : ''
          };
          this.render();
        }`);

        if (!schema.lifeCycles || !schema.lifeCycles['_constructor']) {
          lifeCycles.push(`constructor(props, context) {  this.__init();}`);
        }

        if (schema.lifeCycles) {
          Object.keys(schema.lifeCycles).forEach((name) => {
            const { params, content } = parseFunction(schema.lifeCycles[name]);

            if (name === '_constructor') {
              lifeCycles.push(
                `constructor(${params}) { ${content}; this.__init();}`
              );
            }
          });
        }

        html =  prettier.format(generateRender(schema), prettierHtmlOpt);
        render.push(html);
        render.push('`;\n  document.querySelector("body").innerHTML = html; }');

        classData = classData
          .concat(states)
          .concat(lifeCycles)
          .concat(methods)
          .concat([
            prettier.format(render.join(''), {
              parser: 'html',
              rangeStart: 0,
            }),
          ]);
        classData.push('}');

        classes.push(classData.join('\n'));
      } else {
        result += generateRender(schema);
      }
    }

    return result;
  };

  if (option.utils) {
    Object.keys(option.utils).forEach((name) => {
      utils.push(`const ${name} = ${option.utils[name]}`);
    });
  }

  // start parse schema
  transform(schema);

  const panelDisplay = [
    {
      panelName: `${fileName}.html`,
      panelValue: prettier.format(
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="ie=edge">
          <title>Document</title>
          ${links.map((i) => i).join('\n')}
          ${imports.join('\n')}
        </head>
        <body>
        </body>
        <script src="./index.js"></script>
        <script>
          ${events.join('\n')}
          </script>
        </html>
      `,
        prettierHtmlOpt
      ),
      panelType: 'html',
    },
    {
      panelName: `${fileName}.js`,
      panelValue: prettier.format(
        `${utils.join('\n')}
        ${classes.join('\n')}
        var page = new ${schema.componentName}_0;
      `,
        prettierJsOpt
      ),
      panelType: 'js',
    },
    {
      panelName: `${fileName}.css`,
      panelValue: prettier.format(
        `${generateCSS(schema.commonStyles, '')}${generateCSS(style, '')}`,
        prettierCssOpt
      ),
      panelType: 'css'
    }

  ];

  return panelDisplay;
};
