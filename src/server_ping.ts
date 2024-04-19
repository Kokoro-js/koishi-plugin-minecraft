import { Context, h, Logger, Schema } from "koishi";
import server from "@ahdg/minecraftstatuspinger";
import { JSONToHTML } from "@sfirew/minecraft-motd-parser";
import type {} from "koishi-plugin-puppeteer";
import { motdJsonType } from "@sfirew/minecraft-motd-parser/types/types";

export const name = "minecraft-server";
export interface Config {
  DEFAULT_SERVER: string;
  JUMP_SRV: boolean;
}

export const Config: Schema<Config> = Schema.object({
  DEFAULT_SERVER: Schema.string()
    .description("当查询服务器的地址缺失时，自动查询的地址。")
    .default("mc.xxx.example"),
  JUMP_SRV: Schema.boolean().default(false).description("是否忽略 SRV 解析。"),
});

export default function apply(ctx: Context, config: Config) {
  const logger = ctx?.logger(name) || new Logger(name);
  ctx
    .command("mcserver <ip:string> [port:number]")
    .action(async ({ session }, ip, port) => {
      if (!ip) ip = config.DEFAULT_SERVER;
      let result;
      try {
        result = await server.lookup({
          host: ip,
          timeout: 5000,
          port: port || 25565,
          disableSRV: config.JUMP_SRV,
          // disableJSONParse: true,
        });
      } catch (e) {
        logger.error(e);
        return `解析遇到错误 ${e.message}`;
      }
      const status: Status = result.status as any;
      const t = JSONToHTML(status.description);
      return ctx.puppeteer.render(
        generateFullHtml(`IP: ${ip}`, t, status, `${result.latency} ms`),
      );
    });
}

interface Status {
  description: motdJsonType;
  players: { max: number; online: number };
  version: { name: string; protocol: number };
  favicon: string;
}

function generateFullHtml(
  serverName: string,
  motdHTML: string,
  status: Status,
  latency: string,
) {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>Server Banner</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 708px;
      height: auto;
      background-color: #333; /* Set the background color to match the server banner */
    }
    .server-banner {
      display: flex; /* 使用flexbox进行布局 */
      align-items: center; /* 垂直居中对齐条目 */
      justify-content: start; /* 水平开始位置对齐内容 */
      background-color: #333; /* 深色背景 */
      color: white;
      font-family: 'Arial', sans-serif;
      padding: 10px;
      margin: auto; /* 横幅居中 */
      width: 708px; /* 根据字符限制估计的宽度 */
      height: auto; /* 高度自动调整 */
      box-sizing: border-box; /* 边框和内边距包含在宽度内 */
    }
    .server-icon {
      width: 64px; /* Adjust as necessary */
      height: 64px; /* Adjust as necessary */
      margin-right: 20px; /* Space between icon and text */
    }
    .server-text {
      display: flex;
      flex-direction: column; /* Stack info vertically */
      justify-content: space-between; /* Evenly space the content */
    }
    .server-name-and-count {
      display: flex;
      justify-content: space-between; /* Space between name and count */
      width: 100%;
      align-items: center;
    }
    .server-motd {
      text-align: center;
      width: 100%;
    }
    .server-name, .player-count {
      white-space: nowrap; /* Keep the text in a single line */
    }
  </style>
</head>
<body>

<div class="server-banner">
  <img src="${status.favicon}" alt="Server Icon" class="server-icon">
  <div class="server-info">
    <div class="server-name">${serverName} - ${status.players.online}/${status.players.max} | Ping: ${latency} | 类型: ${status.version.name}</div>
    <div class="server-motd">
      ${motdHTML}
    </div>
  </div>
</div>

</body>
</html>
`;
}
