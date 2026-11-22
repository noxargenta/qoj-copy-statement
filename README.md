# QOJ 一键复制题面（含公式和样例）

将 QOJ 当前语言的题面一键复制为 Markdown，保留 LaTeX 公式、输入输出格式、样例、表格和图片链接。

## 安装

1. 在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/) 等用户脚本管理器。
2. 点击 [安装脚本](https://raw.githubusercontent.com/noxargenta/qoj-copy-statement/main/qoj-copy-statement.user.js)，在脚本管理器中确认安装。
3. 打开任意 [QOJ 题目](https://qoj.ac/)，在 Statement 页面使用右下角的「复制题面（含公式）」按钮。

也可以通过脚本管理器菜单中的「复制当前题面（Markdown + LaTeX）」执行复制。

## 功能

- 复制当前显示语言的题面，并附上题目标题和来源链接。
- 将 MathJax 2 的 TeX 源码及 KaTeX 注释转换为 `$...$` / `$$...$$`，避免重复输出渲染节点。
- 将样例和代码转换为围栏代码块，保留其中的空格与空行。
- 支持标题、列表、引用、链接、图片以及上下标。
- 普通表格转换为 Markdown；包含合并单元格的表格保留 HTML。
- 将普通链接和图片地址转换为绝对地址。
- 支持普通题目页和比赛题目页，以及题面延迟加载。

## 适用页面

- `https://qoj.ac/problem/*`
- `https://qoj.ac/contest/*/problem/*`

## 权限与隐私

脚本仅声明 `GM_setClipboard` 和 `GM_registerMenuCommand` 权限，用于写入剪贴板及添加菜单。没有外部依赖、统计或上传请求；题面转换在本地浏览器中完成。复制结果中的图片仍是链接，Markdown 阅读器加载图片时可能访问原站。

## 已知限制

- 请在题面和公式加载完成后复制；页面结构或公式渲染方式变化可能需要适配。
- Markdown 阅读器需要支持 LaTeX 才能显示公式，并支持 HTML 才能完整展示合并单元格和上下标。
- 图片以链接形式保留，不会下载或嵌入图片文件。
- 本项目为第三方工具，与 QOJ 官方无关联。MIT 许可证适用于脚本代码，题面内容版权归原权利人所有。

## 开发与反馈

主文件为 `qoj-copy-statement.user.js`，无构建步骤。可使用 Node.js 检查语法：

```sh
node --check qoj-copy-statement.user.js
```

修改后在脚本管理器中导入本地文件，打开 QOJ 题目页手动检查复制结果。请通过 [GitHub Issues](https://github.com/noxargenta/qoj-copy-statement/issues) 提交题目链接、浏览器和脚本管理器版本及问题描述。

## 许可证

[MIT](LICENSE)
