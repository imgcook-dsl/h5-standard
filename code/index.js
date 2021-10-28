const print = function(value) {
  console.log(value);
};
class Block_0 {
  state = {
    items: [
      { itemTitle: "111111.8", itemPrice: "80.8" },
      { itemTitle: "111111.8", itemPrice: "80.8" },
      { itemTitle: "111111.8", itemPrice: "80.8" }
    ]
  };
  constructor(props, context) {
    this.__init();
  }
  async __init() {
    this.render();
  }
  render() {
    const state = this.state;
    const html = `
<div class="flex-col mod">
  ${(
    state.items.map((item, index) => {
      return `
  <div class="flex-row row-i0" data-track-type="ALL">
    <div class="flex-row item-wrapper">
      <img
        class="item"
        autoScaling="false"
        autoWebp="false"
        src="https://img.alicdn.com/imgextra/i1/O1CN019xxCyz1U6OCPl00vy_!!6000000002468-2-tps-508-484.png"
      />
    </div>
    <div class="flex-col wrapper">
      <span class="title">${item.itemTitle}</span>
      <div class="flex-row button-wrapper">
        <span class="button">黄油夹心 营养早餐</span>
      </div>
      <span class="tag">爆卖21323件</span>
      <div class="flex-col wrapper-inner">
        <div class="flex-row price-wrapper">
          <span class="label">红包抵后</span><span class="yuan">￥</span
          ><span class="price">${item.itemPrice}</span>
        </div>
        <div class="flex-row group">
          <span class="money-info">原价￥</span><span class="money">10.9</span>
        </div>
      </div>
    </div>
    <div class="flex-row wrapper-1">
      <div
        class="shop-logo"
        source="[object"
        Object]
        autoScaling="false"
        autoWebp="false"
      ></div>
      <span class="caption">马上抢</span>
    </div>
  </div>
  `;
    }) || []
  ).join("")}
</div>
`;
    document.querySelector("body").innerHTML = html;
  }
}
var page = new Block_0();
