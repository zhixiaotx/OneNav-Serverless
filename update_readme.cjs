const fs = require('fs');
let content = fs.readFileSync('README.md', 'utf8');

const addition = `
> 💡 **本地开发与 AI Studio 预览环境的专属福利（内置代理）**：
> 如果您是在本地运行 \`npm run dev\`，或在 AI Studio 中直接预览测试（尚未部署到 Cloudflare Pages），此时没有后端的 \`/api/sync\` 接口，怎么办？
> 别担心！本项目在开发环境的 \`vite.config.ts\` 中已经为您内置了 \`/api/cloudflare\` 本地跨域反向代理。
> **测试技巧**：在本地预览时，您可以毫无顾忌地在设置面板中填入 Account ID、API 令牌和 Database ID 等凭证，前端会智能地将请求发给本地代理服务器，从而**完全绕过浏览器的跨域拦截**，让您在本地就能完美顺畅地调试云端 KV 和 D1 数据库！但在最终上线部署到 Cloudflare Pages 时，请记得清空这些凭证，使用更安全的后台变量绑定方案。
`;

const searchStr = "> **正确做法**：当项目成功部署到 Cloudflare Pages 并通过后台绑定好 `ONENAV_KV` 或 `DB` 后，在网页端的前端设置面板中**完全无需填写 Account ID、Token 或 Database ID 等凭证**！系统会自动优先通过内置的 `/api/sync` 边缘接口在服务器端与 KV / D1 进行安全通信，完美解决跨域问题！";

content = content.replace(searchStr, searchStr + "\n" + addition);

fs.writeFileSync('README.md', content);
