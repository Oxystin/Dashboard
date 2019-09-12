export default function transformProps(chartProps) {
    const { width, height, formData, payload } = chartProps;
    const { numberFormat,waterfallColorTotal ,waterfallColorPositive ,waterfallColorNegative } = formData;

    function componentToHex(c) {
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }
    
    function rgbToHex(r, g, b) {
      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    return {
      width,
      height,
      data: payload.data,
      numberFormat,
      chartId:formData.sliceId,
      ColorTotal: rgbToHex(waterfallColorTotal.r, waterfallColorTotal.g, waterfallColorTotal.b),
      ColorPositive: rgbToHex(waterfallColorPositive.r, waterfallColorPositive.g, waterfallColorPositive.b),
      ColorNegative: rgbToHex(waterfallColorNegative.r, waterfallColorNegative.g, waterfallColorNegative.b),
    };
  }