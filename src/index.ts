import { Context, h, Schema } from "koishi";
import MCAPI from "./api";
import {
  ModrinthV2Client,
  SearchProjectOptions,
  SearchResult,
} from "@xmcl/modrinth";
import { closest } from "fastest-levenshtein";
import { scrapeWebsite } from "./mcmod";
import { KookCard } from "./helper";
import { MCUser } from "./api";
import CURSEFORGE, { Config as CURSEFORGE_CONFIG } from "./curseforge";
import SERVER, { Config as SERVER_CONFIG } from "./server_ping";
import type {} from "@koishijs/plugin-adapter-kook";
import type {} from "@koishijs/plugin-notifier";

export const name = "minecraft";

export interface Config {
  CURSEFORGE_API_KEY: string;
  SERVER: SERVER_CONFIG & IPluginEnableConfig;
}

export const Config: Schema<Config> = Schema.intersect([
  CURSEFORGE_CONFIG,
  Schema.object({
    SERVER:
      pluginLoad(SERVER_CONFIG).description("是否启用服务器查询相关功能。"),
  }).description("服务器查询相关"),
]);

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define("zh", require("./locales/zh-CN"));

  const modrinthV2Client = new ModrinthV2Client();
  const mcModtypes = [
    "mod",
    "modpack",
    "item",
    "post",
    "author",
    "user",
    "bbs",
  ];

  const mcapi = new MCAPI(ctx.http);
  if (config.CURSEFORGE_API_KEY) {
    ctx.plugin(CURSEFORGE, { CURSEFORGE_API_KEY: config.CURSEFORGE_API_KEY });
  }

  if (config.SERVER.enabled) {
    if (ctx.puppeteer !== undefined) {
      ctx.inject(["puppeteer"], (ctx) => ctx.plugin(SERVER, config.SERVER));
    } else {
      ctx.notifier.create(
        "请打开 Puppetter 以支持服务器查询，如果你需要不依赖本地渲染而是用 API 的方案请降级到 0.8.2。",
      );
    }
  }

  ctx.command("mcuser <uName:string>").action(async ({ session }, uName) => {
    let userInfo: MCUser;
    try {
      userInfo = await mcapi.getUser(uName);
    } catch (e) {
      return e;
    }
    const view = mcapi.renderView(userInfo);

    if (session.platform == "kook") {
      await session.kook.createMessage({
        content: JSON.stringify(
          KookCard.UserCard(
            userInfo.name,
            userInfo.id,
            view.gethead.old,
            view.gethead.new,
            view.skinView,
          ),
        ),
        target_id: session.channelId,
        type: 10,
        quote: session.messageId,
      });
      return;
    }

    const attrs = {
      userId: session.userId,
      nickname: session.author?.nickname || session.username,
    };

    const result = h("figure");

    const baseInfo = [`用户名: ${userInfo.name} UUID: ${userInfo.id}`];

    result.children.push(h("message", attrs, baseInfo.join("\\n")));

    result.children.push(
      h(
        "message",
        attrs,
        `获取该玩家的头:
      1.12: ${view.gethead.old}
      1.13+: ${view.gethead.new}`,
      ),
    );

    result.children.push(h("message", attrs, `皮肤下载: ${view.download}`));
    result.children.push(h("image", { url: view.skinView }));

    await session.send(result);
  });

  ctx.command("mcuuid <uName:string>").action(async ({ session }, uName) => {
    let userInfo: MCUser;
    try {
      userInfo = await mcapi.getUser(uName);
    } catch (e) {
      return e;
    }
    await session.send(userInfo.name + " - " + userInfo.id);
  });

  ctx.command("mcskin <uName:string>").action(async ({ session }, uName) => {
    let userInfo: MCUser;
    try {
      userInfo = await mcapi.getUser(uName);
    } catch (e) {
      return e;
    }
    const view = mcapi.renderView(userInfo);

    return `<image url="${view.skinView}"/> ${view.download}`;
  });

  ctx.command("mchead <uName:string>").action(async ({ session }, uName) => {
    let userInfo: MCUser;
    try {
      userInfo = await mcapi.getUser(uName);
    } catch (e) {
      return e;
    }
    const view = mcapi.renderView(userInfo);
    if (session.platform == "kook") {
      await session.kook.createMessage({
        content: JSON.stringify(
          KookCard.HeadCard(
            uName,
            view.gethead.old,
            view.gethead.new,
            view.headView,
          ),
        ),
        target_id: session.channelId,
        type: 10,
        quote: session.messageId,
      });
      return;
    }
    return `<image url="${view.headView}"/>
      获取该玩家的头:
      1.12: ${view.gethead.old}
      1.13+: ${view.gethead.new}`;
  });

  ctx
    .command("modrinth <query:string>")
    .alias("mr")
    .option("fabric", "-a")
    .option("forge", "-f")
    .option("quilt", "-q")
    .option("silent", "-s", { fallback: false })
    .option("type", "-t [type:string]")
    .option("version", "-v [version:string]")
    .option("limit", "-l [limit:posint]", { fallback: 5 })
    .action(async ({ session, options }, query) => {
      let facets = [];
      if (options.fabric) facets.push(['["categories:fabric"]']);
      if (options.forge) facets.push(['["categories:forge"]']);
      if (options.quilt) facets.push(['["categories:quilt"]']);
      if (options.type)
        facets.push([
          '["project_type:' +
            closest(options.type, [
              "mod",
              "plugin",
              "datapack",
              "shader",
              "resourcepack",
              "modpack",
            ]) +
            '"]',
        ]);
      if (options.version) facets.push([`versions:${options.version}`]);
      const searchOptions: SearchProjectOptions = {
        query: query,
        limit: options.limit,
      };
      if (facets.length !== 0)
        searchOptions["facets"] = "[" + facets.toString() + "]";
      const result: SearchResult =
        await modrinthV2Client.searchProjects(searchOptions);
      if (result.hits.length == 0) {
        await session.send(
          "没找到任何匹配的内容，请尝试换一些关键词和条件吧。",
        );
        return;
      }

      if (session.platform == "kook") {
        const user = await session.kook.getUserView({
          user_id: session.userId,
        });
        const content = JSON.stringify(
          KookCard.searchModrinthCard(
            result.hits,
            options.silent,
            searchOptions,
            user.avatar,
            user.username,
          ),
        );
        const parse = {
          content: content,
          target_id: session.channelId,
          type: 10,
          quote: session.messageId,
        };
        if (options.silent) parse["temp_target_id"] = session.userId;
        await session.kook.createMessage(parse);
        return;
      }

      const first = result.hits[0];
      await session.send(`最可能的结果：${first.title}(${first.project_id}) 作者：${first.author}
        类别：${first.categories} 支持版本：${first.versions}
        描述：${first.description}
        链接: https://modrinth.com/project/${first.project_id}`);
      if (session.platform == "onebot" || "red") {
        const attrs = {
          userId: session.userId,
          nickname: session.author?.nickname || session.username,
        };
        const output = h("figure");
        for (const project of result.hits.slice(1)) {
          output.children.push(
            h(
              "message",
              attrs,
              `${project.title}(${project.project_id}) | 作者：${project.author}
          类别：${project.categories} | 支持版本：${project.versions}
          描述：${project.description}
          链接: https://modrinth.com/project/${project.project_id}`,
            ),
          );
        }
        await session.send(output);
      }
    });

  ctx
    .command("mcmod <query:string>")
    .alias("mod")
    .option("type", "-t [type:string]")
    .option("silent", "-s", { fallback: false })
    .option("limit", "-l [limit:posint]", { fallback: 5 })
    .action(async ({ session, options }, query) => {
      let search = `https://search.mcmod.cn/s?key=${query}`;
      let type = "all";
      if (options.type) {
        type = closest(options.type, mcModtypes);
        const indexPlusOne = findIndexPlusOne(mcModtypes, type);
        search += `&filter=${indexPlusOne}`;
      }
      let result = await scrapeWebsite(search, options.limit);
      if (result.length == 0) {
        await session.send(
          "没找到任何匹配的内容，请尝试换一些关键词和条件吧。",
        );
        return;
      }

      if (session.platform == "kook") {
        const user = await session.kook.getUserView({
          user_id: session.userId,
        });
        const content = JSON.stringify(
          KookCard.searchMCMODCard(
            result,
            options.silent,
            query,
            type,
            user.avatar,
            user.username,
          ),
        );
        const parse = {
          content: content,
          target_id: session.channelId,
          type: 10,
          quote: session.messageId,
        };
        if (options.silent) parse["temp_target_id"] = session.userId;
        await session.kook.createMessage(parse);
        return;
      }

      const first = result[0];
      await session.send(`最可能的结果：${first.title}
      描述：${first.introduce}
      链接: ${first.link}`);

      if (session.platform == "onebot" || "red") {
        const attrs = {
          userId: session.userId,
          nickname: session.author?.nickname || session.username,
        };
        const output = h("figure");
        for (const project of result.slice(1)) {
          output.children.push(
            h(
              "message",
              attrs,
              `${project.title}
          描述：${project.introduce}
          链接: ${project.link}`,
            ),
          );
        }
        await session.send(output);
      }
    });

  function findIndexPlusOne(arr: any[], value: any): number {
    const index = arr.findIndex((item) => item === value);
    return index !== -1 ? index + 1 : -1;
  }
}

// Thank you! Kbot!
// https://github.com/Kabuda-czh/koishi-plugin-kbot/blob/master/plugins/kbot/src/index.ts#L116
function pluginLoad<T>(schema: Schema<T>): Schema<T & IPluginEnableConfig> {
  return Schema.intersect([
    Schema.object({
      enabled: Schema.boolean().default(false).description("是否启用插件"),
    }),
    Schema.union([
      Schema.object({
        enabled: Schema.const(true).required(),
        ...schema.dict,
      }),
      Schema.object({
        enabled: Schema.const(false),
      }),
    ]) as Schema<T>,
  ]);
}
interface IPluginEnableConfig {
  enabled: boolean;
}
