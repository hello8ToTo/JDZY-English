# 车展区本地集成

主系统左侧导航“车展区”按需加载 `embed.html`，样式和脚本隔离，不影响其他模块。

`explorer.bundle.js` 已将 Three.js、控制器、模型解析器及 GLB 模型打包为普通脚本，因此直接打开主系统 HTML 时不需要启动服务器，也不依赖同事的在线网站。运行时仍需浏览器支持 WebGL。

保留原模块的 12 个部件、中英文名称、音标、旋转缩放、四种视角、重置视角与可拖动名称框。离开车展区时暂停模型渲染，返回后保留当前视角。

修改 `app.js` 或模型后，需要在本目录重新构建：

```powershell
npm exec --offline --yes --package=esbuild -- esbuild app.js --bundle --format=iife --platform=browser --target=es2022 --alias:three=./vendor/three.module.js --loader:.glb=binary --loader:.gz=binary --minify --outfile=explorer.bundle.js
```

主系统只加载 `embed.html`。原压缩包的 `index.html`、模型、依赖源码和嵌入说明保留作为参考；今后部署须包含 `embed.html`、`style.css`、`embed.css` 和 `explorer.bundle.js`。

性能缓存：`outline.json` 是预采样轮廓；`highlights.bin.gz` 是预计算、索引化的 12 个高亮区域，位置精度为 0.1 mm。模型本体未修改。若修改模型或部件区域规则，先在项目根目录构建并运行 `work/build-showroom-performance.mjs`，重新生成两份缓存，再打包。缓存及模型均嵌入普通脚本，仍支持本地直接打开 HTML，无需后端。浏览器需支持 DecompressionStream（现代 Chrome / Edge）。鼠标悬停不再执行重型射线检测，仅真正点击时检测。
