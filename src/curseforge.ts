import { Context, h } from "koishi";
import { CurseforgeV1Client, Mod, SearchOptions } from "@xmcl/curseforge";
import { closest } from "fastest-levenshtein";

export interface Config {
  CURSEFORGE_API_KEY: string;
}

export default function apply(ctx: Context, config: Config) {
  const cfapi = new CurseforgeV1Client(config.CURSEFORGE_API_KEY);
  ctx?.logger.info("检测到填入 API key，启用 CurseForge 指令。");

  const possibleFilter = {
    modpacks: 4471,
    "texture-packs": 12,
    worlds: 17,
    customization: 4546,
    mods: 6,
  };

  ctx
    .command("curseforge <query:string>")
    .alias("cf")
    .option("type", "-t [type:string]", { fallback: "mod" })
    .option("limits", "-l [limit:posint]", { fallback: 5 })
    .option("silent", "-s", { fallback: false })
    .action(async ({ session, options }, query) => {
      const searchOptions: SearchOptions = {
        searchFilter: query,
        pageSize: options.limits,
      };

      if (options.type) {
        options.type = closest(options.type, Object.keys(possibleFilter));
        searchOptions.classId = possibleFilter[options.type];
      }

      const result = await cfapi.searchMods(searchOptions);
      const mods = result.data;
      if (mods.length == 0) {
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
          searchCurseForgeCard(
            mods,
            options.silent,
            searchOptions,
            options.type,
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

      const first = mods[0];
      await session.send(`最可能的结果：${first.name}(${first.slug}) 一作：${first.authors[0].name} 下载量：${first.downloadCount}
      描述：${first.summary}
      链接: https://legacy.curseforge.com/projects/${first.id}`);

      if (session.platform == "onebot" || "red") {
        const attrs = {
          userId: session.userId,
          nickname: session.author?.nick || session.username,
        };
        const output = h("figure");
        for (const project of mods.slice(1)) {
          output.children.push(
            h(
              "message",
              attrs,
              `${project.name}(${project.slug}) 一作：${project.authors[0].name} 下载量：${project.downloadCount}
          描述：${project.summary}
          链接: https://legacy.curseforge.com/projects/${project.id}`,
            ),
          );
        }
        await session.send(output);
      }
    });
}

function searchCurseForgeCard(
  hits: Mod[],
  view: boolean,
  options: SearchOptions,
  type: string,
  avast: string,
  name: string,
) {
  let title = "CurseForge 模组搜索";
  if (view) title += "(结果仅有您看到)";
  let jsonObject = [
    {
      type: "card",
      size: "lg",
      theme: "warning",
      modules: [
        {
          type: "header",
          text: {
            type: "plain-text",
            content: title,
          },
        },
        {
          type: "context",
          elements: [
            ...(avast.includes("avatars")
              ? [
                  {
                    type: "image",
                    src: avast,
                    alt: "",
                    size: "lg",
                    circle: true,
                  },
                ]
              : []),
            {
              type: "kmarkdown",
              content: `由 ${name} 搜索，使用关键词 ${options.searchFilter}, 类型: ${type} 返回数 ${hits.length}/${options.pageSize}`,
            },
          ],
        },
      ],
    },
  ];
  for (const project of hits) {
    project.name = project.name.replace(/\[/g, "\\["); // 将 [ 替换为 \[
    project.name = project.name.replace(/\]/g, "\\]"); // 将 ] 替换为 \]
    const newSection = {
      type: "section",
      // Kook 访问不了 CurseForge 的 media.forgecdn.net
      // mode: 'left',
      // accessory: {
      //   type: 'image',
      //   src: project.logo.url,
      // },
      text: {
        type: "kmarkdown",
        content: `[${project.name}](https://legacy.curseforge.com/projects/${project.id}) | 作者 **${project.authors[0].name}** | 下载量 **${project.downloadCount}**\n **简介**: ${project.summary}`,
      },
    };
    jsonObject[0].modules.push(newSection);
  }
  return jsonObject;
}
