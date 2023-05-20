import {Context, h, Schema} from 'koishi'
import * as mcapi from './api'
import {ModrinthV2Client, SearchProjectOptions, SearchResult} from '@xmcl/modrinth'
import { CurseforgeV1Client, SearchOptions, Mod } from '@xmcl/curseforge'
import {closest} from 'fastest-levenshtein'
import type { } from "koishi-plugin-puppeteer"
import {scrapeWebsite} from "./mcmod";
export const name = 'minecraft'

export interface Config {
  CURSEFORGE_API_KEY: string
}

export const Config: Schema<Config> = Schema.object({
  CURSEFORGE_API_KEY: Schema.string().description("填写 CurseForge 提供的 API 用以搜索模组")
})

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh', require('./locales/zh-CN'))

  const client = new ModrinthV2Client()
  let canUseCF = false
  let cfapi
  try {
    cfapi = new CurseforgeV1Client(config.CURSEFORGE_API_KEY)
    canUseCF = true
  } catch (e) {
    console.log("未能初始化 CurseForge API，已关闭在 CurseForge 搜索模组的功能")
  }

  ctx.command('mcuser <uName:string>')
    .action(async ({session}, uName) => {

      const userInfo = await mcapi.user(uName);

      const [skin, headInfo] =
        await Promise.all([mcapi.skin(uName), mcapi.head(uName, 250)]);

      const attrs = {
        userId: session.userId,
        nickname: session.author?.nickname || session.username,
      };

      const result = h('figure');

      const baseInfo = [`用户名: ${userInfo.name} UUID: ${userInfo.id}`];

      result.children.push(h('message', attrs, baseInfo.join('\\n')));

      result.children.push(h('message', attrs, `获取该玩家的头:
      1.12: ${headInfo.gethead.old}
      1.13+: ${headInfo.gethead.new}`));

      result.children.push(h('message', attrs, `皮肤下载: ${skin.download}`));
      result.children.push(h('image', { url: skin.sideview }));

      await session.send(result);

    });

  ctx.command('mcuuid <uName:string>')
    .action(async ({session}, uName) => {
      const userInfo = await mcapi.user(uName);
      await session.send(userInfo.name + ' - ' + userInfo.id);
    });

  ctx.command('mcskin <uName:string>')
    .action(async ({session}, uName) => {
      const skin = await mcapi.skin(uName);

      await session.send(h('message', skin.download));
      await session.send(h('image', { url: skin.sideview }));
    });

  ctx.command('mchead <uName:string>')
    .action(async ({session}, uName) => {
      const headInfo = await mcapi.head(uName, 250);

      await session.send(h('message', `获取该玩家的头:
      1.12: ${headInfo.gethead.old}
      1.13+: ${headInfo.gethead.new}`));

      await session.send(h('image', { url: headInfo.helmhead }));
    });

  ctx.command('mcserver <ip:string>')
    .action(async ({session}, ip) => {
      const server = await mcapi.server(ip)
      await session.send(h.image(`https://sr-api.sfirew.com/server/${ip}/banner/motd.png`))
      await session.send(`版本 ${server.version}, 正版验证 ${server.online}, 在线玩家 ${server.players.online}`)
    })

  ctx.command('modrinth <query:string>').alias('mr')
    .option('fabric', '-a')
    .option('forge', '-f')
    .option('quilt', '-q')
    .option('type', '-t [type:string]')
    .option('version', '-v [version:string]')
    .option('limit', '-l [limit:posint]', { fallback: 5 })
    .action(async ({session, options}, query) => {
      let facets=[]
      if (options.fabric) facets.push(["[\"categories:fabric\"]"])
      if (options.forge) facets.push(["[\"categories:forge\"]"])
      if (options.quilt) facets.push(["[\"categories:quilt\"]"])
      if (options.type) facets.push(["[\"project_type:" + closest(options.type, ['mod', 'plugin', 'datapack', 'shader', 'resourcepack', 'modpack']) + "\"]"])
      if (options.version) facets.push([`versions:${options.version}`])
      const searchOptions: SearchProjectOptions = {
        query: query,
        limit: options.limit,
      };
      if (facets.length !== 0) searchOptions["facets"] = '[' + facets.toString() + ']'
      const result: SearchResult = await client.searchProjects(searchOptions);
      if (result.hits.length == 0) {
        await session.send("没找到任何匹配的内容，请尝试换一些关键词和条件吧。")
        return
      }
      const first = result.hits[0]
      await session.send(`最可能的结果：${first.title}(${first.project_id}) 作者：${first.author}
      类别：${first.categories} 支持版本：${first.versions}
      描述：${first.description}
      链接: https://modrinth.com/project/${first.project_id}`)
      if (session.platform == 'onebot') {
        const attrs = {
          userId: session.userId,
          nickname: session.author?.nickname || session.username,
        };
        const output = h('figure');
        for (const project of result.hits.slice(1)) {
          output.children.push(h('message', attrs, `${project.title}(${project.project_id}) | 作者：${project.author}
          类别：${project.categories} | 支持版本：${project.versions}
          描述：${project.description}
          链接: https://modrinth.com/project/${first.project_id}`))
        }
        await session.send(output)
      }
    })

  ctx.command('curseforge <query:string>').alias('cf')
    .option('type', '-t [type:string]', {fallback: 'mod'})
    .option('size', '-s [limit:posint]', { fallback: 5 })
    .action(async ({session, options}, query) => {
      if (!canUseCF) {
        await session.send("CurseForge API 不可用")
        return
      }
      let type = closest(options.type, ['mod', 'resourcepack', 'shaderpack'])
      let category = 6;
      switch (type) {
        case 'resourcepack': category = 12
        case 'shaderpack': category = 17
      }
      const searchOptions: SearchOptions = {
        categoryId: category,
        searchFilter: query,
        pageSize: options.size,
      };
      const result = await cfapi.searchMods(searchOptions)
      const mods: Mod[] = result.data
      if (mods.length == 0) {
        await session.send("没找到任何匹配的内容，请尝试换一些关键词和条件吧。")
        return
      }
      const first = mods[0]
      await session.send(`最可能的结果：${first.name}(${first.slug}) 一作：${first.authors[0].name}
      描述：${first.summary}
      链接: ${first.url}`)

      if (session.platform == 'onebot') {
        const attrs = {
          userId: session.userId,
          nickname: session.author?.nickname || session.username,
        };
        const output = h('figure');
        for (const project of mods.slice(1)) {
          output.children.push(h('message', attrs, `${project.name}(${project.slug}) 一作：${project.authors[0].name}
      描述：${project.summary}
      链接: ${project.url}`))
        }
        await session.send(output)
      }
    })

  ctx.command('mcmod <query:string>').alias('mod')
    .option('type', '-t [type:string]')
    .action(async ({session, options}, query) => {
      let search = `https://search.mcmod.cn/s?key=${query}`
      if (options.type) {
        const types = ['mod', 'modpack', 'item', 'post', 'author', 'user', 'bbs']
        let type = closest(options.type, types)
        const indexPlusOne = findIndexPlusOne(types, type);
        search += `&filter=${indexPlusOne}`
      }
      let result = await scrapeWebsite(search)
      if (result.length == 0) {
        await session.send("没找到任何匹配的内容，请尝试换一些关键词和条件吧。")
        return
      }
      const first = result[0]
      await session.send(`最可能的结果：${first.title}
      描述：${first.introduce}
      链接: ${first.link}`)

      if (session.platform == 'onebot') {
        const attrs = {
          userId: session.userId,
          nickname: session.author?.nickname || session.username,
        };
        const output = h('figure');
        for (const project of result.slice(1)) {
          output.children.push(h('message', attrs, `最可能的结果：${project.title}}
          描述：${project.introduce}
          链接: ${project.link}`))
        }
        await session.send(output)
      }
    })

  function findIndexPlusOne(arr: any[], value: any): number {
    const index = arr.findIndex((item) => item === value);
    return index !== -1 ? index + 1 : -1;
  }
}
