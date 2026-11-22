// ==UserScript==
// @name         QOJ 一键复制题面（含公式和样例）
// @namespace    https://github.com/noxargenta/qoj-copy-statement
// @version      1.0.0
// @author       noxargenta
// @homepageURL  https://github.com/noxargenta/qoj-copy-statement
// @supportURL   https://github.com/noxargenta/qoj-copy-statement/issues
// @description  将当前语言的 QOJ 题面复制为 Markdown，保留 LaTeX 公式、输入输出格式、样例、表格及图片链接。
// @match        https://qoj.ac/problem/*
// @match        https://qoj.ac/contest/*/problem/*
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(() => {
    'use strict';
    const BUTTON_ID = 'qoj-copy-statement-button';
    const RAW = 'data-qoj-copy-raw';

    function statement() {
        return document.querySelector('#tab-statement article.uoj-article')
            || document.querySelector('#tab-statement .uoj-article')
            || document.querySelector('article.uoj-article');
    }

    function absolute(url) {
        try { return new URL(url, location.href).href; }
        catch { return url; }
    }

    function rawNode(text) {
        const span = document.createElement('span');
        span.setAttribute(RAW, '');
        span.textContent = text;
        return span;
    }

    function math(tex, display) {
        return display ? `\n\n$$\n${tex.trim()}\n$$\n\n` : `$${tex.trim()}$`;
    }

    function prepare(source) {
        // 只修改克隆：MathJax 的 SVG、辅助 MathML、预览和源码不能重复输出。
        const root = source.cloneNode(true);
        root.querySelectorAll('script[type^="math/tex"]').forEach(el => {
            el.replaceWith(rawNode(math(el.textContent, /mode\s*=\s*display/i.test(el.type))));
        });
        // 兼容使用 KaTeX 的题面；从 annotation 读取原始 TeX。
        root.querySelectorAll('.katex-display, .katex').forEach(el => {
            if (!root.contains(el)) return;
            const tex = el.querySelector('annotation[encoding="application/x-tex"]');
            if (tex) el.replaceWith(rawNode(math(tex.textContent, el.classList.contains('katex-display'))));
        });
        root.querySelectorAll('.MathJax_Preview, .MathJax, .MathJax_Display, .MathJax_SVG, .MathJax_SVG_Display, .MathJax_CHTML, .MJX_Assistive_MathML, .MathJax_Processing, .MathJax_Processed, script, style, button, .qoj-copy-tools').forEach(el => el.remove());
        return root;
    }

    function escapeText(text) {
        return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')
            .replace(/([\\`*_[\]<>])/g, '\\$1');
    }

    function fence(text, language = '') {
        const runs = text.match(/`+/g) || [];
        const marker = '`'.repeat(Math.max(3, ...runs.map(s => s.length + 1)));
        return `\n\n${marker}${language}\n${text}${text.endsWith('\n') ? '' : '\n'}${marker}\n\n`;
    }

    function render(node) {
        if (node.nodeType === 3) return escapeText(node.nodeValue);
        if (node.nodeType !== 1) return '';
        if (node.hasAttribute(RAW)) return node.textContent;
        const tag = node.tagName.toLowerCase();
        const children = () => [...node.childNodes].map(render).join('');
        if (tag === 'pre') {
            const code = node.querySelector('code');
            const lang = code?.className.match(/language-([\w+-]+)/)?.[1] || 'text';
            return fence(node.textContent.replace(/\r\n?/g, '\n'), lang);
        }
        if (tag === 'code') {
            const text = node.textContent;
            const marker = '`'.repeat(Math.max(1, ...(text.match(/`+/g) || []).map(s => s.length + 1)));
            const pad = /^[ `]|[ `]$/.test(text) ? ' ' : '';
            return `${marker}${pad}${text}${pad}${marker}`;
        }
        if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${children().trim()}\n\n`;
        if (tag === 'br') return '  \n';
        if (tag === 'hr') return '\n\n---\n\n';
        if (tag === 'img') {
            const src = node.getAttribute('src');
            return src ? `![${(node.getAttribute('alt') || '图片').replace(/[\[\]]/g, '')}](<${absolute(src)}>)` : '';
        }
        if (tag === 'a') {
            const href = node.getAttribute('href');
            return href ? `[${children().trim()}](<${absolute(href)}>)` : children();
        }
        if (tag === 'strong' || tag === 'b') return `**${children()}**`;
        if (tag === 'em' || tag === 'i') return `*${children()}*`;
        if (tag === 'sub' || tag === 'sup') return `<${tag}>${children()}</${tag}>`;
        if (tag === 'ul' || tag === 'ol') {
            const start = Number(node.getAttribute('start')) || 1;
            return '\n\n' + [...node.children].filter(el => el.tagName === 'LI').map((el, i) => {
                const marker = tag === 'ol' ? `${start + i}. ` : '- ';
                return marker + render(el).trim().replace(/\n/g, '\n' + ' '.repeat(marker.length));
            }).join('\n') + '\n\n';
        }
        if (tag === 'table') {
            // 带合并单元格的表格保留 HTML，避免丢失行列关系。
            if (node.querySelector('[rowspan], [colspan]')) {
                const table = node.cloneNode(true);
                table.querySelectorAll(`[${RAW}]`).forEach(el => el.replaceWith(document.createTextNode(el.textContent)));
                return '\n\n' + table.outerHTML + '\n\n';
            }
            const rows = [...node.rows].map(row => [...row.cells].map(cell => render(cell).trim()
                .replace(/\r?\n/g, '<br>').replace(/\|/g, '&#124;')));
            if (!rows.length) return '';
            const width = Math.max(...rows.map(row => row.length));
            const line = row => '| ' + Array.from({ length: width }, (_, i) => row[i] || '').join(' | ') + ' |';
            return '\n\n' + [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n') + '\n\n';
        }
        if (tag === 'blockquote') return '\n\n' + children().trim().split('\n').map(s => '> ' + s).join('\n') + '\n\n';
        const content = children();
        return /^(p|div|section|article|figure|figcaption|details|summary)$/.test(tag)
            ? '\n\n' + content.trim() + '\n\n' : content;
    }

    function buildMarkdown(source) {
        const root = prepare(source);
        // 先将代码块替换为占位符，清理段落空白时不改变样例中的空格和空行。
        const blocks = [];
        root.querySelectorAll('pre').forEach(el => {
            const key = `QOJCOPYBLOCK${blocks.length}END`;
            blocks.push(render(el));
            el.replaceWith(rawNode(`\n\n${key}\n\n`));
        });
        const title = document.querySelector('h1.text-center')?.textContent.trim().replace(/\s+/g, ' ')
            || document.title.replace(/\s*-\s*Problem\s*-\s*QOJ\.ac.*$/i, '').trim();
        let body = render(root).replace(/\n[ \t]+\n/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim();
        body = body.replace(/QOJCOPYBLOCK(\d+)END/g, (_, i) => blocks[Number(i)].trim());
        const url = new URL(location.href);
        url.search = ''; url.hash = '';
        return `# ${escapeText(title)}\n\n来源：${url.href}\n\n${body}\n`;
    }

    async function writeClipboard(text) {
        if (typeof GM_setClipboard === 'function') {
            await new Promise((resolve, reject) => {
                try { GM_setClipboard(text, 'text', resolve); }
                catch (err) { reject(err); }
            });
            return;
        }
        if (navigator.clipboard?.writeText) {
            try { await navigator.clipboard.writeText(text); return; } catch { /* 继续兼容复制 */ }
        }
        const area = document.createElement('textarea');
        area.value = text;
        area.style.cssText = 'position:fixed;left:-9999px;top:0;';
        document.body.append(area);
        const previous = document.activeElement;
        area.select();
        try {
            if (!document.execCommand('copy')) throw new Error('浏览器拒绝访问剪贴板，请检查油猴权限。');
        } finally { area.remove(); previous?.focus(); }
    }

    let busy = false;
    async function copy() {
        if (busy) return;
        const button = document.getElementById(BUTTON_ID);
        busy = true;
        if (button) { button.disabled = true; button.textContent = '正在复制…'; }
        try {
            const source = statement();
            if (!source || !source.textContent.trim()) throw new Error('没有找到题面，请等待页面加载完成并打开 Statement。');
            const text = buildMarkdown(source);
            await writeClipboard(text);
            if (button) button.textContent = '✓ 已复制题面';
        } catch (err) {
            console.error('[QOJ 复制题面]', err);
            if (button) button.textContent = '复制失败';
            window.alert(`QOJ 复制题面：${err.message || err}`);
        } finally {
            busy = false;
            if (button) {
                button.disabled = false;
                setTimeout(() => { button.textContent = '复制题面（含公式）'; }, 2200);
            }
        }
    }

    function mount() {
        if (!statement() || document.getElementById(BUTTON_ID)) return;
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        button.textContent = '复制题面（含公式）';
        button.title = '复制当前语言的完整题面为 Markdown（公式保留为 LaTeX）';
        button.style.cssText = 'position:fixed;right:20px;bottom:24px;z-index:10000;padding:10px 16px;border:0;border-radius:8px;background:#1677ff;color:#fff;box-shadow:0 2px 10px #0003;cursor:pointer;font-size:14px;';
        button.addEventListener('click', copy);
        document.body.append(button);
    }

    if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('复制当前题面（Markdown + LaTeX）', copy);
    mount();
    // 兼容语言切换和延迟加载；观察节点增删即可，无需监听公式内部的每一次属性变化。
    let scheduled = false;
    new MutationObserver(() => {
        if (scheduled || document.getElementById(BUTTON_ID)) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; mount(); });
    }).observe(document.body, { childList: true, subtree: true });
})();
