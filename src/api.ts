const
  serverimg = "https://eu.mc-api.net/v3/server/favicon",
  servers = "https://api.mcsrvstat.us/2",
  heads = "https://cravatar.eu",
  skinurl = "https://minotar.net",
  url = "https://api.mojang.com",
  sideviewurl = "https://crafatar.com"

export async function user(username) : Promise<{id: string, name: string}> {
    try {
      if (!username) throw new TypeError(`No Username Provided!`)
      const data = await fetch(
        `${url}/users/profiles/minecraft/${username}`
      ).then((res) => res.json()).catch(e => {});
      return data;
    } catch (e) {}
  }

export async function skin(username) {
    try {
      if (!username) throw new TypeError(`No Username Provided!`)
      const body = await fetch(
        `${url}/users/profiles/minecraft/${username}`
      ).then((res) => res.json()).catch(e => {});
      const data = {
        view: `${skinurl}/skin/${username}`,
        download: `${skinurl}/download/${username}`,
        sideview: `${sideviewurl}/renders/body/${body.id}`
      }
      return data;
    } catch (e) {}
  }


export async function head(username, size) {
    try {
      if (!username) throw new TypeError(`No Username Provided!`)
      if (!size) size = 190;

      const data = {
        helmhead: `${heads}/helmhead/${username}/${size}.png`,
        helmavatar: `${heads}/helmavatar/${username}/${size}.png`,
        headsize: size,
        headowner: username,
        gethead: {
          "new": `/give @p minecraft:player_head{SkullOwner:"${username}"}`,
          "old": `/give @p minecraft:skull 1 3 {SkullOwner:"${username}"}`
        }
      }
      return data;
    } catch (e) {}
  }

export async function server(ip) {
    try {
      if (!ip) throw new TypeError(`No Server IP Was Provided!`)

      const data = await fetch(
        `${servers}/${ip}`
      ).then((res) => res.json()).catch(e => {});
      let filtered = {
        "servericon": `${serverimg}/${ip.toLowerCase()}`,
        "ip": data.ip,
        "port": data.port,
        "debug": {
          "ping": data.debug.ping,
          "query": data.debug.query,
          "srv": data.debug.srv,
          "querymismatch": data.debug.querymismatch,
          "ipinsrv": data.debug.ipinsrv,
          "cnameinsrv": data.debug.cnameinsrv,
          "animatedmotd": data.debug.animatedmotd,
          "cachetime": data.debug.cachetime,
          "apiversion": data.debug.apiversion
        },
        "motd": {
          "raw": data.motd.raw,
          "clean": data.motd.clean,
          "html": data.motd.html
        },
        "players": {
          "online": data.players.online,
          "max": data.players.max
        },
        "version": data.version,
        "online": data.online,
        "protocol": data.protocol,
        "hostname": data.hostname,
      }
      return filtered;
    } catch (e) {}
}
