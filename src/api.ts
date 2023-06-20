const
  servers = "https://sr-api.sfirew.com/server",
  render = "https://visage.surgeplay.com",
  mojang = "https://api.mojang.com";

export interface MCUser {id: string, name: string}
export async function getUser(username: string) : Promise<MCUser> {
  if (!username) throw new TypeError(`No Username or UUID Provided!`)
  return await fetch(
        `${mojang}/users/profiles/minecraft/${username}`
      ).then((res) => res.json()).catch(e => {})
}

export function renderView(user: MCUser) {
  return {
    skinBust: `${render}/bust/${user.id}`,
    skinView: `${render}/full/${user.id}`,
    download: `${render}/processedskin/${user.id}`,
    headView: `${render}/head/${user.id}`,
    headFace: `${render}/face/${user.id}`,
    gethead: {
      "new": `/give @p minecraft:player_head{SkullOwner:"${user.name}"}`,
      "old": `/give @p minecraft:skull 1 3 {SkullOwner:"${user.name}"}`
    }
  };
}

export async function getServer(ip: string) : Promise<ServerInfo & { banner: string }> {
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(:[0-9]{1,5})?$/
  if (!domainRegex.test(ip)) new TypeError(`No Ip Provided!`)
  const data = await fetch(`${servers}/${ip}`)
  const body = await data.json()
  return {
    banner: `${servers}/${ip}/banner/motd.png`,
    ...body
  }
}

interface ServerInfo {
  ip: string;
  port: number;
  online: boolean;
  isp: {
    name: string;
    city: string;
    location: string;
    distance: string;
  };
  hostname: string;
  query_place: string;
  query_host_id: string;
  icon: string;
  raw: string;
  html: string;
  info: {
    raw: any[];
    html: string;
  };
  players: {
    max: number;
    online: number;
    sample: any[];
  };
  version: {
    name: string;
    protocol: number;
  };
  ping: number;
}
