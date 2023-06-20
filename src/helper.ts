import {SearchProjectOptions, SearchResultHit} from "@xmcl/modrinth";
import {Result} from "./mcmod";
import {CurseForgeMod} from "curseforge-api";
import {CurseForgeSearchModsOptions} from "curseforge-api/v1/Options";

export class KookCard {
  static searchModrinthCard(hits: SearchResultHit[], view: boolean, options: SearchProjectOptions, avast: string, name: string) {
    let title = 'Modrinth 模组搜索'
    if (view) title += '(结果仅有您看到)'
    let jsonObject = [{
      "type": "card",
      "size": "lg",
      "theme": "warning",
      "modules": [
        {
          "type": "header",
          "text": {
            "type": "plain-text",
            "content": title
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "image",
              "src": avast,
              "alt": "",
              "size": "lg",
              "circle": true
            },
            {
              "type": "kmarkdown",
              "content": `由 ${name} 搜索，使用关键词 ${options.query}，条件 ${options.facets}，返回数 ${hits.length}/${options.limit}`
            }
          ]
        }
      ]
    }]
    for (const project of hits) {
      const newSection = {
        "type": "section",
        "mode": "left",
        "accessory": {
          "type": "image",
          "src": project.icon_url
        },
        "text": {
          "type": "kmarkdown",
          "content": `[${project.title}](https://modrinth.com/project/${project.project_id}) | 作者 **${project.author}**\n**类别** ${project.categories} | **版本** ${project.versions[0]} ~ ${project.versions[project.versions.length-1]}\n**简介**: ${project.description}`
        }
      };
      jsonObject[0].modules.push(newSection);
    }
    return jsonObject
  }

  static searchCurseForgeCard(hits: CurseForgeMod[], view: boolean, options: CurseForgeSearchModsOptions, type: string, avast: string, name: string) {
    let title = 'CurseForge 模组搜索'
    if (view) title += '(结果仅有您看到)'
    let jsonObject = [{
      "type": "card",
      "size": "lg",
      "theme": "warning",
      "modules": [
        {
          "type": "header",
          "text": {
            "type": "plain-text",
            "content": title
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "image",
              "src": avast,
              "alt": "",
              "size": "lg",
              "circle": true
            },
            {
              "type": "kmarkdown",
              "content": `由 ${name} 搜索，使用关键词 ${options.searchFilter}, 类型: ${type} 返回数 ${hits.length}/${options.pageSize}`
            }
          ]
        }
      ]
    }]
    for (const project of hits) {
      const newSection = {
        "type": "section",
        "mode": "left",
        "accessory": {
          "type": "image",
          "src": project.logo.url
        },
        "text": {
          "type": "kmarkdown",
          "content": `[${project.name}](https://legacy.curseforge.com/projects/${project.id}) | 作者 **${project.authors[0].name}** | 下载量 **${project.downloadCount}\n**简介**: ${project.summary}`
        }
      };
      jsonObject[0].modules.push(newSection);
    }
    return jsonObject
  }

  static searchMCMODCard(hits: Result[], view: boolean, query: string, type: string, avast: string, name: string) {
    let title = 'MCMOD 模组搜索'
    if (view) title += '(结果仅有您看到)'
    let jsonObject = [{
      "type": "card",
      "size": "lg",
      "theme": "warning",
      "modules": [
        {
          "type": "header",
          "text": {
            "type": "plain-text",
            "content": title
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "image",
              "src": avast,
              "alt": "",
              "size": "lg",
              "circle": true
            },
            {
              "type": "kmarkdown",
              "content": `由 ${name} 搜索，使用关键词 ${query}, 类型 ${type}`
            }
          ]
        }
      ]
    }]
    for (const project of hits) {
      project.title = project.title.replace(/\[/g, "\\["); // 将 [ 替换为 \[
      project.title = project.title.replace(/\]/g, "\\]"); // 将 ] 替换为 \]
      const newSection = {
        "type": "section",
        "text": {
          "type": "kmarkdown",
          "content": `[${project.title}](${project.link})\n描述：${project.introduce}\n`
        }
      };
      jsonObject[0].modules.push(newSection);
    }
    return jsonObject
  }

  static UserCard(name, uuid, oldHead, newHead, skin, skinDownload) {
    return [
      {
        "type": "card",
        "size": "lg",
        "theme": "warning",
        "modules": [
          {
            "type": "section",
            "text": {
              "type": "kmarkdown",
              "content": `玩家名：**${name}**\n UUID: **${uuid}**\n 获取该玩家的头: \n 1.12 \`${oldHead}\`\n 1.13+ \`${newHead}\``
            },
            "mode": "right",
            "accessory": {
              "type": "image",
              "src": skin,
              "size": "lg"
            }
          }
        ]
      }
    ]
  }

  static HeadCard(name, oldHead, newHead, head) {
    return [
      {
        "type": "card",
        "size": "lg",
        "theme": "warning",
        "modules": [
          {
            "type": "section",
            "text": {
              "type": "kmarkdown",
              "content": `玩家名：**${name}**\n 获取该玩家的头: \n 1.12 \`${oldHead}\`\n 1.13+ \`${newHead}\``
            },
            "mode": "right",
            "accessory": {
              "type": "image",
              "src": head,
              "size": "lg"
            }
          }
        ]
      }
    ]
  }
}
