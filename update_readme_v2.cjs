const fs = require('fs');
let content = fs.readFileSync('README.md', 'utf8');

const searchStr = "> **正确做法**：当项目成功部署到 Cloudflare Pages 并通过后台绑定好 `ONENAV_KV` 或 `DB` 后，在网页端的前端设置面板中**完全无需填写 Account ID、Token 或 Database ID 等凭证**！系统会自动优先通过内置的 `/api/sync` 边缘接口在服务器端与 KV / D1 进行安全通信，完美解决跨域问题！";

const replacementStr = "> 🎯 **零配置直连（官方推荐的最优解）**：\n> **Cloudflare KV 或者 Cloudflare D1 直接在 https://dash.cloudflare.com 部署项目中绑定 KV 空间或者 D1 数据库，完全无需在网页端设置中填写任何凭证**！\n> 系统会自动优先通过内置的 `/api/sync` 边缘接口在服务器端与 KV / D1 进行安全的内部通信，彻底告别浏览器跨域拦截，既安全又省心！";

content = content.replace(searchStr, replacementStr);

fs.writeFileSync('README.md', content);
