const print = function(value) {
  console.log(value);
};
class Page_0 {
  state = {
    data: [
      {
        title: "小户型卫浴怎样才能装得高大上？",
        coverImage:
          "https://img.alicdn.com/tfs/TB1Txq6o7T2gK0jSZFkXXcIQFXa-684-684.png",
        readCount: 200,
        user: {
          userImage:
            "https://img.alicdn.com/tfs/TB1DWe6oYj1gK0jSZFOXXc7GpXa-60-60.png",
          userName: "时尚家居"
        },
        url: "https://www.imgcook.com"
      },
      {
        title: "拥有超多功能的40平米简约小公寓了解一下",
        coverImage:
          "https://img.alicdn.com/tfs/TB1XRQTo7P2gK0jSZPxXXacQpXa-684-648.png",
        readCount: 500,
        user: {
          userImage:
            "https://img.alicdn.com/tfs/TB1DWe6oYj1gK0jSZFOXXc7GpXa-60-60.png",
          userName: "花花设计工作"
        },
        url: "https://www.imgcook.com/docs"
      }
    ]
  };
  constructor(props, context) {
    console.log("super props");
    this.fetch_example();
    this.jsonp_example();
  }
  isReadCountShow(readCount) {
    return readCount > 300;
  }
  fetch_example() {
    fetchJsonp("https://jsonplaceholder.typicode.com/todos/1", {
      method: "GET",
      headers: '{"Content-Type":"json"}'
    })
      .then(response => response.json())
      .then((data, error) => {
        console.log("fetch example: ", data, error);
        return data;
      })
      .catch(e => {
        console.log("error", e);
      });
  }
  jsonp_example() {
    fetchJsonp("https://assets.airbnb.com/frontend/search_results.js", {
      jsonpCallbackFunction: "search_results",
      body: {}
    })
      .then(response => response.json())
      .then((data, error) => {
        console.log("jsonp example: ", data, error);
        return data;
      })
      .catch(e => {
        console.log("error", e);
      });
  }
  render() {
    return `
<div class="box">
  ${this.state.data.map((item, index) => {
    return `
  <div data-id="div_472" data-url="${item.url}">
    <div class="bd">
      <img
        class="layer"
        src="https://img.alicdn.com/tfs/TB1bLoWoYH1gK0jSZFwXXc7aXXa-684-684.png"
      /><img class="bg" src="${item.coverImage}" />
      <div class="wrap">
        <img
          class="riverdinwei"
          src="https://img.alicdn.com/tfs/TB1mtZRoVT7gK0jSZFpXXaTkpXa-28-36.png"
        /><span class="distance">距离500m</span>
      </div>
    </div>
    <div class="main"><span class="title">${item.title}</span></div>
    <div class="ft">
      <div class="block">
        <img
          class="xianjin"
          src="https://img.alicdn.com/tfs/TB1OvsYoW61gK0jSZFlXXXDKFXa-60-60.png"
        /><span class="fashionHome">${item.user.userName}</span>
      </div>
      ${
        this.isReadCountShow(item.readCount)
          ? `
      <div class="group">
        <img
          class="favorite"
          src="https://img.alicdn.com/tfs/TB1arwYo7T2gK0jSZFkXXcIQFXa-46-44.png"
        /><span class="num">${item.readCount}</span>
      </div>
      `
          : ""
      }
    </div>
  </div>
  `;
  })}
</div>
`;
  }
}
var page = new Page_0();
var html = page.render();
document.querySelector("body").innerHTML = html;
