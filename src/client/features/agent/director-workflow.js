export function inferProductProfile(file) {
  const name = (file?.name || "").toLowerCase();
  if (/bath|shower|toilet|handle|hinge|hardware|浴|卫浴|拉手|门|五金/.test(name)) {
    return { type: "卫浴五金产品", name: file?.name?.replace(/\.[^.]+$/, "") || "卫浴五金产品" };
  }
  if (/appliance|kettle|heater|plug|socket|小家电|电器|插座/.test(name)) {
    return { type: "小家电产品", name: file?.name?.replace(/\.[^.]+$/, "") || "小家电产品" };
  }
  if (/door|window|cabinet|门|窗|柜/.test(name)) {
    return { type: "家居建材产品", name: file?.name?.replace(/\.[^.]+$/, "") || "家居建材产品" };
  }
  if (/dress|skirt|shirt|clothes|fashion|lace|服装|女装|连衣裙|蕾丝|穿搭/.test(name)) {
    return { type: "服装时尚产品", name: file?.name?.replace(/\.[^.]+$/, "") || "服装产品" };
  }
  if (/toy|figure|doll|plush|公仔|潮玩|手办|毛绒|玩具/.test(name)) {
    return { type: "潮玩角色产品", name: file?.name?.replace(/\.[^.]+$/, "") || "潮玩产品" };
  }
  return { type: "工业产品", name: file?.name?.replace(/\.[^.]+$/, "") || "产品" };
}

export const inferDirectorProductProfile = inferProductProfile;

export function buildDirectorPrompt({ productNode, action, getTitle }) {
  const productType = productNode.dataset.productType || "产品";
  const productName = productNode.dataset.productName || getTitle(productNode);
  return `${action.prompt}\n产品类型：${productType}\n产品名称：${productName}\n请保持产品核心结构可信，输出适合商业展示的高质量结果。`;
}

export function buildTextAssetDescription({ productNode, action, getTitle }) {
  const productName = productNode.dataset.productName || getTitle(productNode);
  if (action.kind === "script") {
    return "15秒视频脚本：1. 产品干净入场；2. 细节特写展示材质；3. 场景中安装使用；4. 字幕突出耐用、易安装、高级质感；5. 结尾出现产品名称与行动号召。";
  }
  return `核心卖点：高级质感、耐用结构、安装便捷、适配现代空间、适合电商主图和详情页延展。建议标题：${productName}，让空间细节更有品质。`;
}

export function getDirectorActionWindow({ actions, start = 0, count = 3 }) {
  return Array.from({ length: count }, (_, index) => actions[(start + index) % actions.length]);
}
