const co = require('co');
const xtpl = require('xtpl');
const request = require('request');
const fs = require('fs');
const thunkify = require('thunkify');
const path = require('path');

const { NodeVM } = require('vm2');
const _ = require('lodash');
const data = require('./data');
const componentsMap = require('./components-map');
const helper = require('@imgcook/dsl-helper');

// const entry = require('../src/entry');

const prettier = require('prettier/standalone');

const parserHtml = require('prettier/parser-html');
const parserBabel = require('prettier/parser-babel');
const parserCss = require('prettier/parser-postcss');
const parserMarkDown = require('prettier/parser-markdown');

const browerParser = {
  babel: parserBabel,
  json: parserBabel,
  vue: parserHtml,
  css: parserCss,
  scss: parserCss,
  less: parserCss,
  html: parserHtml,
  md: parserMarkDown,
};

const baseDir = '../code';

const vm = new NodeVM({
  console: 'inherit',
  sandbox: {},
});

const formatFileImage = async (panelDisplay) => {
  let allImage = [];
  const imgReg =
    /(https?):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|](\.png|\.jpg)/g;

  for (let file of panelDisplay) {
    const fileValue = file.panelValue;
    // 解决外部用户需要下载图片asset到本地
    const imgArr = fileValue.match(imgReg);
    if (imgArr) {
      for (let img of imgArr) {
        allImage.push({
          src: img,
        });
      }
    }
  }

  // 只有oss的图片才需要替换
  allImage = allImage.filter((item) => {
    return item.src.includes('ai-sample.oss-cn-hangzhou.aliyuncs.com');
  });

  // 所有图片
  let images = allImage.map((item, index) => {
    let suffixs = (item.src || '').split('.');
    let suffix = suffixs[suffixs.length - 1];
    const imgName = `img_${index}.${suffix}`;

    return {
      folder: 'images',
      content: item.src,
      name: imgName,
      fileType: suffix,
      type: 'image',
    };
  });

  if (allImage.length > 0) {
    mkDirsSync(path.join(__dirname, baseDir, 'images'));
  }

  for (let img of images) {
    await download_img(
      img.content,
      path.join(__dirname, baseDir, 'images/') + img.name
    );
  }

  function getCharCount(str = '', char) {
    var regex = new RegExp(char, 'g'); // 使用g表示整个字符串都要匹配
    var result = str.match(regex); //match方法可在字符串内检索指定的值，或找到一个或多个正则表达式的匹配。
    var count = !result ? 0 : result.length;
    return count;
  }

  // 替换图片
  for (let file of panelDisplay) {
    file.panelValue = file.panelValue.replace(imgReg, function (value) {
      const img = _.find(images, { content: value });
      if (img) {
        const deep = getCharCount(file.folder || '', '/');
        return `${deep == 0 ? './' : new Array(deep + 2).join('../')}images/${
          img.name
        }`;
      } else {
        return value;
      }
    });
  }

  return images;
};

const runCode = (data, dslConfig) => {
  data = _.cloneDeep(data);
  const config = _.get(data, 'imgcook.dslConfig', {});
  _.set(data, 'imgcook.dslConfig', Object.assign(config, dslConfig));

  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/index.js'),
    'utf8'
  );

  const files = vm.run(code)(data, {
    prettier: {
      format: (str, opt) => {
        if (opt && browerParser[opt.parser]) {
          opt.plugins = [browerParser[opt.parser]];
        } else {
          return str;
        }
        try {
          return prettier.format(str, opt);
        } catch (e) {
          console.error('format error', e);
          return str;
        }
      },
    },
    _: _,
    responsive: {
      width: 750,
      viewportWidth: 375,
    },
    helper,
    componentsMap,
  });

  // const files = entry(data, {
  //   prettier: {
  //     format: (str, opt) => {
  //       return prettier.format(str, opt)
  //     }
  //   },
  //   _: _,
  //   responsive: {
  //     width: 750,
  //     viewportWidth: 375,
  //   },
  //   helper,
  //   componentsMap,
  // });
  return files.panelDisplay;
};

async function download_img(img_url, file_name) {
  await request(img_url)
    .pipe(fs.createWriteStream(file_name));
}

async function main() {
  const panelDisplay = runCode(data, {
    // cssUnit: 'vw',
    // renderType: 'html',
    // globalCss: true,
  });
  // const renderInfo = vm.run(code)(data, {
  //   prettier: prettier,
  //   _: _,
  //   responsive: {
  //     width: 750,
  //     viewportWidth: 375,
  //   },
  //   helper,
  //   componentsMap,
  // });

  // const renderInfo = entry(data, {
  //   prettier: {
  //     format: (str, opt) => {
  //       return prettier.format(str, opt)
  //     }
  //   },
  //   _: _,
  //   responsive: {
  //     width: 750,
  //     viewportWidth: 375,
  //   },
  //   helper,
  //   componentsMap,
  // })

  if (fs.existsSync(path.join(__dirname, baseDir))) {
    fs.rmdirSync(path.join(__dirname, baseDir), { recursive: true });
  }
  mkDirsSync(path.join(__dirname, baseDir));

  // 生成到目标目录运行
  await formatFileImage(panelDisplay);
  panelDisplay.forEach((file) => {
    if (file.folder) {
      let fileFolder = path.join(__dirname, `${baseDir}/${file.folder}`);
      if (!fs.existsSync(fileFolder)) {
        mkDirsSync(fileFolder);
      }
      fs.writeFileSync(
        path.join(__dirname, `${baseDir}/${file.folder}/${file.panelName}`),
        file.panelValue
      );
    } else {
      fs.writeFileSync(
        path.join(__dirname, `${baseDir}/${file.panelName}`),
        file.panelValue
      );
    }
  });
}

main();

function mkDirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkDirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

module.exports = {
  runCode,
};
